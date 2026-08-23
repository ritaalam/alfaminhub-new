import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspaceRouter from "./workspace";
import worksheetPlanningRouter from "./worksheet-planning";
import aiChatRouter from "./ai-chat";
import illustrationsRouter from "./illustrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspaceRouter);
router.use(worksheetPlanningRouter);
router.use(aiChatRouter);
router.use(illustrationsRouter);

export default router;
