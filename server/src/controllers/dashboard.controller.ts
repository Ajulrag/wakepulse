import type { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboard.service.js";

export async function getDashboardSummaryController(
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
    const summary = await getDashboardSummary(req.auth.sub);

    res.status(200).json({
      summary,
    });
  } catch (error) {
    console.error("Failed to load dashboard summary:", error);

    res.status(500).json({
      message: "Failed to load dashboard summary",
    });
  }
}