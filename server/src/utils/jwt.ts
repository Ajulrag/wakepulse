import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import {
  JWT_EXPIRES_IN,
  JWT_SECRET,
} from "../config/auth.js";

export interface AuthTokenPayload {
  sub: string;
  jti: string;
  role: "user" | "admin";
}

export interface GeneratedAccessToken {
  token: string;
  expiresAt: Date;
}

export function generateAccessToken(
  payload: AuthTokenPayload,
): GeneratedAccessToken {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    payload,
    JWT_SECRET,
    options,
  );

  const decoded = jwt.decode(token);

  if (
    !decoded ||
    typeof decoded === "string" ||
    typeof decoded.exp !== "number"
  ) {
    throw new Error("Failed to determine JWT expiration");
  }

  return {
    token,
    expiresAt: new Date(decoded.exp * 1000),
  };
}

export function verifyAccessToken(
  token: string,
): AuthTokenPayload {
  return jwt.verify(
    token,
    JWT_SECRET,
  ) as AuthTokenPayload;
}