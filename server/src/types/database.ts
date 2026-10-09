import type { ObjectId } from "mongodb";

export type UserRole = "user" | "admin";

export interface UserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id?: ObjectId;
  userId: ObjectId;
  tokenId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface PasswordResetDocument {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export type ServiceProvider =
  | "render"
  | "railway"
  | "fly"
  | "koyeb"
  | "vercel"
  | "custom";

export type HttpMethod = "GET" | "HEAD" | "POST";

export type ServiceStatus =
  | "unknown"
  | "online"
  | "offline"
  | "disabled";

export interface ServiceDocument {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  provider: ServiceProvider;
  url: string;
  endpoint: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutSeconds: number;
  enabled: boolean;
  status: ServiceStatus;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastStatusCode: number | null;
  lastResponseTime: number | null;
  lastError: string | null;
  nextCheckAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CheckStatus =
  | "success"
  | "failed"
  | "timeout"
  | "error";

export interface CheckLogDocument {
  _id?: ObjectId;
  serviceId: ObjectId;
  userId: ObjectId;
  status: CheckStatus;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  checkedAt: Date;
  createdAt: Date;
}