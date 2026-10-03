import type { Request, Response } from "express";

import {
  createService,
  deleteService,
  getServiceById,
  getServiceCheckHistory,
  getUserServices,
  pingService,
  updateService,
} from "../services/service.service.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../validation/service.js";

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

export async function getUserServicesController(
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

    const services = await getUserServices(
      req.auth.sub,
    );

    res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Get user services error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve services",
    });
  }
}

export async function getServiceByIdController(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Service ID is required",
      });

      return;
    }

    const service = await getServiceById(
      req.auth.sub,
      id,
    );

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("Get service by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve service",
    });
  }
}

export async function updateServiceController(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Service ID is required",
      });

      return;
    }

    const validationResult =
      updateServiceSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Invalid service update data",
        errors:
          validationResult.error.flatten().fieldErrors,
      });

      return;
    }

    const service = await updateService(
      req.auth.sub,
      id,
      validationResult.data,
    );

    if (!service) {
      res.status(404).json({
        success: false,
        message: "Service not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update service",
    });
  }
}

export async function deleteServiceController(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Service ID is required",
      });

      return;
    }

    const deleted = await deleteService(
      req.auth.sub,
      id,
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Service not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete service",
    });
  }
}

export async function pingServiceController(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Service ID is required",
      });

      return;
    }

    const result = await pingService(
      req.auth.sub,
      id,
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: "Service not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Service ping completed",
      service: result.service,
      check: result.check,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SERVICE_DISABLED"
    ) {
      res.status(400).json({
        success: false,
        message: "Service is disabled",
      });

      return;
    }

    console.error("Ping service error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to ping service",
    });
  }
}

export async function getServiceCheckHistoryController(
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

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Service ID is required",
      });

      return;
    }

    const rawLimit = req.query.limit;

    let limit = 50;

    if (rawLimit !== undefined) {
      const value =
        typeof rawLimit === "string"
          ? Number(rawLimit)
          : NaN;

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 100
      ) {
        res.status(400).json({
          success: false,
          message: "Limit must be an integer between 1 and 100",
        });

        return;
      }

      limit = value;
    }

    const checks = await getServiceCheckHistory(
      req.auth.sub,
      id,
      limit,
    );

    if (!checks) {
      res.status(404).json({
        success: false,
        message: "Service not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      checks,
    });
  } catch (error) {
    console.error(
      "Get service check history error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to retrieve check history",
    });
  }
}