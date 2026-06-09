import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, wordProgressTable, gameSessionsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

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

  const totalXp = (learnedCount.count * 10) + (sessionCount.count * 5);

  res.json({
    totalWords: wordCount.count,
    learnedWords: learnedCount.count,
    totalSessions: sessionCount.count,
    averageScore: avgScoreResult.avg || 0,
    streakDays: 1,
    totalXp,
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
        .where(sql`${wordProgressTable.learned} = true AND ${wordsTable.level} = ${level}`);

      const totalWords = total.count;
      const learnedWords = learned.count;
      const percentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      return { level, totalWords, learnedWords, percentage };
    })
  );

  res.json(results);
});

export default router;
