export const FREE_LIFETIME_CREDITS = 600;
export const PERFORMER_MONTHLY_CREDITS = 30000;
export const LIFETIME_PERIOD_END = "9999-12-31T00:00:00.000Z";

type CreditClient = {
  from: (table: string) => any;
  rpc?: any;
};

export type CreditBalance = {
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  creditsScope: "lifetime" | "monthly";
  periodEnd: string | null;
};

export type CompletedSessionCredits = {
  sessionId: string;
  durationSeconds: number;
  creditsChargedSeconds: number;
  creditsUsedSeconds: number | null;
  creditsRemaining: number | null;
  alreadyCharged: boolean;
};

function currentMonthlyPeriod(now = new Date()) {
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

export async function getOrCreateFreeLifetimeCredits(
  supabase: CreditClient,
  userId: string
): Promise<CreditBalance> {
  const { data: credits, error } = await supabase
    .from("user_credits")
    .select("monthly_limit_seconds, credits_used_seconds, period_start, period_end, credit_scope")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const now = new Date();

  if (!credits) {
    const { data: newCredits, error: insertError } = await supabase
      .from("user_credits")
      .insert({
        user_id: userId,
        monthly_limit_seconds: FREE_LIFETIME_CREDITS,
        credits_used_seconds: 0,
        credit_scope: "lifetime",
        period_start: now.toISOString(),
        period_end: LIFETIME_PERIOD_END,
      })
      .select("monthly_limit_seconds, credits_used_seconds, period_end, credit_scope")
      .single();

    if (insertError || !newCredits) throw insertError ?? new Error("Failed to initialize credits");

    return {
      creditsLimit: newCredits.monthly_limit_seconds,
      creditsUsed: newCredits.credits_used_seconds,
      creditsRemaining: newCredits.monthly_limit_seconds - newCredits.credits_used_seconds,
      creditsScope: "lifetime",
      periodEnd: null,
    };
  }

  if (credits.credit_scope !== "lifetime" || credits.monthly_limit_seconds !== FREE_LIFETIME_CREDITS) {
    const used = Math.min(credits.credits_used_seconds, FREE_LIFETIME_CREDITS);
    const { data: updatedCredits, error: updateError } = await supabase
      .from("user_credits")
      .update({
        monthly_limit_seconds: FREE_LIFETIME_CREDITS,
        credits_used_seconds: used,
        credit_scope: "lifetime",
        period_end: LIFETIME_PERIOD_END,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId)
      .select("monthly_limit_seconds, credits_used_seconds, period_end, credit_scope")
      .single();

    if (updateError || !updatedCredits) throw updateError ?? new Error("Failed to update credits");

    return {
      creditsLimit: updatedCredits.monthly_limit_seconds,
      creditsUsed: updatedCredits.credits_used_seconds,
      creditsRemaining: Math.max(0, updatedCredits.monthly_limit_seconds - updatedCredits.credits_used_seconds),
      creditsScope: "lifetime",
      periodEnd: null,
    };
  }

  return {
    creditsLimit: credits.monthly_limit_seconds,
    creditsUsed: credits.credits_used_seconds,
    creditsRemaining: Math.max(0, credits.monthly_limit_seconds - credits.credits_used_seconds),
    creditsScope: "lifetime",
    periodEnd: null,
  };
}

export async function getOrCreatePerformerMonthlyCredits(
  supabase: CreditClient,
  userId: string
): Promise<CreditBalance> {
  const { data: credits, error } = await supabase
    .from("user_credits")
    .select("monthly_limit_seconds, credits_used_seconds, period_end, credit_scope")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const now = new Date();
  const { periodStart, periodEnd } = currentMonthlyPeriod(now);

  if (!credits) {
    const { data: newCredits, error: insertError } = await supabase
      .from("user_credits")
      .insert({
        user_id: userId,
        monthly_limit_seconds: PERFORMER_MONTHLY_CREDITS,
        credits_used_seconds: 0,
        credit_scope: "monthly",
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("monthly_limit_seconds, credits_used_seconds, period_end, credit_scope")
      .single();

    if (insertError || !newCredits) throw insertError ?? new Error("Failed to initialize credits");

    return {
      creditsLimit: newCredits.monthly_limit_seconds,
      creditsUsed: 0,
      creditsRemaining: newCredits.monthly_limit_seconds,
      creditsScope: "monthly",
      periodEnd: newCredits.period_end,
    };
  }

  const periodExpired = now > new Date(credits.period_end);

  if (credits.credit_scope !== "monthly" || periodExpired) {
    const { data: resetCredits, error: resetError } = await supabase
      .from("user_credits")
      .update({
        monthly_limit_seconds: credits.credit_scope === "monthly"
          ? credits.monthly_limit_seconds
          : PERFORMER_MONTHLY_CREDITS,
        credits_used_seconds: 0,
        credit_scope: "monthly",
        period_start: periodStart,
        period_end: periodEnd,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId)
      .select("monthly_limit_seconds, credits_used_seconds, period_end, credit_scope")
      .single();

    if (resetError || !resetCredits) throw resetError ?? new Error("Failed to reset credits");

    return {
      creditsLimit: resetCredits.monthly_limit_seconds,
      creditsUsed: 0,
      creditsRemaining: resetCredits.monthly_limit_seconds,
      creditsScope: "monthly",
      periodEnd: resetCredits.period_end,
    };
  }

  return {
    creditsLimit: credits.monthly_limit_seconds,
    creditsUsed: credits.credits_used_seconds,
    creditsRemaining: Math.max(0, credits.monthly_limit_seconds - credits.credits_used_seconds),
    creditsScope: "monthly",
    periodEnd: credits.period_end,
  };
}

export async function completeSessionWithCredits(
  supabase: CreditClient,
  sessionId: string,
  endedAt?: string | null
): Promise<CompletedSessionCredits> {
  if (!supabase.rpc) {
    throw new Error("Supabase RPC client is required to complete sessions with credits");
  }

  const { data, error } = await supabase
    .rpc("complete_session_with_credits", {
      p_session_id: sessionId,
      p_ended_at: endedAt ?? null,
    })
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to complete session with credits");

  return {
    sessionId: data.session_id,
    durationSeconds: data.duration_seconds ?? 0,
    creditsChargedSeconds: data.credits_charged_seconds ?? 0,
    creditsUsedSeconds: data.credits_used_seconds ?? null,
    creditsRemaining: data.credits_remaining ?? null,
    alreadyCharged: data.already_charged ?? false,
  };
}
