import { describe, it, expect } from "vitest";

/**
 * Progress tracking utility tests.
 *
 * The project does not yet have a dedicated progress module, so we define
 * the core logic inline and test it here. When the module is created,
 * these pure-function tests will remain valid -- just update the imports.
 */

// --- Pure helper functions (future src/lib/progress.ts) ---

function calculateStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;

  // Sort descending (most recent first)
  const sorted = [...sessionDates]
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].toDateString());
    const previous = new Date(sorted[i + 1].toDateString());
    const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break;
    }
    // diffDays === 0 means same day, skip
  }
  return streak;
}

function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

interface AchievementCriteria {
  type: "sessions_completed" | "streak" | "average_score" | "perfect_score";
  threshold: number;
}

function evaluateAchievement(
  criteria: AchievementCriteria,
  stats: { sessionsCompleted: number; streak: number; averageScore: number; scores: number[] }
): boolean {
  switch (criteria.type) {
    case "sessions_completed":
      return stats.sessionsCompleted >= criteria.threshold;
    case "streak":
      return stats.streak >= criteria.threshold;
    case "average_score":
      return stats.averageScore >= criteria.threshold;
    case "perfect_score":
      return stats.scores.some((s) => s >= criteria.threshold);
    default:
      return false;
  }
}

// --- Tests ---

describe("Progress Tracking - Streak Calculation", () => {
  it("returns 0 for no sessions", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 1 for a single session", () => {
    expect(calculateStreak(["2025-01-15"])).toBe(1);
  });

  it("increments streak for consecutive days", () => {
    const dates = ["2025-01-15", "2025-01-14", "2025-01-13"];
    expect(calculateStreak(dates)).toBe(3);
  });

  it("resets streak to 1 when there is a gap", () => {
    // Gap between Jan 15 and Jan 13 (missing Jan 14)
    const dates = ["2025-01-15", "2025-01-13", "2025-01-12"];
    expect(calculateStreak(dates)).toBe(1);
  });

  it("handles multiple sessions on the same day", () => {
    const dates = [
      "2025-01-15T10:00:00Z",
      "2025-01-15T14:00:00Z",
      "2025-01-14T09:00:00Z",
    ];
    expect(calculateStreak(dates)).toBe(2);
  });

  it("handles unsorted dates correctly", () => {
    const dates = ["2025-01-13", "2025-01-15", "2025-01-14"];
    expect(calculateStreak(dates)).toBe(3);
  });

  it("counts streak of 5 consecutive days", () => {
    const dates = [
      "2025-01-15",
      "2025-01-14",
      "2025-01-13",
      "2025-01-12",
      "2025-01-11",
    ];
    expect(calculateStreak(dates)).toBe(5);
  });
});

describe("Progress Tracking - Score Averaging", () => {
  it("returns 0 for empty scores", () => {
    expect(calculateAverageScore([])).toBe(0);
  });

  it("returns the score itself for a single score", () => {
    expect(calculateAverageScore([85])).toBe(85);
  });

  it("calculates correct average for multiple scores", () => {
    expect(calculateAverageScore([80, 90, 70])).toBe(80);
  });

  it("rounds to two decimal places", () => {
    expect(calculateAverageScore([33, 33, 34])).toBe(33.33);
  });

  it("handles perfect scores", () => {
    expect(calculateAverageScore([100, 100, 100])).toBe(100);
  });

  it("handles zero scores", () => {
    expect(calculateAverageScore([0, 0, 50])).toBe(16.67);
  });
});

describe("Progress Tracking - Achievement Evaluation", () => {
  const defaultStats = {
    sessionsCompleted: 10,
    streak: 5,
    averageScore: 82,
    scores: [75, 80, 85, 90, 82],
  };

  it("awards sessions_completed achievement when threshold met", () => {
    const criteria: AchievementCriteria = { type: "sessions_completed", threshold: 10 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(true);
  });

  it("does not award sessions_completed when below threshold", () => {
    const criteria: AchievementCriteria = { type: "sessions_completed", threshold: 20 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(false);
  });

  it("awards streak achievement when threshold met", () => {
    const criteria: AchievementCriteria = { type: "streak", threshold: 5 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(true);
  });

  it("does not award streak achievement when below threshold", () => {
    const criteria: AchievementCriteria = { type: "streak", threshold: 7 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(false);
  });

  it("awards average_score achievement when threshold met", () => {
    const criteria: AchievementCriteria = { type: "average_score", threshold: 80 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(true);
  });

  it("awards perfect_score achievement when any score meets threshold", () => {
    const criteria: AchievementCriteria = { type: "perfect_score", threshold: 90 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(true);
  });

  it("does not award perfect_score when no score meets threshold", () => {
    const criteria: AchievementCriteria = { type: "perfect_score", threshold: 95 };
    expect(evaluateAchievement(criteria, defaultStats)).toBe(false);
  });
});
