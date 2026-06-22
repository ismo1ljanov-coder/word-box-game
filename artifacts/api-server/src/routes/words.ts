import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, wordProgressTable } from "@workspace/db";
import { ListWordsQueryParams, GetWordParams, MarkWordProgressParams, MarkWordProgressBody, ToggleFavoriteParams } from "@workspace/api-zod";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { recordActivity, awardXp, checkAndAwardAchievements } from "../lib/activity";
import { logEvent } from "../middleware/analytics";

const router = Router();

router.get("/words", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { level, search, favoritesOnly } = parsed.data;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (level) conditions.push(eq(wordsTable.level, level));
  if (category) conditions.push(eq(wordsTable.category, category));
  if (search) conditions.push(ilike(wordsTable.word, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  if (favoritesOnly) {
    const favorites = await db
      .select({
        id: wordsTable.id,
        word: wordsTable.word,
        translation: wordsTable.translation,
        level: wordsTable.level,
        category: wordsTable.category,
        partOfSpeech: wordsTable.partOfSpeech,
        exampleSentence: wordsTable.exampleSentence,
        exampleTranslation: wordsTable.exampleTranslation,
        phonetic: wordsTable.phonetic,
        learned: wordProgressTable.learned,
        practiceCount: wordProgressTable.practiceCount,
        score: wordProgressTable.score,
        isFavorite: wordProgressTable.isFavorite,
      })
      .from(wordsTable)
      .innerJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
      .where(and(whereClause, eq(wordProgressTable.isFavorite, true)))
      .orderBy(wordsTable.word)
      .limit(pageSize)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .innerJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
      .where(and(whereClause, eq(wordProgressTable.isFavorite, true)));

    res.json({
      items: favorites.map((w) => ({ ...w, learned: w.learned ?? false, practiceCount: w.practiceCount ?? 0, score: w.score ?? 0, isFavorite: w.isFavorite ?? false })),
      total: totalResult.count,
      page,
      pageSize,
    });
    return;
  }

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordsTable)
    .where(whereClause);

  const words = await db
    .select({
      id: wordsTable.id,
      word: wordsTable.word,
      translation: wordsTable.translation,
      level: wordsTable.level,
      category: wordsTable.category,
      partOfSpeech: wordsTable.partOfSpeech,
      exampleSentence: wordsTable.exampleSentence,
      exampleTranslation: wordsTable.exampleTranslation,
      phonetic: wordsTable.phonetic,
      learned: wordProgressTable.learned,
      practiceCount: wordProgressTable.practiceCount,
      score: wordProgressTable.score,
      isFavorite: wordProgressTable.isFavorite,
    })
    .from(wordsTable)
    .leftJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
    .where(whereClause)
    .orderBy(wordsTable.level, wordsTable.word)
    .limit(pageSize)
    .offset(offset);

  res.json({
    items: words.map((w) => ({
      ...w,
      learned: w.learned ?? false,
      practiceCount: w.practiceCount ?? 0,
      score: w.score ?? 0,
      isFavorite: w.isFavorite ?? false,
    })),
    total: totalResult.count,
    page,
    pageSize,
  });
});

router.get("/words/:wordId", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = GetWordParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [row] = await db
    .select({
      id: wordsTable.id,
      word: wordsTable.word,
      translation: wordsTable.translation,
      level: wordsTable.level,
      category: wordsTable.category,
      partOfSpeech: wordsTable.partOfSpeech,
      exampleSentence: wordsTable.exampleSentence,
      exampleTranslation: wordsTable.exampleTranslation,
      phonetic: wordsTable.phonetic,
      learned: wordProgressTable.learned,
      practiceCount: wordProgressTable.practiceCount,
      score: wordProgressTable.score,
      isFavorite: wordProgressTable.isFavorite,
    })
    .from(wordsTable)
    .leftJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
    .where(eq(wordsTable.id, parsed.data.wordId));

  if (!row) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.json({
    ...row,
    learned: row.learned ?? false,
    practiceCount: row.practiceCount ?? 0,
    score: row.score ?? 0,
    isFavorite: row.isFavorite ?? false,
  });
});

router.post("/words/:wordId/progress", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const paramsParsed = MarkWordProgressParams.safeParse(req.params);
  const bodyParsed = MarkWordProgressBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { wordId } = paramsParsed.data;
  const { correct } = bodyParsed.data;

  const [existing] = await db
    .select()
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)));

  let result;

  if (existing) {
    const newScore = correct ? Math.min(100, existing.score + 10) : Math.max(0, existing.score - 5);
    const newCount = existing.practiceCount + 1;
    const learned = newScore >= 70;

    const [updated] = await db
      .update(wordProgressTable)
      .set({ score: newScore, practiceCount: newCount, learned, updatedAt: new Date() })
      .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)))
      .returning();

    result = {
      wordId: updated.wordId,
      learned: updated.learned,
      practiceCount: updated.practiceCount,
      score: updated.score,
      isFavorite: updated.isFavorite,
    };
  } else {
    const score = correct ? 10 : 0;
    const [created] = await db
      .insert(wordProgressTable)
      .values({ userId, wordId, learned: false, practiceCount: 1, score, isFavorite: false })
      .returning();

    result = {
      wordId: created.wordId,
      learned: created.learned,
      practiceCount: created.practiceCount,
      score: created.score,
      isFavorite: created.isFavorite,
    };
  }

  logEvent(userId, "word_practiced", { wordId, correct, score: result.score, learned: result.learned });

  await recordActivity(userId);
  // Award 10 XP per correct answer here (single source of truth per answer).
  // Games session completion awards only a +5 bonus (no per-answer XP there).
  if (correct) await awardXp(userId, 10, 0);
  await checkAndAwardAchievements(userId);

  res.json(result);
});

router.post("/words/:wordId/favorite", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = ToggleFavoriteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { wordId } = parsed.data;
  const [existing] = await db
    .select()
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)));

  if (existing) {
    const [updated] = await db
      .update(wordProgressTable)
      .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
      .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)))
      .returning();
    res.json({ wordId, isFavorite: updated.isFavorite });
  } else {
    const [created] = await db
      .insert(wordProgressTable)
      .values({ userId, wordId, learned: false, practiceCount: 0, score: 0, isFavorite: true })
      .returning();
    res.json({ wordId, isFavorite: created.isFavorite });
  }
});

export default router;
