import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { logEvent } from "../middleware/analytics";
import { z } from "zod";

const router = Router();

const eventSchema = z.object({
  eventType: z.string().min(1).max(100),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/analytics/event", requireAuth, (req, res) => {
  const userId = req.user!.id;
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  logEvent(userId, parsed.data.eventType, parsed.data.metadata as Record<string, unknown> | undefined);
  res.json({ ok: true });
});

export default router;
