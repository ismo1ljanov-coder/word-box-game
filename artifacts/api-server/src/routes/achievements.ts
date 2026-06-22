import { Router } from "express";
import { db } from "@workspace/db";
import { achievementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { ACHIEVEMENT_DEFINITIONS } from "../lib/activity";

const router = Router();

router.get("/achievements", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select()
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId))
    .orderBy(achievementsTable.unlockedAt);

  res.json(rows.map((a) => ({
    type: a.type,
    unlockedAt: a.unlockedAt?.toISOString() ?? null,
  })));
});

router.get("/achievements/all", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const rows = await db
    .select({ type: achievementsTable.type, unlockedAt: achievementsTable.unlockedAt })
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, userId));

  const unlockedMap = new Map(rows.map((a) => [a.type, a.unlockedAt]));

  const all = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    type: def.type,
    title: def.title,
    icon: def.icon,
    description: def.description,
    unlocked: unlockedMap.has(def.type),
    unlockedAt: unlockedMap.get(def.type)?.toISOString() ?? null,
  }));

  res.json(all);
});

export default router;
