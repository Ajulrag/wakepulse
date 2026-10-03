import { Router } from "express";

import {
  createServiceController,
  deleteServiceController,
  getServiceByIdController,
  getUserServicesController,
  updateServiceController,
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

router.patch(
  "/:id",
  requireAuth,
  updateServiceController,
);

router.delete(
  "/:id",
  requireAuth,
  deleteServiceController,
);

export default router;