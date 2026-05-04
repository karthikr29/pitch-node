"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff, RefreshCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SentientPrismVisualizer } from "@/components/ui/sentient-prism-visualizer";
import {
  bytesToBase64,
  probeMicEnergy,
  recordPcm16,
} from "@/lib/voice/pcm-recorder";
import { VOICE_GETUSERMEDIA_CONSTRAINTS } from "@/lib/voice/audio-constraints";

const CALIBRATION_PROMPT =
  "Hi, this is me, calibrating my voice for this practice call.";
const RECORDING_MS = 4000;
const PREFLIGHT_MS = 500;
const MAX_RETRIES = 2;

const PREFLIGHT_DEAD_MIC_RMS = 0.0005;

type FailureCode =
  | "DEAD_MIC"
  | "SILENT"
  | "TOO_SHORT"
  | "TOO_LOUD"
  | "TOO_NOISY"
  | "EMBEDDING_FAILED"
  | "NETWORK_ERROR";

type State =
  | { kind: "idle" }
  | { kind: "preflight" }
  | { kind: "preflight_failed"; code: "DEAD_MIC" }
  | { kind: "recording"; secondsLeft: number }
  | { kind: "processing" }
  | { kind: "failed"; code: FailureCode; retriesLeft: number }
  | { kind: "skip_offer" }
  | { kind: "done" };

interface VoiceCalibrationCardProps {
  /** Called with the base64 voiceprint on success, or null when the user opts to skip. */
  onCalibrated: (voiceprintB64: string | null) => void;
  /** Called when the user cancels and doesn't want to start the call. */
  onCancel: () => void;
}

const FAILURE_MESSAGES: Record<FailureCode, { title: string; body: string }> = {
  DEAD_MIC: {
    title: "We couldn't detect your microphone.",
    body: "Make sure it's plugged in and unmuted, then try again.",
  },
  SILENT: {
    title: "We didn't hear anything.",
    body: "Move closer to your mic and make sure it's unmuted.",
  },
  TOO_SHORT: {
    title: "We need a longer sample.",
    body: "Try saying the full sentence at a normal pace.",
  },
  TOO_LOUD: {
    title: "Too loud.",
    body: "Try moving back a few inches from your mic.",
  },
  TOO_NOISY: {
    title: "Too noisy.",
    body: "Try somewhere quieter — your AI partner needs to recognise your voice.",
  },
  EMBEDDING_FAILED: {
    title: "We couldn't process your voice sample.",
    body: "Please try again.",
  },
  NETWORK_ERROR: {
    title: "Couldn't reach the voice service.",
    body: "Check your connection and try again.",
  },
};

export function VoiceCalibrationCard({
  onCalibrated,
  onCancel,
}: VoiceCalibrationCardProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const retriesRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  // Generation counter. Each `startRun` bumps it and captures the current id;
  // any in-flight run whose id no longer matches is "stale" and bails. This
  // pattern is robust under React Strict Mode's mount → cleanup → remount
  // (a shared cancel flag would either block the remount entirely or race
  // the in-flight run from the first mount).
  const runIdRef = useRef(0);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia(
      VOICE_GETUSERMEDIA_CONSTRAINTS
    );
    streamRef.current = stream;
    return stream;
  }, []);

  const runOnce = useCallback(
    async (isStale: () => boolean): Promise<void> => {
      try {
        // 1) Pre-flight 0.5s mic check.
        setState({ kind: "preflight" });
        const stream = await ensureStream();
        if (isStale()) return;
        const probe = await probeMicEnergy(stream, PREFLIGHT_MS);
        if (isStale()) return;
        if (probe.rms < PREFLIGHT_DEAD_MIC_RMS && probe.peak < 0.001) {
          setState({ kind: "preflight_failed", code: "DEAD_MIC" });
          return;
        }

        // 2) Record 4s with countdown.
        setState({ kind: "recording", secondsLeft: Math.ceil(RECORDING_MS / 1000) });
        const startedAt = Date.now();
        const tick = setInterval(() => {
          if (isStale()) {
            clearInterval(tick);
            return;
          }
          const elapsed = Date.now() - startedAt;
          const left = Math.max(0, Math.ceil((RECORDING_MS - elapsed) / 1000));
          setState((prev) =>
            prev.kind === "recording" ? { kind: "recording", secondsLeft: left } : prev
          );
        }, 250);
        let recording;
        try {
          recording = await recordPcm16(stream, RECORDING_MS);
        } finally {
          clearInterval(tick);
        }
        if (isStale()) return;

        // 3) Client-side gates (cheap, save server roundtrip).
        const localCode = clientGate(recording);
        if (localCode) {
          const retriesLeft = MAX_RETRIES - retriesRef.current - 1;
          if (retriesLeft >= 0) {
            setState({ kind: "failed", code: localCode, retriesLeft });
          } else {
            setState({ kind: "skip_offer" });
          }
          return;
        }

        // 4) POST to server enroll.
        setState({ kind: "processing" });
        const audioB64 = bytesToBase64(recording.pcm);
        const resp = await fetch("/api/voice/voiceprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_b64: audioB64,
            sample_rate: recording.sampleRate,
            duration_ms: recording.durationMs,
          }),
        });
        if (isStale()) return;

        if (!resp.ok) {
          let code: FailureCode = "EMBEDDING_FAILED";
          try {
            const data = await resp.json();
            const detail = data?.detail?.code;
            if (
              detail === "TOO_QUIET" ||
              detail === "TOO_SHORT" ||
              detail === "TOO_LOUD" ||
              detail === "TOO_NOISY" ||
              detail === "EMBEDDING_FAILED"
            ) {
              code = detail === "TOO_QUIET" ? "SILENT" : detail;
            }
          } catch {
            /* fall through with EMBEDDING_FAILED */
          }
          const retriesLeft = MAX_RETRIES - retriesRef.current - 1;
          setState(
            retriesLeft >= 0
              ? { kind: "failed", code, retriesLeft }
              : { kind: "skip_offer" }
          );
          return;
        }

        const data = (await resp.json()) as {
          voiceprint_b64: string;
          embedding_dim: number;
          duration_ms: number;
          snr_db: number;
        };

        releaseStream();
        setState({ kind: "done" });
        onCalibrated(data.voiceprint_b64);
      } catch {
        if (isStale()) return;
        const retriesLeft = MAX_RETRIES - retriesRef.current - 1;
        setState(
          retriesLeft >= 0
            ? { kind: "failed", code: "NETWORK_ERROR", retriesLeft }
            : { kind: "skip_offer" }
        );
      }
    },
    [ensureStream, onCalibrated, releaseStream]
  );

  const startRun = useCallback(() => {
    runIdRef.current += 1;
    const myId = runIdRef.current;
    void runOnce(() => runIdRef.current !== myId);
  }, [runOnce]);

  const handleCancel = useCallback(() => {
    runIdRef.current += 1; // invalidates any in-flight run
    releaseStream();
    onCancel();
  }, [onCancel, releaseStream]);

  useEffect(() => {
    startRun();
    return () => {
      // Bumping the generation invalidates the run started by this mount via
      // `isStale()`. Strict Mode's remount will then call startRun() again,
      // which bumps the generation once more and starts a fresh run.
      runIdRef.current += 1;
      releaseStream();
    };
    // Only on mount: we don't want startRun's identity changes to retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRetry = useCallback(() => {
    retriesRef.current += 1;
    startRun();
  }, [startRun]);

  const onSkip = useCallback(() => {
    releaseStream();
    onCalibrated(null);
  }, [onCalibrated, releaseStream]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        <button
          aria-label="Cancel calibration"
          onClick={handleCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <Body
          state={state}
          onRetry={onRetry}
          onSkip={onSkip}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

interface BodyProps {
  state: State;
  onRetry: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

function Body({ state, onRetry, onSkip, onCancel }: BodyProps) {
  switch (state.kind) {
    case "idle":
    case "preflight":
      return (
        <div className="text-center space-y-3">
          <div className="mx-auto w-32 h-32">
            <SentientPrismVisualizer mode="thinking" />
          </div>
          <h3 className="text-lg font-semibold">Checking your microphone…</h3>
          <p className="text-sm text-muted-foreground">
            One moment while we set up your voice for this call.
          </p>
        </div>
      );
    case "preflight_failed":
      return <FailedView state={state} onRetry={onRetry} onCancel={onCancel} preflight />;
    case "recording":
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto w-32 h-32">
            <SentientPrismVisualizer mode="user" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Calibrating your voice</h3>
            <p className="text-sm text-muted-foreground">
              Read aloud, naturally:
            </p>
            <p className="text-base font-medium px-4 py-3 bg-muted rounded-lg italic">
              &ldquo;{CALIBRATION_PROMPT}&rdquo;
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Mic className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">
              Recording — {state.secondsLeft}s left
            </span>
          </div>
        </div>
      );
    case "processing":
      return (
        <div className="text-center space-y-3">
          <div className="mx-auto w-32 h-32">
            <SentientPrismVisualizer mode="thinking" />
          </div>
          <h3 className="text-lg font-semibold">Preparing your call…</h3>
          <p className="text-sm text-muted-foreground">Almost ready.</p>
        </div>
      );
    case "failed":
      return <FailedView state={state} onRetry={onRetry} onCancel={onCancel} />;
    case "skip_offer":
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto rounded-full bg-amber-500/10 p-3 w-fit">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold">
            We couldn&rsquo;t calibrate your voice.
          </h3>
          <p className="text-sm text-muted-foreground">
            You can continue without voice ID, but other voices nearby may
            interrupt the AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button variant="default" onClick={onSkip}>
              Continue without voice ID
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel call
            </Button>
          </div>
        </div>
      );
    case "done":
      return (
        <div className="text-center space-y-3">
          <div className="mx-auto rounded-full bg-emerald-500/10 p-3 w-fit">
            <Mic className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold">You&rsquo;re all set.</h3>
          <p className="text-sm text-muted-foreground">Starting your call…</p>
        </div>
      );
  }
}

interface FailedViewProps {
  state: Extract<State, { kind: "failed" } | { kind: "preflight_failed" }>;
  onRetry: () => void;
  onCancel: () => void;
  preflight?: boolean;
}

function FailedView({ state, onRetry, onCancel, preflight }: FailedViewProps) {
  const code = state.code as FailureCode;
  const msg = FAILURE_MESSAGES[code];
  const retriesLeft = state.kind === "failed" ? state.retriesLeft : null;
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto rounded-full bg-rose-500/10 p-3 w-fit">
        <MicOff className="h-6 w-6 text-rose-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{msg.title}</h3>
        <p className="text-sm text-muted-foreground">{msg.body}</p>
      </div>
      {!preflight && retriesLeft !== null && retriesLeft >= 0 && (
        <p className="text-xs text-muted-foreground">
          {retriesLeft} {retriesLeft === 1 ? "retry" : "retries"} remaining
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        <Button variant="default" onClick={onRetry}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel call
        </Button>
      </div>
    </div>
  );
}

function clientGate(rec: {
  rmsP95: number;
  peakMax: number;
  voicedRatio: number;
}): FailureCode | null {
  if (rec.rmsP95 < 0.005) return "SILENT";
  if (rec.peakMax > 0.95) return "TOO_LOUD";
  if (rec.voicedRatio < 0.20) return "TOO_SHORT";
  return null;
}
