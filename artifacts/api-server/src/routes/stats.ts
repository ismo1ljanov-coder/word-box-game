import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, wordProgressTable, gameSessionsTable } from "@workspace/db";
import { sql, eq, gte, and } from "drizzle-orm";

const router = Router();

router.get("/stats/summary", async (_req, res) => {
  const [wordCount] = await db.select({ count: sql<number>`count(*)::int` }).from(wordsTable);
  const [learnedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordProgressTable)
    .where(eq(wordProgressTable.learned, true));

  const [sessionCount] = await db.select({ count: sql<number>`count(*)::int` }).from(gameSessionsTable);
  const [avgScoreResult] = await db
    .select({ avg: sql<number>`coalesce(round(avg(score))::int, 0)` })
    .from(gameSessionsTable);

  const [coinsResult] = await db
    .select({ total: sql<number>`coalesce(sum(coins_earned), 0)::int` })
    .from(gameSessionsTable);

  const [favoriteCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordProgressTable)
    .where(eq(wordProgressTable.isFavorite, true));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [dailyGoalResult] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(gte(wordProgressTable.updatedAt, today));

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [weeklyXpResult] = await db
    .select({ total: sql<number>`coalesce(sum(correct_answers) * 5, 0)::int` })
    .from(gameSessionsTable)
    .where(gte(gameSessionsTable.createdAt, weekAgo));

  const totalXp = learnedCount.count * 10 + sessionCount.count * 5;
  const DAILY_GOAL_TARGET = 20;

  res.json({
    totalWords: wordCount.count,
    learnedWords: learnedCount.count,
    totalSessions: sessionCount.count,
    averageScore: avgScoreResult.avg || 0,
    streakDays: 1,
    totalXp,
    totalCoins: coinsResult.total,
    favoriteWords: favoriteCount.count,
    dailyGoalTarget: DAILY_GOAL_TARGET,
    dailyGoalCompleted: Math.min(DAILY_GOAL_TARGET, dailyGoalResult.count),
    weeklyXp: weeklyXpResult.total,
  });
});

router.get("/stats/levels", async (_req, res) => {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

  const results = await Promise.all(
    levels.map(async (level) => {
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(wordsTable)
        .where(eq(wordsTable.level, level));

      const [learned] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(wordProgressTable)
        .innerJoin(wordsTable, eq(wordProgressTable.wordId, wordsTable.id))
        .where(and(eq(wordProgressTable.learned, true), eq(wordsTable.level, level)));

      const totalWords = total.count;
      const learnedWords = learned.count;
      const percentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      return { level, totalWords, learnedWords, percentage };
    })
  );

  res.json(results);
});

export default router;
