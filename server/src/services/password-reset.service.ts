import { createHash, randomBytes } from "node:crypto";
import {
  passwordResetsCollection,
  sessionsCollection,
  usersCollection,
} from "../config/collections.js";
import { hashPassword } from "../utils/password.js";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../validation/auth.js";
import { sendPasswordResetEmail } from "./email.service.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getResetUrl(token: string): string {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const url = new URL("/reset-password", clientUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<void> {
  const user = await usersCollection().findOne({
    email: input.email,
    isActive: true,
  });

  if (!user?._id) {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const resets = passwordResetsCollection();

  await resets.deleteMany({ userId: user._id });
  await resets.insertOne({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    createdAt: now,
  });

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl: getResetUrl(token),
    });
  } catch (error) {
    await resets.deleteOne({ tokenHash });
    throw error;
  }
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<void> {
  const reset = await passwordResetsCollection().findOneAndDelete({
    tokenHash: hashToken(input.token),
    expiresAt: { $gt: new Date() },
  });

  if (!reset) {
    throw new Error("INVALID_OR_EXPIRED_RESET_TOKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const result = await usersCollection().updateOne(
    { _id: reset.userId, isActive: true },
    { $set: { passwordHash, updatedAt: new Date() } },
  );

  if (result.matchedCount !== 1) {
    throw new Error("INVALID_OR_EXPIRED_RESET_TOKEN");
  }

  await sessionsCollection().deleteMany({ userId: reset.userId });
}
