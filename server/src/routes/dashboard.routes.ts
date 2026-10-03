import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";
import { getDashboardStatsController } from "../controllers/dashboard-stats.controller.js";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryController);
router.get("/stats", requireAuth, getDashboardStatsController);

export default router;
