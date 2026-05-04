import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const backMock = vi.fn();
const disconnectMock = vi.fn().mockResolvedValue(undefined);
const setMicrophoneEnabledMock = vi.fn().mockResolvedValue(undefined);
const refreshPlanMock = vi.fn().mockResolvedValue(undefined);
const setNoiseFilterEnabledMock = vi.fn().mockResolvedValue(undefined);

let mockConnectionState = "connected";
let mockLocalIsSpeaking = false;
let mockNoiseFilterEnabled = true;
let liveKitCallbacks: {
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
} = {};
let liveKitRoomAudioProp: unknown = null;
type TestSessionStatePayload = {
  sessionId: string;
  phase: "calibrating" | "active" | "ending" | "ended" | "unknown";
  autoEndRequested: boolean;
  endReason: {
    speaker?: "user" | "ai";
    reasonCode?: string;
    trigger?: string;
    type?: string;
  } | null;
  requestedAt: string | null;
  audioGuard: {
    noiseFilter: string;
    calibration: string;
    activity: string;
    decisionReason?: string;
    warning?: string;
    warningExpiresAt?: string;
  };
};
let sessionStatePayload: TestSessionStatePayload = {
  sessionId: "session-1",
  phase: "active",
  autoEndRequested: false,
  endReason: null,
  requestedAt: null,
  audioGuard: {
    noiseFilter: "enabled",
    calibration: "ready",
    activity: "idle",
    decisionReason: "ready",
    warning: "none",
  },
};
let endSessionShouldFail = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: backMock,
    refresh: vi.fn(),
  }),
  useParams: () => ({ scenarioId: "scenario-1" }),
  useSearchParams: () =>
    new URLSearchParams("persona=persona-1&name=AI%20Prospect&role=Sales%20Training"),
}));

vi.mock("framer-motion", () => {
  const MockMotion = ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  );

  return {
    motion: new Proxy(
      {},
      {
        get: () => MockMotion,
      }
    ),
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/sentient-prism-visualizer", () => ({
  SentientPrismVisualizer: () => <div data-testid="visualizer" />,
}));

vi.mock("@/components/ui/starry-background", () => ({
  StarryBackground: () => <div data-testid="background" />,
}));

vi.mock("@/lib/validators", () => ({
  buildPitchContextFromBriefing: () => "",
  validatePitchBriefing: () => ({ valid: false, value: null }),
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    userPlan: {
      type: "pro",
      creditsRemaining: 30000,
      creditsLimit: 30000,
      creditsScope: "monthly",
      periodEnd: null,
    },
    refreshPlan: refreshPlanMock,
  }),
}));

vi.mock("@livekit/krisp-noise-filter", () => ({
  isKrispNoiseFilterSupported: () => true,
  KrispNoiseFilter: vi.fn(),
}));

vi.mock("livekit-client", () => ({
  ConnectionState: {
    Connecting: "connecting",
    Connected: "connected",
    Disconnected: "disconnected",
    Reconnecting: "reconnecting",
  },
}));

vi.mock("@livekit/components-react/krisp", () => ({
  useKrispNoiseFilter: () => ({
    setNoiseFilterEnabled: setNoiseFilterEnabledMock,
    isNoiseFilterEnabled: mockNoiseFilterEnabled,
    isNoiseFilterPending: false,
    processor: undefined,
  }),
}));

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({
    children,
    onDisconnected,
    onError,
    audio,
  }: {
    children: ReactNode;
    onDisconnected?: () => void;
    onError?: (error: Error) => void;
    audio?: unknown;
  }) => {
    liveKitCallbacks = { onDisconnected, onError };
    liveKitRoomAudioProp = audio;
    return <div data-testid="livekit-room">{children}</div>;
  },
  useLocalParticipant: () => ({
    localParticipant: {
      isSpeaking: mockLocalIsSpeaking,
      setMicrophoneEnabled: setMicrophoneEnabledMock,
    },
  }),
  useRoomContext: () => ({
    disconnect: disconnectMock,
  }),
  RoomAudioRenderer: () => null,
  useConnectionState: () => mockConnectionState,
  useParticipants: () => [{ identity: "ai-session", isSpeaking: false }],
}));

import CallRoomPage from "./page";

describe("CallRoomPage auto-end behavior", () => {
  async function settleCallPage() {
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockConnectionState = "connected";
    liveKitCallbacks = {};
    endSessionShouldFail = false;
    sessionStatePayload = {
      sessionId: "session-1",
      phase: "active",
      autoEndRequested: false,
      endReason: null,
      requestedAt: null,
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "idle",
        decisionReason: "ready",
        warning: "none",
      },
    };
    liveKitRoomAudioProp = null;
    mockLocalIsSpeaking = false;
    mockNoiseFilterEnabled = true;

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/voice/create-room") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                token: "lk-token",
                roomName: "room-1",
                livekitUrl: "wss://livekit.test",
                sessionId: "session-1",
                maxDurationSeconds: 30000,
              }),
          });
        }

        if (url.startsWith("/api/voice/session-state")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(sessionStatePayload),
          });
        }

        if (url === "/api/voice/session-connected") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessionId: "session-1",
                startedAt: "2026-03-12T00:00:00.000Z",
                alreadyStarted: false,
              }),
          });
        }

        if (url === "/api/voice/end-session") {
          if (endSessionShouldFail) {
            return Promise.resolve({
              ok: false,
              status: 500,
              text: () => Promise.resolve("failed"),
            });
          }

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ sessionId: "session-1", duration: 30 }),
          });
        }

        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
      })
    );

    Object.defineProperty(window.navigator, "permissions", {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: "granted" }),
      },
    });

    Object.defineProperty(window.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows ending state when backend marks the session as ending", async () => {
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "ending",
      autoEndRequested: true,
      endReason: {
        speaker: "user",
        reasonCode: "closing_goodbye",
        trigger: "transcription_frame",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Ending call...")).toBeInTheDocument();
  });

  it("keeps the preparing loader visible until LiveKit connects", async () => {
    const fetchMock = vi.mocked(fetch);
    mockConnectionState = "connecting";
    const view = render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Preparing your call...")).toBeInTheDocument();
    expect(screen.queryByTestId("visualizer")).not.toBeInTheDocument();

    mockConnectionState = "connected";
    view.rerender(<CallRoomPage />);

    await settleCallPage();

    expect(screen.queryByText("Preparing your call...")).not.toBeInTheDocument();
    expect(screen.getByTestId("visualizer")).toBeInTheDocument();

    const sessionConnectedCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/session-connected"
    );
    expect(sessionConnectedCalls).toHaveLength(1);
  });

  it("shows calibration before the connected call UI becomes active", async () => {
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "calibrating",
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "collecting_voice",
        activity: "calibrating",
        decisionReason: "collecting_voice",
        warning: "none",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Calibrating your voice")).toBeInTheDocument();
    expect(screen.getByText(`"${"My voice is the only voice for this practice call."}"`)).toBeInTheDocument();
    expect(screen.queryByText("AI Prospect")).not.toBeInTheDocument();
  });

  it("marks the session connected only after calibration completes", async () => {
    const fetchMock = vi.mocked(fetch);
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "calibrating",
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "collecting_noise",
        activity: "calibrating",
        decisionReason: "collecting_noise",
        warning: "none",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Calibrating your voice")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input) === "/api/voice/session-connected")
    ).toHaveLength(0);

    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "active",
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "idle",
        decisionReason: "ready",
        warning: "none",
      },
    };

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await settleCallPage();

    expect(
      fetchMock.mock.calls.filter(([input]) => String(input) === "/api/voice/session-connected")
    ).toHaveLength(1);
  });

  it("publishes explicit guarded LiveKit audio capture options", async () => {
    render(<CallRoomPage />);

    await settleCallPage();

    expect(liveKitRoomAudioProp).toEqual({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    });
  });

  it("continues in guarded WebRTC mode when Krisp is not enabled", async () => {
    mockNoiseFilterEnabled = false;
    setNoiseFilterEnabledMock.mockRejectedValueOnce(new Error("unsupported"));
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "calibrating",
      audioGuard: {
        noiseFilter: "client",
        calibration: "collecting_noise",
        activity: "calibrating",
        decisionReason: "collecting_noise",
        warning: "none",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Calibrating your voice")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    await settleCallPage();

    expect(screen.getByText("Guarded WebRTC audio")).toBeInTheDocument();
  });

  it("does not enter thinking mode from local mic activity alone", async () => {
    mockLocalIsSpeaking = true;
    sessionStatePayload = {
      ...sessionStatePayload,
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "background_noise",
        decisionReason: "low_snr",
        warning: "none",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("Listening to you...")).not.toBeInTheDocument();
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
  });

  it("hides mic warning for low-snr background noise without explicit backend warning", async () => {
    sessionStatePayload = {
      ...sessionStatePayload,
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "background_noise",
        decisionReason: "low_snr",
        warning: "none",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.queryByText("Move closer to the mic or reduce nearby noise")).not.toBeInTheDocument();
  });

  it("shows mic warning only for active low-snr speech warning", async () => {
    sessionStatePayload = {
      ...sessionStatePayload,
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "background_noise",
        decisionReason: "low_snr_speech_window",
        warning: "low_snr_speech",
        warningExpiresAt: new Date(Date.now() + 5000).toISOString(),
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Move closer to the mic or reduce nearby noise")).toBeInTheDocument();
  });

  it("hides expired low-snr speech warning", async () => {
    sessionStatePayload = {
      ...sessionStatePayload,
      audioGuard: {
        noiseFilter: "enabled",
        calibration: "ready",
        activity: "background_noise",
        decisionReason: "low_snr_speech_window",
        warning: "low_snr_speech",
        warningExpiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.queryByText("Move closer to the mic or reduce nearby noise")).not.toBeInTheDocument();
  });

  it("shows elapsed call duration without rendering remaining-credit minutes", async () => {
    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.queryByText(/m left/i)).not.toBeInTheDocument();
  });

  it("navigates once on remote disconnect after auto-end begins and skips duplicate end-session", async () => {
    const fetchMock = vi.mocked(fetch);
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "ending",
      autoEndRequested: true,
      endReason: {
        speaker: "user",
        reasonCode: "closing_goodbye",
        trigger: "transcription_frame",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Ending call...")).toBeInTheDocument();

    await act(async () => {
      liveKitCallbacks.onDisconnected?.();
    });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await settleCallPage();

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    expect(pushMock).toHaveBeenCalledTimes(1);
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(0);
    expect(refreshPlanMock).toHaveBeenCalledTimes(1);
  });

  it("uses client fallback completion when auto-end disconnect does not arrive", async () => {
    const fetchMock = vi.mocked(fetch);
    sessionStatePayload = {
      ...sessionStatePayload,
      phase: "ending",
      autoEndRequested: true,
      endReason: {
        speaker: "ai",
        reasonCode: "closing_goodbye",
        trigger: "ai_full_response_end",
      },
    };

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByText("Ending call...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    await settleCallPage();

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(1);
    expect(refreshPlanMock).toHaveBeenCalledTimes(1);
  });

  it("completes manual end-session in the background and navigates immediately", async () => {
    const fetchMock = vi.mocked(fetch);

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByTestId("visualizer")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    await act(async () => {
      fireEvent.click(buttons[1]);
    });
    await settleCallPage();

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(1);
    expect(refreshPlanMock).toHaveBeenCalledTimes(1);
    expect(pushMock.mock.invocationCallOrder[0]).toBeLessThan(
      refreshPlanMock.mock.invocationCallOrder[0]
    );
  });

  it("still navigates when end-session fails and does not refresh stale credits", async () => {
    const fetchMock = vi.mocked(fetch);
    endSessionShouldFail = true;

    render(<CallRoomPage />);

    await settleCallPage();

    const buttons = screen.getAllByRole("button");
    await act(async () => {
      fireEvent.click(buttons[1]);
    });
    await settleCallPage();

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(1);
    expect(refreshPlanMock).not.toHaveBeenCalled();
  });

  it("guards duplicate disconnect events from double completion", async () => {
    const fetchMock = vi.mocked(fetch);

    render(<CallRoomPage />);

    await settleCallPage();

    await act(async () => {
      liveKitCallbacks.onDisconnected?.();
      liveKitCallbacks.onDisconnected?.();
    });
    await settleCallPage();

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });
});
