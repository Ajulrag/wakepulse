import type { Request, Response } from "express";

import {
  deleteAdminService,
  getAdminOverview,
  listAdminServices,
  listAdminUsers,
  updateAdminService,
  updateAdminUser,
} from "../services/admin.service.js";
import {
  getAdminEmailSettings as readAdminEmailSettings,
  saveAdminEmailSettings,
} from "../services/admin-email-settings.service.js";
import { sendAdminTestEmail } from "../services/email.service.js";
import { usersCollection } from "../config/collections.js";
import { ObjectId } from "mongodb";
import { adminEmailSettingsSchema } from "../validation/admin-email.js";
import { getVisitorAnalytics } from "../services/analytics.service.js";
import type { UserRole } from "../types/database.js";

const PAGE_SIZE = 25;

function getPage(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) {
    return null;
  }

  return Number(value);
}

function getSearch(value: unknown): string | null {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string" || value.length > 100) {
    return null;
  }

  return value;
}

export async function getAdminDashboard(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const [overview, analytics] = await Promise.all([
      getAdminOverview(),
      getVisitorAnalytics(14),
    ]);

    res.status(200).json({ success: true, overview, analytics });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load admin dashboard",
    });
  }
}

export async function getAdminUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const search = getSearch(req.query.search);
  const page = getPage(req.query.page);

  if (search === null || page === null) {
    res.status(400).json({
      success: false,
      message: "Invalid user search or page",
    });
    return;
  }

  try {
    const result = await listAdminUsers(search, page, PAGE_SIZE);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("List admin users error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve users",
    });
  }
}

export async function patchAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  if (
    typeof req.body !== "object" ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    res.status(400).json({ success: false, message: "Invalid account update" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const changes: { role?: UserRole; isActive?: boolean } = {};
  const keys = Object.keys(body);

  if (
    keys.length === 0 ||
    keys.some((key) => key !== "role" && key !== "isActive") ||
    (body.role !== undefined &&
      body.role !== "user" &&
      body.role !== "admin") ||
    (body.isActive !== undefined && typeof body.isActive !== "boolean")
  ) {
    res.status(400).json({ success: false, message: "Invalid account update" });
    return;
  }

  const targetId = req.params.id;
  if (typeof targetId !== "string") {
    res.status(400).json({ success: false, message: "Invalid account ID" });
    return;
  }

  if (body.role !== undefined) {
    changes.role = body.role;
  }
  if (body.isActive !== undefined) {
    changes.isActive = body.isActive;
  }

  try {
    const result = await updateAdminUser(req.auth.sub, targetId, changes);

    if (result === "not-found") {
      res.status(404).json({ success: false, message: "Account not found" });
      return;
    }
    if (result === "self") {
      res.status(400).json({
        success: false,
        message: "You cannot change your own admin account",
      });
      return;
    }
    if (result === "last-admin") {
      res.status(409).json({
        success: false,
        message: "At least one active admin account must remain",
      });
      return;
    }

    res.status(200).json({ success: true, user: result });
  } catch (error) {
    console.error("Update admin user error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update account",
    });
  }
}

export async function getAdminServices(
  req: Request,
  res: Response,
): Promise<void> {
  const search = getSearch(req.query.search);
  const page = getPage(req.query.page);

  if (search === null || page === null) {
    res.status(400).json({
      success: false,
      message: "Invalid service search or page",
    });
    return;
  }

  try {
    const result = await listAdminServices(search, page, PAGE_SIZE);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("List admin services error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve services",
    });
  }
}

export async function patchAdminService(
  req: Request,
  res: Response,
): Promise<void> {
  if (
    typeof req.body !== "object" ||
    req.body === null ||
    Array.isArray(req.body) ||
    typeof req.body.enabled !== "boolean" ||
    Object.keys(req.body).length !== 1
  ) {
    res.status(400).json({ success: false, message: "Invalid service update" });
    return;
  }

  const serviceId = req.params.id;
  if (typeof serviceId !== "string") {
    res.status(400).json({ success: false, message: "Invalid service ID" });
    return;
  }

  try {
    const service = await updateAdminService(serviceId, req.body.enabled);
    if (service === "not-found") {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }
    res.status(200).json({ success: true, service });
  } catch (error) {
    console.error("Update admin service error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update service",
    });
  }
}

export async function removeAdminService(
  req: Request,
  res: Response,
): Promise<void> {
  const serviceId = req.params.id;
  if (typeof serviceId !== "string") {
    res.status(400).json({ success: false, message: "Invalid service ID" });
    return;
  }

  try {
    const deleted = await deleteAdminService(serviceId);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete admin service error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to delete service",
    });
  }
}

export async function getAdminAnalytics(
  req: Request,
  res: Response,
): Promise<void> {
  const daysValue = req.query.days ?? "14";
  if (
    typeof daysValue !== "string" ||
    !["7", "14", "30"].includes(daysValue)
  ) {
    res.status(400).json({
      success: false,
      message: "Analytics period must be 7, 14, or 30 days",
    });
    return;
  }

  try {
    const analytics = await getVisitorAnalytics(Number(daysValue));
    res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error("Get admin analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve visitor analytics",
    });
  }
}

export async function getAdminEmailSettings(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const settings = await readAdminEmailSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Get admin email settings error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve email settings",
    });
  }
}

export async function putAdminEmailSettings(
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

  const parsed = adminEmailSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid email settings",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const settings = await saveAdminEmailSettings(
      req.auth.sub,
      parsed.data.senderName,
      parsed.data.senderEmail,
    );
    res.status(200).json({
      success: true,
      message: "Email settings saved",
      settings,
    });
  } catch (error) {
    console.error("Save admin email settings error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to save email settings",
    });
  }
}

export async function postAdminEmailTest(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth || !ObjectId.isValid(req.auth.sub)) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const admin = await usersCollection().findOne({
      _id: new ObjectId(req.auth.sub),
    });
    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
      return;
    }

    await sendAdminTestEmail(admin.email, admin.name);
    res.status(200).json({
      success: true,
      message: "Test email sent to your admin account",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SMTP_CONFIGURATION_MISSING"
    ) {
      res.status(503).json({
        success: false,
        message: "SMTP is not configured on the server",
      });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "ALERT_SENDER_EMAIL_MISSING"
    ) {
      res.status(400).json({
        success: false,
        message: "Configure a sender email address before testing",
      });
      return;
    }

    console.error("Send admin test email error:", error);
    res.status(502).json({
      success: false,
      message: "Unable to send test email",
    });
  }
}
