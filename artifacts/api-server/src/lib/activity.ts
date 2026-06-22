import { db } from "@workspace/db";
import { usersTable, wordProgressTable, gameSessionsTable, achievementsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export const ACHIEVEMENT_DEFINITIONS = [
  { type: "first_word", title: "Birinchi so'z", icon: "📖", description: "Birinchi so'zni o'rgandingiz" },
  { type: "ten_words", title: "10 so'z", icon: "🎯", description: "10 ta so'zni o'rgandingiz" },
  { type: "fifty_words", title: "50 so'z", icon: "🌟", description: "50 ta so'zni o'rgandingiz" },
  { type: "hundred_words", title: "100 so'z", icon: "💯", description: "100 ta so'zni o'rgandingiz" },
  { type: "first_game", title: "O'yinchi", icon: "🎮", description: "Birinchi o'yinni o'yndingiz" },
  { type: "ten_games", title: "Tajribali", icon: "🏆", description: "10 ta o'yin sessiyasi" },
  { type: "streak_3", title: "Seriyachi", icon: "🔥", description: "3 kun ketma-ket" },
  { type: "streak_7", title: "Haftalik", icon: "📅", description: "7 kun ketma-ket" },
  { type: "streak_30", title: "Oylik", icon: "🗓️", description: "30 kun ketma-ket" },
  { type: "coins_100", title: "Boylik", icon: "🪙", description: "100 ta tanga yig'dingiz" },
  { type: "perfect_score", title: "Mukammal", icon: "⭐", description: "O'yinda 100% natija" },
  { type: "speed_demon", title: "Tezkor", icon: "⚡", description: "Tezkor testni o'yndingiz" },
] as const;

export type AchievementType = (typeof ACHIEVEMENT_DEFINITIONS)[number]["type"];

export function getBadge(xp: number): string {
  if (xp >= 10000) return "master";
  if (xp >= 5000) return "diamond";
  if (xp >= 2000) return "gold";
  if (xp >= 500) return "silver";
  return "bronze";
}

export function getBadgeLabel(badge: string): string {
  const labels: Record<string, string> = {
    master: "Master 🏅",
    diamond: "Diamond 💎",
    gold: "Gold 🥇",
    silver: "Silver 🥈",
    bronze: "Bronze 🥉",
  };
  return labels[badge] ?? "Bronze 🥉";
}

function dateToUTCString(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split("T")[0];
}

function todayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function recordActivity(userId: number): Promise<void> {
  const [user] = await db.select({
    streakDays: usersTable.streakDays,
    longestStreak: usersTable.longestStreak,
    lastActivityDate: usersTable.lastActivityDate,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) return;

  const today = todayUTC();
  const yesterday = yesterdayUTC();
  const lastActivity = dateToUTCString(user.lastActivityDate);

  if (lastActivity === today) return;

  let newStreak: number;
  if (lastActivity === yesterday) {
    newStreak = user.streakDays + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await db.update(usersTable).set({
    streakDays: newStreak,
    longestStreak: newLongest,
    lastActivityDate: new Date(),
  }).where(eq(usersTable.id, userId));
}

export async function awardXp(userId: number, xp: number, coins: number = 0): Promise<void> {
  if (xp <= 0 && coins <= 0) return;
  await db.update(usersTable).set({
    totalXp: sql`${usersTable.totalXp} + ${xp}`,
    totalCoins: sql`${usersTable.totalCoins} + ${coins}`,
  }).where(eq(usersTable.id, userId));
}

export async function checkAndAwardAchievements(userId: number): Promise<string[]> {
  const [user] = await db.select({
    streakDays: usersTable.streakDays,
    totalCoins: usersTable.totalCoins,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) return [];

  const [learnedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(wordProgressTable)
    .where(and(eq(wordProgressTable.learned, true), eq(wordProgressTable.userId, userId)));

  const [sessionRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(eq(gameSessionsTable.userId, userId));

  const [perfectRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(and(
      eq(gameSessionsTable.userId, userId),
      sql`${gameSessionsTable.totalQuestions} > 0`,
      sql`${gameSessionsTable.correctAnswers} = ${gameSessionsTable.totalQuestions}`,
    ));

  const [speedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(and(eq(gameSessionsTable.userId, userId), eq(gameSessionsTable.gameType, "speed_quiz")));

  const existing = await db
    .select({ type: achievementsTable.type })
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId));
  const existingSet = new Set(existing.map((a) => a.type));

  const conditions: Record<string, boolean> = {
    first_word: learnedRow.count >= 1,
    ten_words: learnedRow.count >= 10,
    fifty_words: learnedRow.count >= 50,
    hundred_words: learnedRow.count >= 100,
    first_game: sessionRow.count >= 1,
    ten_games: sessionRow.count >= 10,
    streak_3: user.streakDays >= 3,
    streak_7: user.streakDays >= 7,
    streak_30: user.streakDays >= 30,
    coins_100: user.totalCoins >= 100,
    perfect_score: perfectRow.count >= 1,
    speed_demon: speedRow.count >= 1,
  };

  const newlyUnlocked: string[] = [];
  for (const [type, condition] of Object.entries(conditions)) {
    if (condition && !existingSet.has(type)) {
      await db.insert(achievementsTable).values({ userId, type });
      newlyUnlocked.push(type);
    }
  }

  return newlyUnlocked;
}
