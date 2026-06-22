import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { User } from "@workspace/db";

// Update lastActiveAt at most once per 5 minutes per user (fire-and-forget)
const lastActiveCache = new Map<number, number>();
function touchLastActive(userId: number) {
  const now = Date.now();
  const last = lastActiveCache.get(userId) ?? 0;
  if (now - last < 5 * 60 * 1000) return;
  lastActiveCache.set(userId, now);
  db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, userId)).catch(() => {});
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Tizimga kirish kerak" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }

  req.user = user;
  touchLastActive(user.id);
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: "Admin huquqi talab qilinadi" });
      return;
    }
    next();
  });
}
