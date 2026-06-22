import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import wordsRouter from "./words";
import progressRouter from "./progress";
import gamesRouter from "./games";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(wordsRouter);
router.use(progressRouter);
router.use(gamesRouter);
router.use(statsRouter);

export default router;
