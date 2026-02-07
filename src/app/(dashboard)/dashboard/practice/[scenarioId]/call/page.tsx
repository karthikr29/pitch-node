"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  PhoneOff,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export default function CallRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;
  const personaId = searchParams.get("persona") || "persona-1";

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [muted, setMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persona display info
  const personaEmoji = "🤨";
  const personaName = "AI Prospect";

  // Simulate connection
  useEffect(() => {
    const connectTimeout = setTimeout(() => {
      setStatus("connected");
    }, 2000);

    return () => clearTimeout(connectTimeout);
  }, []);

  // Timer
  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  async function handleEndCall() {
    setEnding(true);
    setStatus("disconnected");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch("/api/voice/end-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, personaId }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/history/${data.sessionId}`);
        return;
      }
    } catch {
      // API not available
    }

    // Fallback redirect
    router.push("/dashboard/history");
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {status === "connecting" && (
            <>
              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-sm text-yellow-500 font-medium">
                Connecting...
              </span>
            </>
          )}
          {status === "connected" && (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">
                Connected
              </span>
            </>
          )}
          {status === "disconnected" && (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-500 font-medium">
                Disconnected
              </span>
            </>
          )}
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Persona */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{personaEmoji}</div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            {personaName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "connecting"
              ? "Setting up the call..."
              : status === "connected"
              ? "Call in progress"
              : "Call ended"}
          </p>
        </div>

        {/* Voice Visualization */}
        {status === "connected" && (
          <div className="flex items-end justify-center gap-1.5 h-24 mb-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-primary rounded-full animate-voice-pulse"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${0.6 + Math.random() * 0.6}s`,
                  height: "100%",
                }}
              />
            ))}
          </div>
        )}

        {status === "connecting" && (
          <div className="flex items-center justify-center h-24 mb-8">
            <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {status === "disconnected" && (
          <div className="flex items-center justify-center h-24 mb-8">
            <p className="text-muted-foreground">
              {ending ? "Saving session..." : "Call ended"}
            </p>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-center gap-6 px-4 py-6 border-t border-border bg-card">
        <Button
          variant={muted ? "destructive" : "outline"}
          size="icon-lg"
          className={cn(
            "rounded-full w-14 h-14",
            !muted && "hover:bg-muted"
          )}
          onClick={() => setMuted(!muted)}
          disabled={status !== "connected"}
        >
          {muted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        <Button
          variant="destructive"
          size="icon-lg"
          className="rounded-full w-16 h-16"
          onClick={handleEndCall}
          disabled={ending || status === "disconnected"}
        >
          {ending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <PhoneOff className="w-6 h-6" />
          )}
        </Button>
      </div>
    </div>
  );
}
