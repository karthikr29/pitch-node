import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockSyncUserProfileFromAuth = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  })),
}));

vi.mock("@/lib/auth/profile-sync", () => ({
  syncUserProfileFromAuth: (...args: unknown[]) => mockSyncUserProfileFromAuth(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("User subscription API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
    });
    mockSyncUserProfileFromAuth.mockResolvedValue(undefined);
  });

  it("returns 600 lifetime credits for free users", async () => {
    mockServerFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { plan_type: "free", subscription_status: "active" },
            error: null,
          }),
        }),
      }),
    });
    mockAdminFrom.mockImplementation((table: string) => {
      expect(table).toBe("user_credits");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                monthly_limit_seconds: 600,
                credits_used_seconds: 0,
                period_end: "9999-12-31T00:00:00.000Z",
                credit_scope: "lifetime",
              },
              error: null,
            }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/user/subscription/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      plan_type: "free",
      credits_limit: 600,
      credits_used: 0,
      credits_remaining: 600,
      credits_scope: "lifetime",
      period_end: null,
    });
  });

  it("initializes monthly credits for pro users missing a credits row", async () => {
    mockServerFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { plan_type: "pro", subscription_status: "active" },
            error: null,
          }),
        }),
      }),
    });
    mockAdminFrom.mockImplementation((table: string) => {
      expect(table).toBe("user_credits");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: {
                monthly_limit_seconds: 30000,
                credits_used_seconds: 0,
                period_end: "2026-06-01T00:00:00.000Z",
                credit_scope: "monthly",
              },
              error: null,
            }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/user/subscription/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      plan_type: "pro",
      credits_limit: 30000,
      credits_used: 0,
      credits_remaining: 30000,
      credits_scope: "monthly",
    });
  });
});

describe("User profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
    });
    mockSyncUserProfileFromAuth.mockResolvedValue(undefined);
  });

  it("returns profile-backed display fields", async () => {
    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              email: "test@example.com",
              full_name: "Profile User",
              avatar_url: "https://lh3.googleusercontent.com/avatar.png",
              age: 34,
              gender: "prefer_not_to_say",
              phone: "+15551234567",
              company: "Acme",
              job_title: "Account Executive",
              country: "India",
              timezone: "Asia/Kolkata",
              plan_type: "free",
              subscription_status: "active",
            },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/user/profile/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      email: "test@example.com",
      full_name: "Profile User",
      avatar_url: "https://lh3.googleusercontent.com/avatar.png",
      age: 34,
      gender: "prefer_not_to_say",
      phone: "+15551234567",
      company: "Acme",
      job_title: "Account Executive",
      country: "India",
      timezone: "Asia/Kolkata",
      plan_type: "free",
      subscription_status: "active",
    });
  });

  it("updates personal profile fields", async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: {
              email: "test@example.com",
              full_name: "Updated User",
              avatar_url: "https://lh3.googleusercontent.com/avatar.png",
              age: 35,
              gender: "female",
              phone: "+15557654321",
              company: "New Co",
              job_title: "VP Sales",
              country: "United States",
              timezone: "America/New_York",
              plan_type: "free",
              subscription_status: "active",
            },
            error: null,
          }),
        }),
      }),
    }));
    mockAdminFrom.mockReturnValue({
      update,
    });

    const { PATCH } = await import("@/app/api/user/profile/route");
    const request = new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({
        full_name: "Updated User",
        age: 35,
        gender: "female",
        phone: "+15557654321",
        company: "New Co",
        job_title: "VP Sales",
        country: "United States",
        timezone: "America/New_York",
      }),
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.full_name).toBe("Updated User");
    expect(body.age).toBe(35);
    expect(body.job_title).toBe("VP Sales");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      full_name: "Updated User",
      age: 35,
      gender: "female",
      job_title: "VP Sales",
    }));
  });
});
