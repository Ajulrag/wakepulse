import type { Request, Response } from "express";

import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
} from "../services/notification.service.js";

export async function getNotifications(
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

  try {
    const inbox = await listUserNotifications(req.auth.sub);
    res.status(200).json({ success: true, ...inbox });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications",
    });
  }
}

export async function patchNotificationRead(
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

  const notificationId = req.params.id;
  if (typeof notificationId !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid notification ID",
    });
    return;
  }

  try {
    const updated = await markUserNotificationRead(
      req.auth.sub,
      notificationId,
    );
    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
}

export async function postNotificationsRead(
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

  try {
    await markAllUserNotificationsRead(req.auth.sub);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
}
