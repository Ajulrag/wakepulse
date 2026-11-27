import { Router } from "express";

import {
  getNotifications,
  patchNotificationRead,
  postNotificationsRead,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", getNotifications);
router.patch("/:id/read", patchNotificationRead);
router.post("/read-all", postNotificationsRead);

export default router;
