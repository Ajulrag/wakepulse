import crypto from "node:crypto";

export function generateSessionTokenId(): string {
  return crypto.randomUUID();
}