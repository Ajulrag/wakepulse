import type { CookieOptions } from "express";

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined");
}

export const JWT_SECRET = jwtSecret;

export const JWT_EXPIRES_IN = jwtExpiresIn;

export const AUTH_COOKIE_NAME = "wakepulse_auth";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};