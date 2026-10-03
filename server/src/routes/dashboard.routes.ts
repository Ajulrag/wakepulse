import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";
import { getDashboardStatsController } from "../controllers/dashboard-stats.controller.js";
import { getDashboardActivityController } from "../controllers/dashboard-activity.controller.js";
import { getDashboardUpcomingController } from "../controllers/dashboard-upcoming.controller.js";
import { getDashboardOverviewController } from "../controllers/dashboard-overview.controller.js";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryController);
router.get("/stats", requireAuth, getDashboardStatsController);
router.get("/activity", requireAuth, getDashboardActivityController);
router.get("/upcoming", requireAuth, getDashboardUpcomingController);
router.get("/overview", requireAuth, getDashboardOverviewController);

export default router;
