import type { Collection } from "mongodb";

import { getDatabase } from "./database.js";

import type {
  UserDocument,
  SessionDocument,
  ServiceDocument,
  CheckLogDocument,
} from "../types/database.js";

export function usersCollection(): Collection<UserDocument> {
  return getDatabase().collection<UserDocument>("users");
}

export function sessionsCollection(): Collection<SessionDocument> {
  return getDatabase().collection<SessionDocument>("sessions");
}

export function servicesCollection(): Collection<ServiceDocument> {
  return getDatabase().collection<ServiceDocument>("services");
}

export function checkLogsCollection(): Collection<CheckLogDocument> {
  return getDatabase().collection<CheckLogDocument>("check_logs");
}