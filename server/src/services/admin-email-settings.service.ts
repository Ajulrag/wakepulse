import { ObjectId } from "mongodb";

import { adminEmailSettingsCollection } from "../config/collections.js";
import type { AdminEmailSettingsDocument } from "../types/database.js";

const SETTINGS_ID = "global";

export interface AdminEmailSettings {
  senderName: string;
  senderEmail: string;
  smtpConfigured: boolean;
  updatedAt: Date | null;
}

function getDefaultSender(): { senderName: string; senderEmail: string } {
  const configuredFrom = process.env.SMTP_FROM?.trim() ?? "";
  const match = /^(.*?)\s*<([^<>]+)>$/.exec(configuredFrom);

  if (match) {
    return {
      senderName: match[1].trim().replace(/^["']|["']$/g, "") || "WakePulse",
      senderEmail: match[2].trim(),
    };
  }

  return {
    senderName: "WakePulse",
    senderEmail: configuredFrom,
  };
}

function isSmtpConfigured(): boolean {
  const port = Number(process.env.SMTP_PORT || 587);
  return Boolean(
    process.env.SMTP_HOST &&
      Number.isInteger(port) &&
      port > 0 &&
      port <= 65535 &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );
}

function toSettings(
  settings: AdminEmailSettingsDocument | null,
): AdminEmailSettings {
  const defaults = getDefaultSender();

  return {
    senderName: settings?.senderName ?? defaults.senderName,
    senderEmail: settings?.senderEmail ?? defaults.senderEmail,
    smtpConfigured: isSmtpConfigured(),
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function getAdminEmailSettings(): Promise<AdminEmailSettings> {
  const settings = await adminEmailSettingsCollection().findOne({
    _id: SETTINGS_ID,
  });
  return toSettings(settings);
}

export async function getAlertSender(): Promise<{
  senderName: string;
  senderEmail: string;
}> {
  const settings = await getAdminEmailSettings();
  return {
    senderName: settings.senderName,
    senderEmail: settings.senderEmail,
  };
}

export async function saveAdminEmailSettings(
  actorId: string,
  senderName: string,
  senderEmail: string,
): Promise<AdminEmailSettings> {
  if (!ObjectId.isValid(actorId)) {
    throw new Error("INVALID_ADMIN_ID");
  }

  const document: AdminEmailSettingsDocument = {
    _id: SETTINGS_ID,
    senderName,
    senderEmail: senderEmail.toLowerCase(),
    updatedAt: new Date(),
    updatedBy: new ObjectId(actorId),
  };
  const { _id: _settingsId, ...settingsToSave } = document;

  await adminEmailSettingsCollection().updateOne(
    { _id: SETTINGS_ID },
    { $set: settingsToSave },
    { upsert: true },
  );

  return toSettings(document);
}
