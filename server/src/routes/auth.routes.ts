import { Router } from "express";

import {
    getCurrentUser,
    login,
    logout,
    register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register",authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);

router.get(
    "/me",
    requireAuth,
    getCurrentUser,
);

export default router;