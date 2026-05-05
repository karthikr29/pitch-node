import { describe, expect, it, vi } from "vitest";
import { completeSessionWithCredits } from "@/lib/credits";

describe("completeSessionWithCredits", () => {
  it("calls the atomic completion RPC and maps the result", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        session_id: "session-1",
        duration_seconds: 11,
        credits_charged_seconds: 11,
        credits_used_seconds: 11,
        credits_remaining: 589,
        already_charged: false,
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });

    const result = await completeSessionWithCredits(
      { from: vi.fn(), rpc } as unknown as Parameters<typeof completeSessionWithCredits>[0],
      "session-1",
      "2026-05-01T00:00:10.200Z"
    );

    expect(rpc).toHaveBeenCalledWith("complete_session_with_credits", {
      p_session_id: "session-1",
      p_ended_at: "2026-05-01T00:00:10.200Z",
    });
    expect(result).toEqual({
      sessionId: "session-1",
      durationSeconds: 11,
      creditsChargedSeconds: 11,
      creditsUsedSeconds: 11,
      creditsRemaining: 589,
      alreadyCharged: false,
    });
  });
});
