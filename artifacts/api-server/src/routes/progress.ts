import { Router } from "express";
import { db } from "@workspace/db";
import { wordProgressTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { recordActivity, awardXp, checkAndAwardAchievements } from "../lib/activity";

const router = Router();

router.get("/progress", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const progress = await db.select().from(wordProgressTable).where(eq(wordProgressTable.userId, userId));
  res.json(
    progress.map((p) => ({
      wordId: p.wordId,
      learned: p.learned,
      practiceCount: p.practiceCount,
      score: p.score,
      isFavorite: p.isFavorite,
    }))
  );
});

export default router;
