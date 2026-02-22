"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SentientPrismVisualizer } from "@/components/ui/sentient-prism-visualizer";
import { StarryBackground } from "@/components/ui/starry-background";
import { cn } from "@/lib/utils";
import {
  buildPitchContextFromBriefing,
  validatePitchBriefing,
} from "@/lib/validators";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  useConnectionState,
  useParticipants,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

type CallState = "requesting-mic" | "initializing" | "connecting" | "connected" | "disconnected" | "error";
type SpeakingState = "ai" | "user" | "idle";

interface RoomCredentials {
  token: string;
  roomName: string;
  livekitUrl: string;
  sessionId: string;
}

function readPitchBriefingFromStorage(scenarioId: string) {
  const raw = sessionStorage.getItem(`pitch-briefing:${scenarioId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validation = validatePitchBriefing(parsed);
    if (!validation.valid || !validation.value) return null;
    return validation.value;
  } catch {
    return null;
  }
}

// Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
function CallInterface({
  personaName,
  personaRole,
  onBeforeDisconnect,
  onEndCall,
}: {
  personaName: string;
  personaRole: string;
  onBeforeDisconnect: () => void;
  onEndCall: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const [muted, setMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = connectionState === ConnectionState.Connected;
  const aiParticipant = participants.find((p) => p.identity.startsWith("ai-"));
  const speakingState: SpeakingState =
    !isConnected
      ? "idle"
      : aiParticipant?.isSpeaking
        ? "ai"
        : localParticipant?.isSpeaking && !muted
          ? "user"
          : "idle";

  // Timer
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Enable microphone when connected
  useEffect(() => {
    if (isConnected && localParticipant) {
      localParticipant.setMicrophoneEnabled(true).catch(console.error);
    }
  }, [isConnected, localParticipant]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  async function handleMuteToggle() {
    if (localParticipant) {
      const newMuted = !muted;
      setMuted(newMuted);
      await localParticipant.setMicrophoneEnabled(!newMuted);
    }
  }

  async function handleEndCall() {
    setEnding(true);
    if (timerRef.current) clearInterval(timerRef.current);
    onBeforeDisconnect();
    room.disconnect().catch((error) => {
      console.error("[CallPage] Error disconnecting LiveKit room:", error);
    });
    onEndCall();
  }

  // Map connection state to display status
  const getConnectionStatus = (): "connecting" | "connected" | "disconnected" => {
    switch (connectionState) {
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        return "connecting";
      case ConnectionState.Connected:
        return "connected";
      default:
        return "disconnected";
    }
  };

  const status = getConnectionStatus();

  return (
    <div className="fixed inset-0 bg-slate-950 text-white overflow-hidden z-50 font-sans">
      {/* Render remote audio (AI voice) */}
      <RoomAudioRenderer />

      {/* Immersive Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <StarryBackground />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-slate-950/30 via-slate-900/50 to-slate-950/90 pointer-events-none" />

      {/* Main Content Layer */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6">

        {/* Header - Minimalist */}
        <div className="flex justify-center items-center h-16">
          {status === "connected" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10"
            >
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm font-medium tracking-wide">
                {formatTime(elapsedSeconds)}
              </span>
              {aiParticipant && (
                <span className="ml-2 text-xs text-green-400">● AI Connected</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Center Stage - Waveform & Persona */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-10">
          <AnimatePresence mode="wait">
            {status === "connecting" ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
                </div>
                <p className="text-slate-400 font-light tracking-wide animate-pulse">
                  Connecting to AI assistant...
                </p>
              </motion.div>
            ) : status === "connected" ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="flex flex-col items-center w-full max-w-md"
              >
                {/* Dynamic Voice Visualizer */}
                <div className="h-64 flex items-center justify-center w-full mb-8 relative">
                  <SentientPrismVisualizer
                    mode={speakingState}
                    className="w-full h-full"
                  />
                </div>

                {/* Persona Details */}
                <div className="text-center space-y-3">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight"
                  >
                    {personaName}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-lg text-slate-400 font-medium"
                  >
                    {personaRole}
                  </motion.p>

                  {/* Status Indicator Text */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="h-8 flex items-center justify-center mt-6"
                  >
                    <span className={cn(
                      "text-sm uppercase tracking-widest font-semibold transition-colors duration-500",
                      speakingState === "ai" ? "text-primary" :
                        speakingState === "user" ? "text-blue-400" :
                          "text-slate-600"
                    )}>
                      {speakingState === "ai" ? "AI Speaking..." :
                        speakingState === "user" ? "Listening to you..." :
                          aiParticipant ? "Ready" : "Waiting for AI..."}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <h3 className="text-2xl font-semibold text-white mb-2">Call Ended</h3>
                <p className="text-slate-400">Saving session data...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Controls - Floating Dock */}
        <div className="flex justify-center pb-12">
          <div className="flex items-center gap-8 px-10 py-5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl ring-1 ring-white/5">
            <Button
              variant="ghost"
              size="icon-lg"
              className={cn(
                "rounded-full w-16 h-16 transition-all duration-300 hover:bg-white/10",
                muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-white bg-white/5"
              )}
              onClick={handleMuteToggle}
              disabled={status !== "connected"}
            >
              {muted ? (
                <MicOff className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </Button>

            <Button
              variant="destructive"
              size="icon-lg"
              className="rounded-full w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-900/50 transition-all hover:scale-105 active:scale-95 border-0"
              onClick={handleEndCall}
              disabled={ending || status === "disconnected"}
            >
              {ending ? (
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              ) : (
                <PhoneOff className="w-8 h-8 text-white fill-current" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component - handles room creation and LiveKit connection
export default function CallRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;
  const personaId = searchParams.get("persona") || "";
  const personaNameParam = searchParams.get("name") || "";
  const personaRoleParam = searchParams.get("role") || "";
  const pitchContextParam = searchParams.get("pitch") || "";

  const [callState, setCallState] = useState<CallState>("requesting-mic");
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const hasInitializedRef = useRef(false); // Prevent double initialization from React StrictMode
  const sessionEndHandledRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);

  // Persona display info (from query params or defaults)
  const [personaName] = useState(personaNameParam || "AI Prospect");
  const [personaRole] = useState(personaRoleParam || "Sales Training");

  // Check existing mic permission on mount — skip the prompt screen if already granted
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          setHasMicPermission(true);
          setCallState("initializing");
        } else if (result.state === "denied") {
          setHasMicPermission(false);
          setError("Microphone access is required for calls. Please allow microphone access in your browser settings and try again.");
          setCallState("error");
        }
        // "prompt" → leave state as "requesting-mic", show the permission screen
      })
      .catch(() => {
        // Permissions API not supported or failed — fall through to normal prompt screen
      });
  }, []);

  // Request microphone permission
  async function requestMicPermission() {
    try {
      console.log("[CallPage] Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately - we just needed to get permission
      stream.getTracks().forEach(track => track.stop());
      console.log("[CallPage] Microphone permission granted");
      setHasMicPermission(true);
      setCallState("initializing");
    } catch (err) {
      console.error("[CallPage] Microphone permission denied:", err);
      setHasMicPermission(false);
      setError("Microphone access is required for calls. Please allow microphone access and try again.");
      setCallState("error");
    }
  }

  // Initialize call after mic permission is granted
  useEffect(() => {
    if (callState !== "initializing" || !hasMicPermission) return;
    if (hasInitializedRef.current) return; // Prevent duplicate calls from StrictMode
    hasInitializedRef.current = true;

    async function initializeCall() {
      try {
        console.log("[CallPage] Initializing call for scenario:", scenarioId, "persona:", personaId);
        const pitchBriefing = readPitchBriefingFromStorage(scenarioId);
        const pitchContextFromBriefing = pitchBriefing
          ? buildPitchContextFromBriefing(pitchBriefing)
          : "";
        const finalPitchContext = pitchContextParam || pitchContextFromBriefing;

        const response = await fetch("/api/voice/create-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId,
            personaId,
            pitchContext: finalPitchContext,
            pitchBriefing: pitchBriefing || undefined,
            inferredRole: personaRoleParam || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[CallPage] Create room failed:", errorData);
          throw new Error(errorData.error || "Failed to create room");
        }

        const data = await response.json();
        console.log("[CallPage] Room created:", data.roomName, "LiveKit URL:", data.livekitUrl);

        setCredentials({
          token: data.token,
          roomName: data.roomName,
          livekitUrl: data.livekitUrl,
          sessionId: data.sessionId,
        });
        if (pitchBriefing) {
          sessionStorage.removeItem(`pitch-briefing:${scenarioId}`);
        }
        setCallState("connecting");
      } catch (err) {
        console.error("[CallPage] Failed to initialize call:", err);
        setError(err instanceof Error ? err.message : "Failed to start call");
        setCallState("error");
      }
    }

    initializeCall();
  }, [callState, hasMicPermission, scenarioId, personaId, pitchContextParam, personaRoleParam]);

  function endSessionInBackground(sessionId: string) {
    void fetch("/api/voice/end-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          console.warn("[CallPage] End session response not ok:", res.status, body);
        }
      })
      .catch((err) => {
        console.error("[CallPage] End session error:", err);
      });
  }

  const completeSessionAndNavigate = useCallback((source: "manual" | "remote-disconnect") => {
    if (sessionEndHandledRef.current) return;
    sessionEndHandledRef.current = true;

    const sessionId = credentials?.sessionId;
    if (sessionId) {
      console.log(`[CallPage] Finalizing session (${source}) (non-blocking):`, sessionId);
      endSessionInBackground(sessionId);
      router.push(`/dashboard/history/${sessionId}`);
      return;
    }

    router.push("/dashboard/history");
  }, [credentials?.sessionId, router]);

  function handleEndCall() {
    completeSessionAndNavigate("manual");
  }

  // Mic permission request state
  if (callState === "requesting-mic") {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 z-0 opacity-60">
          <StarryBackground />
        </div>
        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <Mic className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">Microphone Access Required</h2>
          <p className="text-slate-400 mb-8">
            To have a voice conversation with your AI prospect, we need access to your microphone.
            Your audio is processed in real-time and is not stored beyond the call transcript.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => router.back()} variant="outline">
              Cancel
            </Button>
            <Button onClick={requestMicPermission} className="px-8">
              Allow Microphone
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (callState === "error") {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to start call</h2>
        <p className="text-slate-400 text-center mb-6 max-w-md">
          {error || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  // Loading state - waiting for credentials
  if (callState === "initializing" || !credentials) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-60">
          <StarryBackground />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-slate-400">Preparing your call...</p>
        </div>
      </div>
    );
  }

  // Connected state - render LiveKitRoom with the call interface
  return (
    <LiveKitRoom
      serverUrl={credentials.livekitUrl}
      token={credentials.token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => {
        console.log("[CallPage] Disconnected from LiveKit");
        setCallState("disconnected");
        completeSessionAndNavigate("remote-disconnect");
      }}
      onError={(error) => {
        const message = (error?.message || "").toLowerCase();
        const expectedDisconnect =
          message.includes("client initiated disconnect") || intentionalDisconnectRef.current;
        if (expectedDisconnect) {
          console.debug("[CallPage] Ignoring expected disconnect error:", error.message);
          return;
        }
        console.error("[CallPage] LiveKit error:", error);
        setError(error.message);
        setCallState("error");
      }}
    >
      <CallInterface
        personaName={personaName}
        personaRole={personaRole}
        onBeforeDisconnect={() => {
          intentionalDisconnectRef.current = true;
        }}
        onEndCall={handleEndCall}
      />
    </LiveKitRoom>
  );
}
