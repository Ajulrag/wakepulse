import { Router } from "express";

import {
  getAdminAnalytics,
  getAdminDashboard,
  getAdminEmailSettings,
  getAdminServices,
  getAdminUsers,
  patchAdminService,
  patchAdminUser,
  postAdminEmailTest,
  putAdminEmailSettings,
  removeAdminService,
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/overview", getAdminDashboard);
router.get("/analytics", getAdminAnalytics);
router.get("/email-settings", getAdminEmailSettings);
router.put("/email-settings", putAdminEmailSettings);
router.post("/email-settings/test", postAdminEmailTest);
router.get("/users", getAdminUsers);
router.patch("/users/:id", patchAdminUser);
router.get("/services", getAdminServices);
router.patch("/services/:id", patchAdminService);
router.delete("/services/:id", removeAdminService);

export default router;
