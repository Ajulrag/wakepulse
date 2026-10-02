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

export function generateAccessToken(
  payload: AuthTokenPayload,
): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyAccessToken(
  token: string,
): AuthTokenPayload {
  return jwt.verify(
    token,
    JWT_SECRET,
  ) as AuthTokenPayload;
}