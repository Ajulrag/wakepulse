import type { Request, Response } from "express";
import { getDashboardActivity } from "../services/dashboard-activity.service.js";

export async function getDashboardActivityController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      message: "Authentication required",
    });
    return;
  }

  try {
    const activity = await getDashboardActivity(req.auth.sub);

    res.status(200).json({
      activity,
    });
  } catch (error) {
    console.error("Failed to load dashboard activity:", error);

    res.status(500).json({
      message: "Failed to load dashboard activity",
    });
  }
}
