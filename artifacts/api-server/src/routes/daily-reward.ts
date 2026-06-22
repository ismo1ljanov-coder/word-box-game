import { Router } from "express";
import { db } from "@workspace/db";
import { dailyRewardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { awardXp, recordActivity } from "../lib/activity";

const router = Router();

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

router.post("/daily-reward", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const today = todayString();

  const [existing] = await db
    .select()
    .from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, today)))
    .limit(1);

  if (existing) {
    res.json({ alreadyClaimed: true, coinsEarned: existing.coinsEarned });
    return;
  }

  const coinsEarned = 20;
  await db.insert(dailyRewardsTable).values({ userId, claimedDate: today, coinsEarned });
  await recordActivity(userId);
  await awardXp(userId, 5, coinsEarned);

  res.json({ alreadyClaimed: false, coinsEarned });
});

router.get("/daily-reward/status", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const today = todayString();

  const [existing] = await db
    .select()
    .from(dailyRewardsTable)
    .where(and(eq(dailyRewardsTable.userId, userId), eq(dailyRewardsTable.claimedDate, today)))
    .limit(1);

  res.json({
    claimed: !!existing,
    coinsEarned: existing?.coinsEarned ?? 0,
    reward: { coins: 20, xp: 5 },
  });
});

export default router;
