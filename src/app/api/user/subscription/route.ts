import { NextResponse } from "next/server";
import { syncUserProfileFromAuth } from "@/lib/auth/profile-sync";
import {
  getOrCreateFreeLifetimeCredits,
  getOrCreatePerformerMonthlyCredits,
} from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncUserProfileFromAuth(user);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan_type, subscription_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  if (profile.plan_type !== "pro") {
    const credits = await getOrCreateFreeLifetimeCredits(admin, user.id);
    return NextResponse.json({
      plan_type: profile.plan_type,
      subscription_status: profile.subscription_status,
      credits_limit: credits.creditsLimit,
      credits_used: credits.creditsUsed,
      credits_remaining: credits.creditsRemaining,
      credits_scope: credits.creditsScope,
      period_end: null,
    });
  }

  const credits = await getOrCreatePerformerMonthlyCredits(admin, user.id);

  return NextResponse.json({
    plan_type: "pro",
    subscription_status: profile.subscription_status,
    credits_limit: credits.creditsLimit,
    credits_used: credits.creditsUsed,
    credits_remaining: credits.creditsRemaining,
    credits_scope: credits.creditsScope,
    period_end: credits.periodEnd,
  });
}
