import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";
import { getDashboardStatsController } from "../controllers/dashboard-stats.controller.js";
import { getDashboardActivityController } from "../controllers/dashboard-activity.controller.js";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryController);
router.get("/stats", requireAuth, getDashboardStatsController);
router.get("/activity", requireAuth, getDashboardActivityController);

export default router;
