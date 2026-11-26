import type { Request, Response } from "express";
import { getDashboardHistory } from "../services/dashboard-activity.service.js";

export async function getDashboardHistoryController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);

  if (
    typeof rawLimit !== "undefined" &&
    (typeof rawLimit !== "string" ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50)
  ) {
    res.status(400).json({
      success: false,
      message: "Limit must be an integer between 1 and 50",
    });
    return;
  }

  const rawCursor = req.query.cursor;
  if (typeof rawCursor !== "undefined" && typeof rawCursor !== "string") {
    res.status(400).json({
      success: false,
      message: "History cursor is invalid",
    });
    return;
  }

  try {
    const history = await getDashboardHistory(
      req.auth.sub,
      limit,
      rawCursor,
    );

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_HISTORY_CURSOR"
    ) {
      res.status(400).json({
        success: false,
        message: "History cursor is invalid",
      });
      return;
    }

    console.error("Failed to load monitoring history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load monitoring history",
    });
  }
}
