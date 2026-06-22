import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getBadge } from "../lib/activity";

const router = Router();

router.get("/leaderboard", requireAuth, async (req, res) => {
  const topUsers = await db
    .select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      totalXp: usersTable.totalXp,
      streakDays: usersTable.streakDays,
    })
    .from(usersTable)
    .orderBy(sql`${usersTable.totalXp} desc`)
    .limit(20);

  res.json(
    topUsers.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      fullName: u.fullName,
      initials: u.fullName
        .split(" ")
        .map((w: string) => w[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 2),
      totalXp: u.totalXp,
      streakDays: u.streakDays,
      badge: getBadge(u.totalXp),
    }))
  );
});

export default router;
