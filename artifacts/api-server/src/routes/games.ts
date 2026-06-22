import { Router } from "express";
import { db } from "@workspace/db";
import { wordsTable, gameSessionsTable } from "@workspace/db";
import { GetCrosswordPuzzleQueryParams, GetQuizWordsQueryParams, CreateGameSessionBody } from "@workspace/api-zod";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/games/sessions", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const sessions = await db
    .select()
    .from(gameSessionsTable)
    .where(eq(gameSessionsTable.userId, userId))
    .orderBy(sql`${gameSessionsTable.createdAt} desc`)
    .limit(20);

  res.json(
    sessions.map((s) => ({
      id: s.id,
      gameType: s.gameType,
      level: s.level,
      score: s.score,
      totalQuestions: s.totalQuestions,
      correctAnswers: s.correctAnswers,
      coinsEarned: s.coinsEarned,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
    }))
  );
});

router.post("/games/sessions", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = CreateGameSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const coinsEarned = parsed.data.correctAnswers * 2 + (parsed.data.correctAnswers === parsed.data.totalQuestions ? 10 : 0);
  const [session] = await db
    .insert(gameSessionsTable)
    .values({ ...parsed.data, userId, coinsEarned })
    .returning();

  res.status(201).json({
    id: session.id,
    gameType: session.gameType,
    level: session.level,
    score: session.score,
    totalQuestions: session.totalQuestions,
    correctAnswers: session.correctAnswers,
    coinsEarned: session.coinsEarned,
    createdAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
  });
});

router.get("/games/daily-challenge", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const BONUS_COINS = 50;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [existingSession] = await db
    .select()
    .from(gameSessionsTable)
    .where(
      and(
        eq(gameSessionsTable.userId, userId),
        eq(gameSessionsTable.gameType, "daily_challenge"),
        gte(gameSessionsTable.createdAt, today)
      )
    )
    .limit(1);

  const words = await db.select().from(wordsTable).orderBy(sql`random()`).limit(10);

  if (words.length === 0) {
    res.json({ words: [], completedToday: false, bonusCoins: BONUS_COINS });
    return;
  }

  const allTranslations = await db.select({ translation: wordsTable.translation }).from(wordsTable);
  const translationPool = allTranslations.map((w) => w.translation);

  const questions = words.map((word) => {
    const distractors: string[] = [];
    const shuffled = [...translationPool].filter((t) => t !== word.translation).sort(() => Math.random() - 0.5);
    for (const t of shuffled) {
      if (distractors.length >= 3) break;
      distractors.push(t);
    }
    const options = [word.translation, ...distractors].sort(() => Math.random() - 0.5);
    return {
      wordId: word.id,
      word: word.word,
      correctAnswer: word.translation,
      options,
    };
  });

  res.json({
    questions,
    completedToday: !!existingSession,
    bonusCoins: BONUS_COINS,
  });
});

router.get("/games/quiz", requireAuth, async (req, res) => {
  const parsed = GetQuizWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const count = parsed.data.count ?? 10;
  const level = parsed.data.level;

  let wordsQuery = db.select().from(wordsTable).$dynamic();
  if (level) wordsQuery = wordsQuery.where(eq(wordsTable.level, level));

  const allWords = await wordsQuery.orderBy(sql`random()`).limit(count);

  if (allWords.length === 0) {
    res.json([]);
    return;
  }

  const allTranslations = await db.select({ translation: wordsTable.translation }).from(wordsTable);
  const translationPool = allTranslations.map((w) => w.translation);

  const questions = allWords.map((word) => {
    const distractors: string[] = [];
    const shuffled = [...translationPool].filter((t) => t !== word.translation).sort(() => Math.random() - 0.5);
    for (const t of shuffled) {
      if (distractors.length >= 3) break;
      distractors.push(t);
    }
    const options = [word.translation, ...distractors].sort(() => Math.random() - 0.5);
    return {
      wordId: word.id,
      word: word.word,
      correctAnswer: word.translation,
      options,
    };
  });

  res.json(questions);
});

router.get("/games/crossword", requireAuth, async (req, res) => {
  const parsed = GetCrosswordPuzzleQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const level = parsed.data.level ?? "A1";

  let wordsQuery = db.select().from(wordsTable).$dynamic();
  if (level) wordsQuery = wordsQuery.where(eq(wordsTable.level, level));

  const allWords = await wordsQuery.orderBy(sql`random()`).limit(50);

  const shortWords = allWords
    .filter((w) => w.word.length >= 3 && w.word.length <= 8 && /^[a-zA-Z]+$/.test(w.word))
    .slice(0, 10);

  if (shortWords.length < 3) {
    res.json({ grid: [], clues: [], level });
    return;
  }

  const puzzle = buildCrossword(shortWords.map((w) => ({ word: w.word.toUpperCase(), clue: w.translation })));

  res.json({ ...puzzle, level });
});

interface WordForCrossword {
  word: string;
  clue: string;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

function buildCrossword(words: WordForCrossword[]) {
  const GRID_SIZE = 15;
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const placed: PlacedWord[] = [];

  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);

  for (const { word, clue } of sorted) {
    if (placed.length === 0) {
      const row = 7;
      const col = Math.floor((GRID_SIZE - word.length) / 2);
      placeWord(grid, word, row, col, "across");
      placed.push({ word, clue, row, col, direction: "across" });
      continue;
    }

    let bestPlacement: { row: number; col: number; direction: "across" | "down" } | null = null;

    outer: for (const existing of placed) {
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        for (let j = 0; j < existing.word.length; j++) {
          if (existing.word[j] !== ch) continue;

          if (existing.direction === "across") {
            const row = existing.row - i;
            const col = existing.col + j;
            if (canPlace(grid, word, row, col, "down")) {
              bestPlacement = { row, col, direction: "down" };
              break outer;
            }
          } else {
            const row = existing.row + j;
            const col = existing.col - i;
            if (canPlace(grid, word, row, col, "across")) {
              bestPlacement = { row, col, direction: "across" };
              break outer;
            }
          }
        }
      }
    }

    if (bestPlacement) {
      placeWord(grid, word, bestPlacement.row, bestPlacement.col, bestPlacement.direction);
      placed.push({ word, clue, ...bestPlacement });
    }

    if (placed.length >= 8) break;
  }

  const clues = placed.map((p, idx) => ({
    number: idx + 1,
    direction: p.direction,
    clue: p.clue,
    answer: p.word,
    row: p.row,
    col: p.col,
    length: p.word.length,
  }));

  return { grid, clues };
}

function placeWord(grid: (string | null)[][], word: string, row: number, col: number, direction: "across" | "down") {
  for (let i = 0; i < word.length; i++) {
    if (direction === "across") grid[row][col + i] = word[i];
    else grid[row + i][col] = word[i];
  }
}

function canPlace(grid: (string | null)[][], word: string, row: number, col: number, direction: "across" | "down") {
  const GRID_SIZE = 15;
  if (row < 0 || col < 0) return false;
  if (direction === "across" && col + word.length > GRID_SIZE) return false;
  if (direction === "down" && row + word.length > GRID_SIZE) return false;

  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;
    const cell = grid[r][c];
    if (cell !== null && cell !== word[i]) return false;
  }
  return true;
}

export default router;
