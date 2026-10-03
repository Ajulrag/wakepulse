import type { Request, Response } from "express";

import { createService } from "../services/service.service.js";
import { createServiceSchema } from "../validation/service.js";

export async function createServiceController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const validationResult =
      createServiceSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Invalid service data",
        errors: validationResult.error.flatten().fieldErrors,
      });

      return;
    }

    const service = await createService(
      req.auth.sub,
      validationResult.data,
    );

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Create service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create service",
    });
  }
}