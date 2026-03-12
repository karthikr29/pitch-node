import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const backMock = vi.fn();
const disconnectMock = vi.fn().mockResolvedValue(undefined);
const setMicrophoneEnabledMock = vi.fn().mockResolvedValue(undefined);

let mockConnectionState = "connected";
let liveKitCallbacks: {
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
} = {};
let sessionStatePayload = {
  sessionId: "session-1",
  phase: "active",
  autoEndRequested: false,
  endReason: null,
  requestedAt: null,
};

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

vi.mock("livekit-client", () => ({
  ConnectionState: {
    Connecting: "connecting",
    Connected: "connected",
    Disconnected: "disconnected",
    Reconnecting: "reconnecting",
  },
}));

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({
    children,
    onDisconnected,
    onError,
  }: {
    children: ReactNode;
    onDisconnected?: () => void;
    onError?: (error: Error) => void;
  }) => {
    liveKitCallbacks = { onDisconnected, onError };
    return <div data-testid="livekit-room">{children}</div>;
  },
  useLocalParticipant: () => ({
    localParticipant: {
      isSpeaking: false,
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
    sessionStatePayload = {
      sessionId: "session-1",
      phase: "active",
      autoEndRequested: false,
      endReason: null,
      requestedAt: null,
    };

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
              }),
          });
        }

        if (url.startsWith("/api/voice/session-state")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(sessionStatePayload),
          });
        }

        if (url === "/api/voice/end-session") {
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

  it("navigates once on remote disconnect after auto-end begins and skips manual end-session", async () => {
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

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    expect(pushMock).toHaveBeenCalledTimes(1);
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(0);
  });

  it("uses client fallback navigation when auto-end disconnect does not arrive", async () => {
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

    expect(pushMock).toHaveBeenCalledWith("/history/session-1");
    const endSessionCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === "/api/voice/end-session"
    );
    expect(endSessionCalls).toHaveLength(0);
  });

  it("keeps manual end-session behavior unchanged", async () => {
    const fetchMock = vi.mocked(fetch);

    render(<CallRoomPage />);

    await settleCallPage();

    expect(screen.getByTestId("livekit-room")).toBeInTheDocument();

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
  });
});
