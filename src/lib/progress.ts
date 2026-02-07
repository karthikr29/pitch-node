import { createClient } from "@/lib/supabase/server";

interface SessionResult {
  sessionId: string;
  userId: string;
  scenarioId: string;
  personaId: string;
  overallScore: number;
  callType: string;
  personaName: string;
}

/**
 * Update user progress after a completed session.
 * Called after session analytics are saved.
 */
export async function updateUserProgress(result: SessionResult) {
  const supabase = await createClient();

  // Get current progress
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", result.userId)
    .single();

  if (!progress) return;

  const today = new Date().toISOString().split("T")[0];
  const lastDate = progress.last_session_date;

  // Calculate streak
  const { currentStreak, longestStreak } = calculateStreak(
    lastDate,
    today,
    progress.current_streak,
    progress.longest_streak
  );

  // Calculate new averages
  const newTotalSessions = progress.total_sessions + 1;
  const newAverageScore =
    (progress.average_score * progress.total_sessions + result.overallScore) /
    newTotalSessions;
  const newBestScore = Math.max(progress.best_score, result.overallScore);

  // Update per-call-type scores
  const scoresByCallType = progress.scores_by_call_type || {};
  const callTypeStats = scoresByCallType[result.callType] || {
    count: 0,
    total: 0,
    best: 0,
  };
  callTypeStats.count += 1;
  callTypeStats.total += result.overallScore;
  callTypeStats.best = Math.max(callTypeStats.best, result.overallScore);
  callTypeStats.average = callTypeStats.total / callTypeStats.count;
  scoresByCallType[result.callType] = callTypeStats;

  // Update per-persona scores
  const scoresByPersona = progress.scores_by_persona || {};
  const personaStats = scoresByPersona[result.personaName] || {
    count: 0,
    total: 0,
    best: 0,
  };
  personaStats.count += 1;
  personaStats.total += result.overallScore;
  personaStats.best = Math.max(personaStats.best, result.overallScore);
  personaStats.average = personaStats.total / personaStats.count;
  scoresByPersona[result.personaName] = personaStats;

  // Save updated progress
  await supabase
    .from("user_progress")
    .update({
      total_sessions: newTotalSessions,
      average_score: Math.round(newAverageScore * 10) / 10,
      best_score: newBestScore,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_session_date: today,
      scores_by_call_type: scoresByCallType,
      scores_by_persona: scoresByPersona,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", result.userId);

  // Check and award achievements
  await checkAchievements(result.userId, {
    totalSessions: newTotalSessions,
    averageScore: newAverageScore,
    bestScore: newBestScore,
    currentStreak,
    overallScore: result.overallScore,
    scoresByCallType,
    scoresByPersona,
    callType: result.callType,
    sessionId: result.sessionId,
  });
}

/**
 * Calculate streak based on last session date.
 */
export function calculateStreak(
  lastSessionDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number
): { currentStreak: number; longestStreak: number } {
  if (!lastSessionDate) {
    // First session ever
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak) };
  }

  const last = new Date(lastSessionDate);
  const now = new Date(today);
  const diffDays = Math.floor(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    // Same day - streak unchanged
    return { currentStreak, longestStreak };
  } else if (diffDays === 1) {
    // Consecutive day - increment streak
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
    };
  } else {
    // Gap - reset streak
    return { currentStreak: 1, longestStreak };
  }
}

interface AchievementContext {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  overallScore: number;
  scoresByCallType: Record<string, { count: number; best: number }>;
  scoresByPersona: Record<string, { count: number }>;
  callType: string;
  sessionId: string;
}

/**
 * Check all unearned achievements and award any that are met.
 */
async function checkAchievements(userId: string, ctx: AchievementContext) {
  const supabase = await createClient();

  // Get all achievements and user's earned ones
  const [{ data: allAchievements }, { data: earnedAchievements }] =
    await Promise.all([
      supabase.from("achievements").select("*"),
      supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId),
    ]);

  if (!allAchievements) return;

  const earnedIds = new Set(
    (earnedAchievements || []).map((a) => a.achievement_id)
  );
  const newAchievements: { user_id: string; achievement_id: string; session_id: string }[] = [];

  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue;

    if (evaluateCriteria(achievement.criteria, ctx)) {
      newAchievements.push({
        user_id: userId,
        achievement_id: achievement.id,
        session_id: ctx.sessionId,
      });
    }
  }

  if (newAchievements.length > 0) {
    await supabase.from("user_achievements").insert(newAchievements);
  }
}

/**
 * Evaluate if an achievement's criteria are met.
 */
export function evaluateCriteria(
  criteria: { type: string; threshold?: number; count?: number; call_type?: string; difficulty?: string },
  ctx: AchievementContext
): boolean {
  switch (criteria.type) {
    case "sessions_count":
      return ctx.totalSessions >= (criteria.threshold || 0);

    case "score_single":
      return ctx.overallScore >= (criteria.threshold || 0);

    case "average_score":
      return ctx.totalSessions >= 5 && ctx.averageScore >= (criteria.threshold || 0);

    case "score_improvement":
      // This would need previous session score comparison - simplified
      return false;

    case "streak_days":
      return ctx.currentStreak >= (criteria.threshold || 0);

    case "unique_personas":
      return Object.keys(ctx.scoresByPersona).length >= (criteria.threshold || 0);

    case "unique_call_types":
      return Object.keys(ctx.scoresByCallType).length >= (criteria.threshold || 0);

    case "unique_difficulties":
      // Would need to track difficulties separately - simplified
      return false;

    case "mastery":
      // Check specific call_type at expert difficulty with high score
      if (criteria.call_type && ctx.callType === criteria.call_type) {
        return ctx.overallScore >= (criteria.threshold || 90);
      }
      return false;

    case "score_streak":
      // Would need consecutive session scores - simplified
      return false;

    default:
      return false;
  }
}
