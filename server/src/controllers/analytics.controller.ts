import type { Request, Response } from "express";

import {
  isValidPageView,
  recordPageView,
} from "../services/analytics.service.js";

export async function postPageView(
  req: Request,
  res: Response,
): Promise<void> {
  if (!isValidPageView(req.body?.visitorId, req.body?.path)) {
    res.status(400).json({
      success: false,
      message: "Invalid page view",
    });
    return;
  }

  try {
    await recordPageView(req.body.visitorId, req.body.path);
    res.status(202).json({ success: true });
  } catch (error) {
    console.error("Record page view error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to record page view",
    });
  }
}
