import { Router } from "express";

import {
  createServiceController,
  getServiceByIdController,
  getUserServicesController,
} from "../controllers/service.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  createServiceController,
);

router.get(
  "/",
  requireAuth,
  getUserServicesController,
);

router.get(
  "/:id",
  requireAuth,
  getServiceByIdController,
);

export default router;