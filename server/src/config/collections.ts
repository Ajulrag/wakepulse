import type { Collection } from "mongodb";

import { getDatabase } from "./database.js";

import type {
  UserDocument,
  SessionDocument,
  ServiceDocument,
  CheckLogDocument,
  PasswordResetDocument,
  PageViewDocument,
  NotificationDocument,
  AdminEmailSettingsDocument,
} from "../types/database.js";

export function usersCollection(): Collection<UserDocument> {
  return getDatabase().collection<UserDocument>("users");
}

export function sessionsCollection(): Collection<SessionDocument> {
  return getDatabase().collection<SessionDocument>("sessions");
}

export function passwordResetsCollection(): Collection<PasswordResetDocument> {
  return getDatabase().collection<PasswordResetDocument>("password_resets");
}

export function servicesCollection(): Collection<ServiceDocument> {
  return getDatabase().collection<ServiceDocument>("services");
}

export function checkLogsCollection(): Collection<CheckLogDocument> {
  return getDatabase().collection<CheckLogDocument>("check_logs");
}

export function pageViewsCollection(): Collection<PageViewDocument> {
  return getDatabase().collection<PageViewDocument>("page_views");
}

export function notificationsCollection(): Collection<NotificationDocument> {
  return getDatabase().collection<NotificationDocument>("notifications");
}

export function adminEmailSettingsCollection(): Collection<AdminEmailSettingsDocument> {
  return getDatabase().collection<AdminEmailSettingsDocument>("admin_email_settings");
}