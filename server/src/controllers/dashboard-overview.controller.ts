import type { Request, Response } from "express";
import { getDashboardOverview } from "../services/dashboard-overview.service.js";

export async function getDashboardOverviewController(
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
    const dashboard = await getDashboardOverview(req.auth.sub);

    res.status(200).json({
      dashboard,
    });
  } catch (error) {
    console.error("Failed to load dashboard overview:", error);

    res.status(500).json({
      message: "Failed to load dashboard overview",
    });
  }
}