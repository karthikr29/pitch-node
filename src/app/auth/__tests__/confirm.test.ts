import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyOtp = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe("Auth Confirm Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to reset-password when the recovery token is verified", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/auth/confirm/route");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery&next=/auth/reset-password"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/reset-password"
    );
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "abc123",
    });
  });

  it("sanitizes absolute same-origin next URLs", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/auth/confirm/route");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery&next=http://localhost:3000/auth/reset-password?source=email"
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/reset-password?source=email"
    );
  });

  it("redirects invalid requests back to forgot-password", async () => {
    const { GET } = await import("@/app/auth/confirm/route");

    const wrongTypeRequest = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=email"
    );
    const wrongTypeResponse = await GET(wrongTypeRequest);

    expect(wrongTypeResponse.status).toBe(307);
    expect(wrongTypeResponse.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid_or_expired"
    );

    const missingTokenRequest = new NextRequest(
      "http://localhost:3000/auth/confirm?type=recovery"
    );
    const missingTokenResponse = await GET(missingTokenRequest);

    expect(missingTokenResponse.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid_or_expired"
    );
  });

  it("redirects verification failures back to forgot-password", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "Token expired" } });
    const { GET } = await import("@/app/auth/confirm/route");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery"
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/forgot-password?error=invalid_or_expired"
    );
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
