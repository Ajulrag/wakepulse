import type { Request, Response } from "express";
import { getDashboardStats } from "../services/dashboard-stats.service.js";

export async function getDashboardStatsController(
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
    const stats = await getDashboardStats(req.auth.sub);

    res.status(200).json({
      stats,
    });
  } catch (error) {
    console.error("Failed to load dashboard statistics:", error);

    res.status(500).json({
      message: "Failed to load dashboard statistics",
    });
  }
}
