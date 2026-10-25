import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { User } from "@workspace/db";

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

// To'lov tizimi o'chirilgan bo'lsa, hamma foydalanuvchi barcha kontentga ega (bepul ishga tushirish davri).
// Yoqish uchun: PAYMENTS_ENABLED=true
export const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true";

export function effectiveTier<T extends string>(tier: T): T | "pro" {
  return PAYMENTS_ENABLED ? tier : "pro";
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

  if (user.isBanned) {
    req.session.destroy(() => {});
    res.status(403).json({ error: "Hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling." });
    return;
  }

  req.user = PAYMENTS_ENABLED ? user : { ...user, subscriptionTier: "pro" };
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

const TIER_RANK: Record<string, number> = { free: 0, premium: 1, pro: 2 };

export function requireTier(minTier: "free" | "premium" | "pro") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Tizimga kirish kerak" });
      return;
    }
    const userRank = TIER_RANK[req.user.subscriptionTier] ?? 0;
    const requiredRank = TIER_RANK[minTier] ?? 0;
    if (userRank < requiredRank) {
      res.status(403).json({
        error: "Bu imkoniyat faqat yuqori tarif uchun mavjud",
        requiredTier: minTier,
      });
      return;
    }
    next();
  };
}

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const TIER_LEVELS: Record<string, readonly CefrLevel[]> = {
  free: ["A1", "A2"],
  premium: ["A1", "A2", "B1", "B2"],
  pro: ["A1", "A2", "B1", "B2", "C1", "C2"],
};

export const PRO_GAME_TYPES = ["anagram", "speed_quiz"];
export const PREMIUM_GAME_TYPES = ["spelling"];
