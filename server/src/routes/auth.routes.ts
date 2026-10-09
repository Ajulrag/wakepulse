import { Router } from "express";

import {
    getCurrentUser,
    forgotPassword,
    login,
    logout,
    register,
    resetPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
    authRateLimiter,
    passwordResetRateLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register",authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, resetPassword);

router.get(
    "/me",
    requireAuth,
    getCurrentUser,
);

export default router;