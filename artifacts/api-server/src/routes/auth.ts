import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable, passwordResetCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  phone: z.string().min(9).max(20),
  fullName: z.string().min(2).max(100),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  phone: z.string().min(9).max(20),
});

const resetPasswordSchema = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6),
  newPassword: z.string().min(6).max(100),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  dailyGoalTarget: z.number().int().refine((n) => [10, 20, 30, 50].includes(n)).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri", details: parsed.error.issues });
    return;
  }

  const { phone, fullName, password } = parsed.data;

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ phone, fullName, passwordHash }).returning();

  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) {
      logger.error({ err }, "Session save error on register");
      res.status(500).json({ error: "Session xatosi" });
      return;
    }
    res.status(201).json({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      subscriptionTier: user.subscriptionTier,
    });
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    return;
  }

  const { phone, password, rememberMe } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Telefon raqami yoki parol noto'g'ri" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Telefon raqami yoki parol noto'g'ri" });
    return;
  }

  req.session.userId = user.id;

  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
  } else {
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
  }

  req.session.save((err) => {
    if (err) {
      logger.error({ err }, "Session save error on login");
      res.status(500).json({ error: "Session xatosi" });
      return;
    }
    res.json({
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      subscriptionTier: user.subscriptionTier,
    });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Session destroy error");
      res.status(500).json({ error: "Chiqishda xatolik" });
      return;
    }
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
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

  res.json({
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    subscriptionTier: user.subscriptionTier,
  });
});

router.post("/auth/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    return;
  }

  const { phone } = parsed.data;
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone)).limit(1);

  if (!user) {
    res.json({ ok: true, message: "Agar bu raqam ro'yxatdan o'tgan bo'lsa, kod yuboriladi" });
    return;
  }

  await db.update(passwordResetCodesTable)
    .set({ used: true })
    .where(and(eq(passwordResetCodesTable.phone, phone), eq(passwordResetCodesTable.used, false)));

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(passwordResetCodesTable).values({ phone, code, expiresAt });

  const isDev = process.env.NODE_ENV !== "production";
  res.json({
    ok: true,
    ...(isDev && { code }),
    message: isDev
      ? "Tasdiqlash kodi yuborildi (dev: kod javobda keladi)"
      : "Tasdiqlash kodi yuborildi",
  });
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    return;
  }

  const { phone, code, newPassword } = parsed.data;

  const [resetCode] = await db
    .select()
    .from(passwordResetCodesTable)
    .where(
      and(
        eq(passwordResetCodesTable.phone, phone),
        eq(passwordResetCodesTable.code, code),
        eq(passwordResetCodesTable.used, false),
        gt(passwordResetCodesTable.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetCode) {
    res.status(400).json({ error: "Kod noto'g'ri yoki muddati o'tgan" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.phone, phone));
  await db.update(passwordResetCodesTable).set({ used: true }).where(eq(passwordResetCodesTable.id, resetCode.id));

  res.json({ ok: true, message: "Parol muvaffaqiyatli yangilandi" });
});

router.patch("/profile", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.dailyGoalTarget !== undefined) updates.dailyGoalTarget = parsed.data.dailyGoalTarget;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "O'zgartirish uchun ma'lumot yo'q" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: updated.id,
    fullName: updated.fullName,
    dailyGoalTarget: updated.dailyGoalTarget,
  });
});

router.patch("/profile/password", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ma'lumotlar noto'g'ri" });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Joriy parol noto'g'ri" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

export default router;
