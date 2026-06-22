import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, wordProgressTable, gameSessionsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

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

router.get("/challenges/daily", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const [userRow] = await db
    .select({ dailyGoalTarget: usersTable.dailyGoalTarget })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const target = userRow?.dailyGoalTarget ?? 20;
  const today = startOfDay();

  const [row] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(and(gte(wordProgressTable.updatedAt, today), eq(wordProgressTable.userId, userId)));

  const progress = Math.min(target, row.count);

  res.json({
    id: "daily",
    title: `Bugun ${target} ta so'z o'rganing`,
    description: "Kunlik maqsad",
    type: "daily",
    target,
    progress,
    completed: row.count >= target,
    reward: { coins: 20, xp: 50 },
    expiresAt: endOfDay().toISOString(),
  });
});

router.get("/challenges/weekly", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const weekStart = startOfWeek();
  const target = 10;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gameSessionsTable)
    .where(and(gte(gameSessionsTable.createdAt, weekStart), eq(gameSessionsTable.userId, userId)));

  const progress = Math.min(target, row.count);

  res.json({
    id: "weekly",
    title: "Bu hafta 10 ta o'yin o'ynang",
    description: "Haftalik musobaqa",
    type: "weekly",
    target,
    progress,
    completed: row.count >= target,
    reward: { coins: 100, xp: 200 },
    expiresAt: endOfWeek().toISOString(),
  });
});

router.get("/challenges/monthly", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const monthStart = startOfMonth();
  const target = 200;

  const [row] = await db
    .select({ count: sql<number>`count(distinct word_id)::int` })
    .from(wordProgressTable)
    .where(and(gte(wordProgressTable.updatedAt, monthStart), eq(wordProgressTable.userId, userId)));

  const progress = Math.min(target, row.count);

  res.json({
    id: "monthly",
    title: "Bu oy 200 ta so'z o'rganing",
    description: "Oylik musobaqa",
    type: "monthly",
    target,
    progress,
    completed: row.count >= target,
    reward: { coins: 500, xp: 1000 },
    expiresAt: endOfMonth().toISOString(),
  });
});

export default router;
