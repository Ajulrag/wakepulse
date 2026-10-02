import { ObjectId } from "mongodb";

import { sessionsCollection } from "../config/collections.js";
import type { SessionDocument } from "../types/database.js";
import { generateAccessToken } from "../utils/jwt.js";
import { generateSessionTokenId } from "../utils/session.js";

interface CreateSessionInput {
  userId: string;
  role: "user" | "admin";
}

export interface CreatedSession {
  token: string;
  session: SessionDocument;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<CreatedSession> {
  if (!ObjectId.isValid(input.userId)) {
    throw new Error("INVALID_USER_ID");
  }

  const tokenId = generateSessionTokenId();

  const { token, expiresAt } = generateAccessToken({
    sub: input.userId,
    jti: tokenId,
    role: input.role,
  });

  const now = new Date();

  const session: SessionDocument = {
    userId: new ObjectId(input.userId),
    tokenId,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
  };

  await sessionsCollection().insertOne(session);

  return {
    token,
    session,
  };
}