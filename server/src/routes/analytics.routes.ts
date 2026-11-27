import { Router } from "express";

import { postPageView } from "../controllers/analytics.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

const pageViewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many page views. Please try again later.",
  },
});

router.post("/page-view", pageViewRateLimiter, postPageView);

export default router;
