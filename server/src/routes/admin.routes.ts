import { Router } from "express";

import {
  getAdminAnalytics,
  getAdminDashboard,
  getAdminServices,
  getAdminUsers,
  patchAdminService,
  patchAdminUser,
  removeAdminService,
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/overview", getAdminDashboard);
router.get("/analytics", getAdminAnalytics);
router.get("/users", getAdminUsers);
router.patch("/users/:id", patchAdminUser);
router.get("/services", getAdminServices);
router.patch("/services/:id", patchAdminService);
router.delete("/services/:id", removeAdminService);

export default router;
