import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, wordProgressTable } from "@workspace/db";
import { ListWordsQueryParams, GetWordParams, MarkWordProgressParams, MarkWordProgressBody, ToggleFavoriteParams } from "@workspace/api-zod";
import { eq, and, ilike, sql, inArray, gte, lte, or, isNull } from "drizzle-orm";
import { requireAuth, TIER_LEVELS } from "../middleware/auth";
import { recordActivity, awardXp, checkAndAwardAchievements } from "../lib/activity";
import { logEvent } from "../middleware/analytics";
import { computeSm2 } from "../lib/sm2";

const router = Router();

router.get("/words", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userTier = req.user!.subscriptionTier;
  const allowedLevels = TIER_LEVELS[userTier] ?? TIER_LEVELS.free;

  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { level, search, favoritesOnly } = parsed.data;
  // learnedOnly must be parsed manually — zod.coerce.boolean() maps "false" → true (JS Boolean coercion)
  const learnedOnly =
    req.query.learnedOnly === "true" ? true :
    req.query.learnedOnly === "false" ? false :
    undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  if (level && !allowedLevels.includes(level)) {
    res.status(403).json({
      error: "Bu daraja sizning tarifingizda mavjud emas",
      requiredTier: ["B1", "B2"].includes(level) ? "premium" : "pro",
    });
    return;
  }

  const conditions = [];
  if (level) {
    conditions.push(eq(wordsTable.level, level));
  } else {
    conditions.push(inArray(wordsTable.level, allowedLevels));
  }
  if (category) conditions.push(eq(wordsTable.category, category));
  if (search) conditions.push(ilike(wordsTable.word, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  if (favoritesOnly && userTier === "free") {
    res.status(403).json({
      error: "Sevimlilar faqat Premium foydalanuvchilar uchun mavjud",
      requiredTier: "premium",
    });
    return;
  }

  if (favoritesOnly) {
    const favWhere = and(whereClause, eq(wordProgressTable.isFavorite, true));
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
      .where(favWhere)
      .orderBy(wordsTable.word)
      .limit(pageSize)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .innerJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
      .where(favWhere);

    res.json({
      items: favorites.map((w) => ({ ...w, learned: w.learned ?? false, practiceCount: w.practiceCount ?? 0, score: w.score ?? 0, isFavorite: w.isFavorite ?? false })),
      total: totalResult.count,
      page,
      pageSize,
    });
    return;
  }

  // learnedOnly=true  → only words the user has marked learned (inner join, learned=true)
  // learnedOnly=false → only words not yet learned (left join, learned IS NULL or false)
  // learnedOnly=undefined → all words (left join, no learned filter)
  if (learnedOnly === true) {
    const learnedWhere = and(whereClause, eq(wordProgressTable.learned, true));
    const learnedWords = await db
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
      .where(learnedWhere)
      .orderBy(wordsTable.level, wordsTable.word)
      .limit(pageSize)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .innerJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
      .where(learnedWhere);

    res.json({
      items: learnedWords.map((w) => ({ ...w, learned: true, practiceCount: w.practiceCount ?? 0, score: w.score ?? 0, isFavorite: w.isFavorite ?? false })),
      total: totalResult.count,
      page,
      pageSize,
    });
    return;
  }

  // Default query (all words or unlearned-only when learnedOnly=false)
  const unlearnedFilter = learnedOnly === false
    ? sql`(${wordProgressTable.learned} IS NULL OR ${wordProgressTable.learned} = false)`
    : undefined;

  const finalWhere = unlearnedFilter ? and(whereClause, unlearnedFilter) : whereClause;

  // For total count with unlearned filter we need the join
  let total: number;
  if (learnedOnly === false) {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .leftJoin(wordProgressTable, and(eq(wordProgressTable.wordId, wordsTable.id), eq(wordProgressTable.userId, userId)))
      .where(finalWhere);
    total = totalResult.count;
  } else {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .where(whereClause);
    total = totalResult.count;
  }

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
    .where(finalWhere)
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
    total,
    page,
    pageSize,
  });
});

router.get("/words/due", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userTier = req.user!.subscriptionTier;
  const allowedLevels = TIER_LEVELS[userTier] ?? TIER_LEVELS.free;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const now = new Date();

  const dueWords = await db
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
      nextReviewAt: wordProgressTable.nextReviewAt,
    })
    .from(wordsTable)
    .innerJoin(
      wordProgressTable,
      and(
        eq(wordProgressTable.wordId, wordsTable.id),
        eq(wordProgressTable.userId, userId)
      )
    )
    .where(
      and(
        inArray(wordsTable.level, allowedLevels),
        or(
          isNull(wordProgressTable.nextReviewAt),
          lte(wordProgressTable.nextReviewAt, now)
        ),
        gte(wordProgressTable.practiceCount, 1)
      )
    )
    .orderBy(wordProgressTable.nextReviewAt)
    .limit(limit);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordsTable)
    .innerJoin(
      wordProgressTable,
      and(
        eq(wordProgressTable.wordId, wordsTable.id),
        eq(wordProgressTable.userId, userId)
      )
    )
    .where(
      and(
        inArray(wordsTable.level, allowedLevels),
        or(
          isNull(wordProgressTable.nextReviewAt),
          lte(wordProgressTable.nextReviewAt, now)
        ),
        gte(wordProgressTable.practiceCount, 1)
      )
    );

  res.json({
    items: dueWords.map((w) => ({
      ...w,
      learned: w.learned ?? false,
      practiceCount: w.practiceCount ?? 0,
      score: w.score ?? 0,
      isFavorite: w.isFavorite ?? false,
      nextReviewAt: w.nextReviewAt?.toISOString() ?? null,
    })),
    total: totalResult.count,
  });
});

router.get("/words/:wordId", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userTier = req.user!.subscriptionTier;
  const allowedLevels = TIER_LEVELS[userTier] ?? TIER_LEVELS.free;

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

  if (!allowedLevels.includes(row.level)) {
    res.status(403).json({
      error: "Bu so'z sizning tarifingizda mavjud emas",
      requiredTier: (["B1", "B2"] as string[]).includes(row.level) ? "premium" : "pro",
    });
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
  const userTier = req.user!.subscriptionTier;
  const allowedLevels = TIER_LEVELS[userTier] ?? TIER_LEVELS.free;

  const paramsParsed = MarkWordProgressParams.safeParse(req.params);
  const bodyParsed = MarkWordProgressBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { wordId } = paramsParsed.data;
  const { correct } = bodyParsed.data;

  const [wordCheck] = await db
    .select({ level: wordsTable.level })
    .from(wordsTable)
    .where(eq(wordsTable.id, wordId));

  if (!wordCheck) {
    res.status(404).json({ error: "So'z topilmadi" });
    return;
  }
  if (!(allowedLevels as readonly string[]).includes(wordCheck.level)) {
    res.status(403).json({
      error: "Bu so'z sizning tarifingizda mavjud emas",
      requiredTier: (["B1", "B2"] as string[]).includes(wordCheck.level) ? "premium" : "pro",
    });
    return;
  }

  const [existing] = await db
    .select()
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)));

  let result;

  if (existing) {
    const newScore = correct ? Math.min(100, existing.score + 10) : Math.max(0, existing.score - 5);
    const newCount = existing.practiceCount + 1;
    const learned = newScore >= 70;

    const sm2 = computeSm2(
      {
        easeFactor: existing.sm2EaseFactor,
        interval: existing.sm2Interval,
        repetitions: existing.sm2Repetitions,
      },
      correct
    );

    const [updated] = await db
      .update(wordProgressTable)
      .set({
        score: newScore,
        practiceCount: newCount,
        learned,
        sm2EaseFactor: sm2.easeFactor,
        sm2Interval: sm2.interval,
        sm2Repetitions: sm2.repetitions,
        nextReviewAt: sm2.nextReviewAt,
        updatedAt: new Date(),
      })
      .where(and(eq(wordProgressTable.wordId, wordId), eq(wordProgressTable.userId, userId)))
      .returning();

    result = {
      wordId: updated.wordId,
      learned: updated.learned,
      practiceCount: updated.practiceCount,
      score: updated.score,
      isFavorite: updated.isFavorite,
      nextReviewAt: updated.nextReviewAt?.toISOString() ?? null,
    };
  } else {
    if (userTier === "free") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [{ dailyCount }] = await db
        .select({ dailyCount: sql<number>`count(*)::int` })
        .from(wordProgressTable)
        .where(and(
          eq(wordProgressTable.userId, userId),
          eq(wordProgressTable.practiceCount, 1),
          gte(wordProgressTable.updatedAt, today)
        ));
      if (dailyCount >= 20) {
        res.status(403).json({
          error: "Bepul tarif uchun kunlik limit: 20 ta yangi so'z. Ertaga davom etishingiz yoki Premium olishingiz mumkin!",
          requiredTier: "premium",
          limitType: "daily_new_words",
        });
        return;
      }
    }

    const score = correct ? 10 : 0;
    const sm2 = computeSm2({ easeFactor: 2.5, interval: 1, repetitions: 0 }, correct);

    const [created] = await db
      .insert(wordProgressTable)
      .values({
        userId,
        wordId,
        learned: false,
        practiceCount: 1,
        score,
        isFavorite: false,
        sm2EaseFactor: sm2.easeFactor,
        sm2Interval: sm2.interval,
        sm2Repetitions: sm2.repetitions,
        nextReviewAt: sm2.nextReviewAt,
      })
      .returning();

    result = {
      wordId: created.wordId,
      learned: created.learned,
      practiceCount: created.practiceCount,
      score: created.score,
      isFavorite: created.isFavorite,
      nextReviewAt: created.nextReviewAt?.toISOString() ?? null,
    };
  }

  logEvent(userId, "word_practiced", { wordId, correct, score: result.score, learned: result.learned });

  await recordActivity(userId);
  if (correct) await awardXp(userId, 10, 0);
  await checkAndAwardAchievements(userId);

  res.json(result);
});

router.post("/words/:wordId/favorite", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userTier = req.user!.subscriptionTier;

  if (userTier === "free") {
    res.status(403).json({
      error: "Sevimlilar faqat Premium foydalanuvchilar uchun mavjud",
      requiredTier: "premium",
    });
    return;
  }

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
