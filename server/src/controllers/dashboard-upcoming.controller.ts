import type { Request, Response } from "express";
import { getDashboardUpcoming } from "../services/dashboard-upcoming.service.js";

export async function getDashboardUpcomingController(
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
    const upcoming = await getDashboardUpcoming(req.auth.sub);

    res.status(200).json({
      upcoming,
    });
  } catch (error) {
    console.error("Failed to load upcoming checks:", error);

    res.status(500).json({
      message: "Failed to load upcoming checks",
    });
  }
}
