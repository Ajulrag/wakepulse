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

  const rawStatus = req.query.status;
  const status = rawStatus === undefined ? "all" : rawStatus;
  if (
    status !== "all" &&
    status !== "success" &&
    status !== "failed" &&
    status !== "timeout" &&
    status !== "error"
  ) {
    res.status(400).json({
      success: false,
      message: "History status filter is invalid",
    });
    return;
  }

  const rawSearch = req.query.search;
  if (typeof rawSearch !== "undefined" && typeof rawSearch !== "string") {
    res.status(400).json({
      success: false,
      message: "History search is invalid",
    });
    return;
  }

  const rawSort = req.query.sort;
  const sort =
    rawSort === undefined
      ? "newest"
      : rawSort;
  if (sort !== "newest" && sort !== "oldest") {
    res.status(400).json({
      success: false,
      message: "History sort is invalid",
    });
    return;
  }

  try {
    const history = await getDashboardHistory(
      req.auth.sub,
      limit,
      rawCursor,
      status,
      typeof rawSearch === "string" ? rawSearch : "",
      sort,
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
