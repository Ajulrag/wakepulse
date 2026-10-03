import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/summary", requireAuth, getDashboardSummaryController);

export default router;