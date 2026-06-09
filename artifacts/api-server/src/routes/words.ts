import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, wordProgressTable } from "@workspace/db";
import { ListWordsQueryParams, GetWordParams, MarkWordProgressParams, MarkWordProgressBody } from "@workspace/api-zod";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();

router.get("/words", async (req, res) => {
  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { level, category, search } = parsed.data;

  let query = db.select().from(wordsTable).$dynamic();

  const conditions = [];
  if (level) conditions.push(eq(wordsTable.level, level));
  if (category) conditions.push(eq(wordsTable.category, category));
  if (search) conditions.push(ilike(wordsTable.word, `%${search}%`));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const words = await query.orderBy(wordsTable.level, wordsTable.word);
  res.json(words);
});

router.get("/words/:id", async (req, res) => {
  const parsed = GetWordParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [word] = await db.select().from(wordsTable).where(eq(wordsTable.id, parsed.data.id));
  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.json(word);
});

router.post("/words/:id/progress", async (req, res) => {
  const paramsParsed = MarkWordProgressParams.safeParse(req.params);
  const bodyParsed = MarkWordProgressBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { id } = paramsParsed.data;
  const { correct } = bodyParsed.data;

  const [existing] = await db.select().from(wordProgressTable).where(eq(wordProgressTable.wordId, id));

  if (existing) {
    const newScore = correct
      ? Math.min(100, existing.score + 10)
      : Math.max(0, existing.score - 5);
    const newCount = existing.practiceCount + 1;
    const learned = newScore >= 70;

    const [updated] = await db
      .update(wordProgressTable)
      .set({ score: newScore, practiceCount: newCount, learned, updatedAt: new Date() })
      .where(eq(wordProgressTable.wordId, id))
      .returning();

    res.json({
      wordId: updated.wordId,
      learned: updated.learned,
      practiceCount: updated.practiceCount,
      score: updated.score,
    });
  } else {
    const score = correct ? 10 : 0;
    const [created] = await db
      .insert(wordProgressTable)
      .values({ wordId: id, learned: false, practiceCount: 1, score })
      .returning();

    res.json({
      wordId: created.wordId,
      learned: created.learned,
      practiceCount: created.practiceCount,
      score: created.score,
    });
  }
});

export default router;
