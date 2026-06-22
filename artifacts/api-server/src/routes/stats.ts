import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, wordsTable, wordProgressTable, gameSessionsTable } from "@workspace/db";
import { sql, eq, gte, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/stats/summary", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const [userRow] = await db
    .select({
      streakDays: usersTable.streakDays,
      longestStreak: usersTable.longestStreak,
      totalXp: usersTable.totalXp,
      totalCoins: usersTable.totalCoins,
      dailyGoalTarget: usersTable.dailyGoalTarget,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [wordCount] = await db.select({ count: sql<number>`count(*)::int` }).from(wordsTable);

  const [learnedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.learned, true), eq(wordProgressTable.userId, userId)));

  const [sessionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(eq(gameSessionsTable.userId, userId));

  const [avgScoreResult] = await db
    .select({ avg: sql<number>`coalesce(round(avg(score))::int, 0)` })
    .from(gameSessionsTable)
    .where(eq(gameSessionsTable.userId, userId));

  const [favoriteCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.isFavorite, true), eq(wordProgressTable.userId, userId)));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [dailyGoalResult] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(and(gte(wordProgressTable.updatedAt, today), eq(wordProgressTable.userId, userId)));

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [weeklyXpResult] = await db
    .select({ total: sql<number>`coalesce(sum(correct_answers) * 10 + count(*) * 5, 0)::int` })
    .from(gameSessionsTable)
    .where(and(gte(gameSessionsTable.createdAt, weekAgo), eq(gameSessionsTable.userId, userId)));

  const dailyGoalTarget = userRow?.dailyGoalTarget ?? 20;

  res.json({
    totalWords: wordCount.count,
    learnedWords: learnedCount.count,
    totalSessions: sessionCount.count,
    averageScore: avgScoreResult.avg || 0,
    streakDays: userRow?.streakDays ?? 0,
    longestStreak: userRow?.longestStreak ?? 0,
    totalXp: userRow?.totalXp ?? 0,
    totalCoins: userRow?.totalCoins ?? 0,
    favoriteWords: favoriteCount.count,
    dailyGoalTarget,
    dailyGoalCompleted: Math.min(dailyGoalTarget, dailyGoalResult.count),
    weeklyXp: weeklyXpResult.total || 0,
  });
});

router.get("/stats/levels", requireAuth, async (req, res) => {
  const userId = req.user!.id;
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
        .where(and(eq(wordProgressTable.learned, true), eq(wordsTable.level, level), eq(wordProgressTable.userId, userId)));

      const totalWords = total.count;
      const learnedWords = learned.count;
      const percentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      return { level, totalWords, learnedWords, percentage };
    })
  );

  res.json(results);
});

export default router;
