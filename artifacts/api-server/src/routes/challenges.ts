import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, wordProgressTable, gameSessionsTable, dailyRewardsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { awardXp } from "../lib/activity";

const router = Router();

function startOfDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(): Date {
  const start = startOfWeek();
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return end;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getPeriodKey(challengeId: string): string {
  const now = new Date();
  if (challengeId === "daily") {
    return `challenge_daily_${now.toISOString().split("T")[0]}`;
  } else if (challengeId === "weekly") {
    const weekStart = startOfWeek();
    return `challenge_weekly_${weekStart.toISOString().split("T")[0]}`;
  } else {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `challenge_monthly_${year}-${month}`;
  }
}

async function getDailyProgress(userId: number, target: number) {
  const today = startOfDay();
  const [row] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(and(gte(wordProgressTable.updatedAt, today), eq(wordProgressTable.userId, userId)));
  return { progress: Math.min(target, row.count), count: row.count };
}

async function getWeeklyProgress(userId: number, target: number) {
  const weekStart = startOfWeek();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(and(gte(gameSessionsTable.createdAt, weekStart), eq(gameSessionsTable.userId, userId)));
  return { progress: Math.min(target, row.count), count: row.count };
}

async function getMonthlyProgress(userId: number, target: number) {
  const monthStart = startOfMonth();
  const [row] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(and(gte(wordProgressTable.updatedAt, monthStart), eq(wordProgressTable.userId, userId)));
  return { progress: Math.min(target, row.count), count: row.count };
}

router.get("/challenges/daily", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const [userRow] = await db
    .select({ dailyGoalTarget: usersTable.dailyGoalTarget })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const target = userRow?.dailyGoalTarget ?? 20;
  const { progress, count } = await getDailyProgress(userId, target);
  const periodKey = getPeriodKey("daily");
  const [claimed] = await db.select().from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, periodKey))).limit(1);

  res.json({
    id: "daily",
    title: `Bugun ${target} ta so'z o'rganing`,
    description: "Kunlik maqsad",
    type: "daily",
    target,
    progress,
    completed: count >= target,
    rewardClaimed: !!claimed,
    reward: { coins: 20, xp: 50 },
    expiresAt: endOfDay().toISOString(),
  });
});

router.get("/challenges/weekly", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const target = 10;
  const { progress, count } = await getWeeklyProgress(userId, target);
  const periodKey = getPeriodKey("weekly");
  const [claimed] = await db.select().from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, periodKey))).limit(1);

  res.json({
    id: "weekly",
    title: "Bu hafta 10 ta o'yin o'ynang",
    description: "Haftalik musobaqa",
    type: "weekly",
    target,
    progress,
    completed: count >= target,
    rewardClaimed: !!claimed,
    reward: { coins: 100, xp: 200 },
    expiresAt: endOfWeek().toISOString(),
  });
});

router.get("/challenges/monthly", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const target = 200;
  const { progress, count } = await getMonthlyProgress(userId, target);
  const periodKey = getPeriodKey("monthly");
  const [claimed] = await db.select().from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, periodKey))).limit(1);

  res.json({
    id: "monthly",
    title: "Bu oy 200 ta so'z o'rganing",
    description: "Oylik musobaqa",
    type: "monthly",
    target,
    progress,
    completed: count >= target,
    rewardClaimed: !!claimed,
    reward: { coins: 500, xp: 1000 },
    expiresAt: endOfMonth().toISOString(),
  });
});

router.post("/challenges/:challengeId/complete", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const challengeId = Array.isArray(req.params.challengeId) ? req.params.challengeId[0] : req.params.challengeId;

  if (!["daily", "weekly", "monthly"].includes(challengeId ?? "")) {
    res.status(400).json({ error: "Noto'g'ri musobaqa turi" });
    return;
  }

  const rewards: Record<string, { coins: number; xp: number; target: number }> = {
    daily: { coins: 20, xp: 50, target: 20 },
    weekly: { coins: 100, xp: 200, target: 10 },
    monthly: { coins: 500, xp: 1000, target: 200 },
  };

  const reward = rewards[challengeId]!;

  const [userRow] = await db
    .select({ dailyGoalTarget: usersTable.dailyGoalTarget })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const dailyTarget = userRow?.dailyGoalTarget ?? 20;
  if (challengeId === "daily") reward.target = dailyTarget;

  let completedCount = 0;
  if (challengeId === "daily") {
    const { count } = await getDailyProgress(userId, reward.target);
    completedCount = count;
  } else if (challengeId === "weekly") {
    const { count } = await getWeeklyProgress(userId, reward.target);
    completedCount = count;
  } else {
    const { count } = await getMonthlyProgress(userId, reward.target);
    completedCount = count;
  }

  if (completedCount < reward.target) {
    res.status(400).json({ error: "Musobaqa hali bajarilmadi", progress: completedCount, target: reward.target });
    return;
  }

  const periodKey = getPeriodKey(challengeId);
  const [existing] = await db
    .select()
    .from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, periodKey)))
    .limit(1);

  if (existing) {
    res.json({ alreadyClaimed: true, coinsEarned: existing.coinsEarned, xpEarned: 0 });
    return;
  }

  await db.insert(dailyRewardsTable).values({ userId, claimedDate: periodKey, coinsEarned: reward.coins });
  await awardXp(userId, reward.xp, reward.coins);

  res.json({ alreadyClaimed: false, coinsEarned: reward.coins, xpEarned: reward.xp });
});

export default router;
