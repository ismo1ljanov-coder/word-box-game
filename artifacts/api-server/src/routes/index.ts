import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import wordsRouter from "./words";
import progressRouter from "./progress";
import gamesRouter from "./games";
import statsRouter from "./stats";
import achievementsRouter from "./achievements";
import challengesRouter from "./challenges";
import leaderboardRouter from "./leaderboard";
import dailyRewardRouter from "./daily-reward";
import adminRouter from "./admin";
import analyticsRouter from "./analytics";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(stripeRouter);
router.use(wordsRouter);
router.use(progressRouter);
router.use(gamesRouter);
router.use(statsRouter);
router.use(achievementsRouter);
router.use(challengesRouter);
router.use(leaderboardRouter);
router.use(dailyRewardRouter);
router.use(analyticsRouter);
router.use(adminRouter);

export default router;
