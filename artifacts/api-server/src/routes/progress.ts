import { Router } from "express";
import { db } from "@workspace/db";
import { wordProgressTable } from "@workspace/db";

const router = Router();

router.get("/progress", async (_req, res) => {
  const progress = await db.select().from(wordProgressTable);
  res.json(
    progress.map((p) => ({
      wordId: p.wordId,
      learned: p.learned,
      practiceCount: p.practiceCount,
      score: p.score,
    }))
  );
});

export default router;
