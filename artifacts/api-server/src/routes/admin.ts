import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, wordsTable, wordProgressTable, gameSessionsTable, analyticsEventsTable, levelEnum } from "@workspace/db";
import { eq, ilike, or, sql, and, desc, asc, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { z } from "zod";

const router = Router();

router.use(requireAdmin);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get("/admin/dashboard", async (req, res) => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [activeToday] = await db.select({ count: count() }).from(usersTable)
    .where(sql`${usersTable.lastActiveAt} >= ${todayStart}`);
  const [premiumUsers] = await db.select({ count: count() }).from(usersTable)
    .where(or(eq(usersTable.subscriptionTier, "premium"), eq(usersTable.subscriptionTier, "pro")));
  const [bannedUsers] = await db.select({ count: count() }).from(usersTable)
    .where(eq(usersTable.isBanned, true));
  const [totalWords] = await db.select({ count: count() }).from(wordsTable);
  const [sessionsToday] = await db.select({ count: count() }).from(gameSessionsTable)
    .where(sql`${gameSessionsTable.createdAt} >= ${todayStart}`);
  const [totalSessions] = await db.select({ count: count() }).from(gameSessionsTable);
  const [totalProgress] = await db.select({ count: count() }).from(wordProgressTable)
    .where(eq(wordProgressTable.learned, true));

  res.json({
    totalUsers: totalUsers.count,
    activeToday: activeToday.count,
    premiumUsers: premiumUsers.count,
    bannedUsers: bannedUsers.count,
    totalWords: totalWords.count,
    sessionsToday: sessionsToday.count,
    totalSessions: totalSessions.count,
    masteredWords: totalProgress.count,
  });
});

// ── Users ────────────────────────────────────────────────────────────────────
const userListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().optional(),
});

router.get("/admin/users", async (req, res) => {
  const parsed = userListSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const { page, pageSize, search } = parsed.data;
  const offset = (page - 1) * pageSize;

  const whereClause = search
    ? or(ilike(usersTable.fullName, `%${search}%`), ilike(usersTable.phone, `%${search}%`))
    : undefined;

  const [totalResult] = await db.select({ count: count() }).from(usersTable).where(whereClause);
  const users = await db.select({
    id: usersTable.id,
    phone: usersTable.phone,
    fullName: usersTable.fullName,
    subscriptionTier: usersTable.subscriptionTier,
    isAdmin: usersTable.isAdmin,
    isBanned: usersTable.isBanned,
    streakDays: usersTable.streakDays,
    totalXp: usersTable.totalXp,
    totalCoins: usersTable.totalCoins,
    createdAt: usersTable.createdAt,
    lastActiveAt: usersTable.lastActiveAt,
  }).from(usersTable).where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(pageSize).offset(offset);

  res.json({ items: users, total: totalResult.count, page, pageSize });
});

router.get("/admin/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select({
    id: usersTable.id,
    phone: usersTable.phone,
    fullName: usersTable.fullName,
    subscriptionTier: usersTable.subscriptionTier,
    isAdmin: usersTable.isAdmin,
    isBanned: usersTable.isBanned,
    streakDays: usersTable.streakDays,
    longestStreak: usersTable.longestStreak,
    totalXp: usersTable.totalXp,
    totalCoins: usersTable.totalCoins,
    dailyGoalTarget: usersTable.dailyGoalTarget,
    createdAt: usersTable.createdAt,
    lastActiveAt: usersTable.lastActiveAt,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [sessionsCount] = await db.select({ count: count() }).from(gameSessionsTable)
    .where(eq(gameSessionsTable.userId, userId));
  const [learnedCount] = await db.select({ count: count() }).from(wordProgressTable)
    .where(and(eq(wordProgressTable.userId, userId), eq(wordProgressTable.learned, true)));

  res.json({ ...user, totalSessions: sessionsCount.count, learnedWords: learnedCount.count });
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  subscriptionTier: z.enum(["free", "premium", "pro"]).optional(),
  isAdmin: z.boolean().optional(),
});

router.put("/admin/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (userId === req.user!.id) { res.status(400).json({ error: "Cannot edit yourself" }); return; }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.subscriptionTier !== undefined) updates.subscriptionTier = parsed.data.subscriptionTier;
  if (parsed.data.isAdmin !== undefined) updates.isAdmin = parsed.data.isAdmin;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [updated] = await db.update(usersTable).set({ ...updates, updatedAt: new Date() })
    .where(eq(usersTable.id, userId)).returning({
      id: usersTable.id, fullName: usersTable.fullName,
      subscriptionTier: usersTable.subscriptionTier, isAdmin: usersTable.isAdmin,
    });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

router.post("/admin/users/:id/ban", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (userId === req.user!.id) { res.status(400).json({ error: "Cannot ban yourself" }); return; }

  const [user] = await db.select({ isBanned: usersTable.isBanned }).from(usersTable)
    .where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [updated] = await db.update(usersTable).set({ isBanned: !user.isBanned, updatedAt: new Date() })
    .where(eq(usersTable.id, userId)).returning({ id: usersTable.id, isBanned: usersTable.isBanned });
  res.json(updated);
});

router.post("/admin/users/:id/reset-progress", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(wordProgressTable).where(eq(wordProgressTable.userId, userId));
  await db.delete(gameSessionsTable).where(eq(gameSessionsTable.userId, userId));

  res.json({ ok: true });
});

router.post("/admin/users/:id/grant-premium", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const tierSchema = z.object({ tier: z.enum(["free", "premium", "pro"]) });
  const parsed = tierSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid tier" }); return; }

  const [updated] = await db.update(usersTable).set({ subscriptionTier: parsed.data.tier, updatedAt: new Date() })
    .where(eq(usersTable.id, userId)).returning({ id: usersTable.id, subscriptionTier: usersTable.subscriptionTier });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

router.delete("/admin/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (userId === req.user!.id) { res.status(400).json({ error: "Cannot delete yourself" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

// ── Analytics ────────────────────────────────────────────────────────────────
router.get("/admin/analytics", async (req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dau] = await db.select({ count: count() }).from(usersTable)
    .where(sql`${usersTable.lastActiveAt} >= ${dayAgo}`);
  const [wau] = await db.select({ count: count() }).from(usersTable)
    .where(sql`${usersTable.lastActiveAt} >= ${weekAgo}`);
  const [mau] = await db.select({ count: count() }).from(usersTable)
    .where(sql`${usersTable.lastActiveAt} >= ${monthAgo}`);

  // Top 20 most learned words
  const topLearned = await db.select({
    wordId: wordProgressTable.wordId,
    word: wordsTable.word,
    translation: wordsTable.translation,
    level: wordsTable.level,
    count: count(),
  }).from(wordProgressTable)
    .innerJoin(wordsTable, eq(wordProgressTable.wordId, wordsTable.id))
    .where(eq(wordProgressTable.learned, true))
    .groupBy(wordProgressTable.wordId, wordsTable.word, wordsTable.translation, wordsTable.level)
    .orderBy(desc(count()))
    .limit(20);

  // Top 20 most difficult words (lowest avg score among practiced words)
  const hardestWords = await db.select({
    wordId: wordProgressTable.wordId,
    word: wordsTable.word,
    translation: wordsTable.translation,
    level: wordsTable.level,
    avgScore: sql<number>`round(avg(${wordProgressTable.score}))`,
    practiceCount: count(),
  }).from(wordProgressTable)
    .innerJoin(wordsTable, eq(wordProgressTable.wordId, wordsTable.id))
    .where(sql`${wordProgressTable.practiceCount} > 0`)
    .groupBy(wordProgressTable.wordId, wordsTable.word, wordsTable.translation, wordsTable.level)
    .having(sql`count(*) >= 2`)
    .orderBy(asc(sql`avg(${wordProgressTable.score})`))
    .limit(20);

  // Level completion rates
  const levelRates = await db.select({
    level: wordsTable.level,
    totalWords: count(wordsTable.id),
    learnedWords: sql<number>`count(case when ${wordProgressTable.learned} = true then 1 end)`,
  }).from(wordsTable)
    .leftJoin(wordProgressTable, eq(wordProgressTable.wordId, wordsTable.id))
    .groupBy(wordsTable.level)
    .orderBy(asc(wordsTable.level));

  // Daily active users for last 30 days
  const dauTrend = await db.select({
    date: sql<string>`date_trunc('day', ${usersTable.lastActiveAt})::date::text`,
    count: count(),
  }).from(usersTable)
    .where(sql`${usersTable.lastActiveAt} >= ${monthAgo}`)
    .groupBy(sql`date_trunc('day', ${usersTable.lastActiveAt})`)
    .orderBy(asc(sql`date_trunc('day', ${usersTable.lastActiveAt})`));

  // Average session score
  const [avgSession] = await db.select({
    avgScore: sql<number>`round(avg(${gameSessionsTable.score}))`,
    avgCorrect: sql<number>`round(avg(${gameSessionsTable.correctAnswers}::float / nullif(${gameSessionsTable.totalQuestions}, 0) * 100))`,
  }).from(gameSessionsTable);

  res.json({
    dau: dau.count,
    wau: wau.count,
    mau: mau.count,
    dauTrend,
    topLearned,
    hardestWords,
    levelRates,
    avgSessionScore: avgSession.avgScore ?? 0,
    avgCorrectRate: avgSession.avgCorrect ?? 0,
  });
});

// ── Words ────────────────────────────────────────────────────────────────────
const adminWordsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  search: z.string().optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});

router.get("/admin/words", async (req, res) => {
  const parsed = adminWordsSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const { page, pageSize, search, level } = parsed.data;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (level) conditions.push(eq(wordsTable.level, level));
  if (search) conditions.push(or(ilike(wordsTable.word, `%${search}%`), ilike(wordsTable.translation, `%${search}%`)));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(wordsTable).where(whereClause);
  const words = await db.select().from(wordsTable).where(whereClause)
    .orderBy(asc(wordsTable.level), asc(wordsTable.word))
    .limit(pageSize).offset(offset);

  res.json({ items: words, total: totalResult.count, page, pageSize });
});

const updateWordSchema = z.object({
  word: z.string().min(1).max(200).optional(),
  translation: z.string().min(1).max(200).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  category: z.string().min(1).max(100).optional(),
  partOfSpeech: z.string().optional(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
  phonetic: z.string().optional(),
});

router.put("/admin/words/:id", async (req, res) => {
  const wordId = Number(req.params.id);
  if (isNaN(wordId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = updateWordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  if (Object.keys(parsed.data).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  const [updated] = await db.update(wordsTable).set(parsed.data)
    .where(eq(wordsTable.id, wordId)).returning();
  if (!updated) { res.status(404).json({ error: "Word not found" }); return; }
  res.json(updated);
});

// CSV export
router.get("/admin/words/export-csv", async (_req, res) => {
  const words = await db.select().from(wordsTable).orderBy(asc(wordsTable.level), asc(wordsTable.word));

  const header = "word,translation,level,category,part_of_speech,example_sentence,example_translation,phonetic\n";
  const csvEscape = (s: string | null | undefined) => {
    if (!s) return "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = words.map((w) =>
    [w.word, w.translation, w.level, w.category, w.partOfSpeech, w.exampleSentence, w.exampleTranslation, w.phonetic]
      .map(csvEscape).join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=words.csv");
  res.send(header + rows);
});

// CSV import (accepts text/csv or application/octet-stream body)
router.post("/admin/words/import-csv", async (req, res) => {
  let rawBody = "";
  await new Promise<void>((resolve, reject) => {
    req.setEncoding("utf-8");
    req.on("data", (chunk: string) => { rawBody += chunk; });
    req.on("end", resolve);
    req.on("error", reject);
  });

  const lines = rawBody.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) { res.status(400).json({ error: "CSV must have a header row and at least one data row" }); return; }

  // Parse header to find column indices
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (c === "," && !inQuotes) {
        result.push(current); current = "";
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const getIdx = (name: string) => headers.indexOf(name);

  const wordIdx = getIdx("word");
  const translationIdx = getIdx("translation");
  const levelIdx = getIdx("level");
  const categoryIdx = getIdx("category");

  if (wordIdx < 0 || translationIdx < 0 || levelIdx < 0 || categoryIdx < 0) {
    res.status(400).json({ error: "CSV must have columns: word, translation, level, category" });
    return;
  }

  const rowSchema = z.object({
    word: z.string().min(1).max(200),
    translation: z.string().min(1).max(200),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    category: z.string().min(1).max(100),
    partOfSpeech: z.string().optional(),
    exampleSentence: z.string().optional(),
    exampleTranslation: z.string().optional(),
    phonetic: z.string().optional(),
  });

  const valid: z.infer<typeof rowSchema>[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {
      word: cols[wordIdx]?.trim() ?? "",
      translation: cols[translationIdx]?.trim() ?? "",
      level: cols[levelIdx]?.trim().toUpperCase() ?? "",
      category: cols[categoryIdx]?.trim() ?? "",
      partOfSpeech: cols[getIdx("part_of_speech")]?.trim() || undefined,
      exampleSentence: cols[getIdx("example_sentence")]?.trim() || undefined,
      exampleTranslation: cols[getIdx("example_translation")]?.trim() || undefined,
      phonetic: cols[getIdx("phonetic")]?.trim() || undefined,
    };
    const parsed = rowSchema.safeParse(row);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ row: i + 1, error: parsed.error.issues.map((e) => e.message).join(", ") });
  }

  let imported = 0;
  if (valid.length > 0) {
    const result = await db.insert(wordsTable).values(valid).onConflictDoNothing().returning({ id: wordsTable.id });
    imported = result.length;
  }

  res.json({ imported, skipped: valid.length - imported, errors });
});

export default router;
