import type { Response } from "express";

import {
    AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  authCookieOptions,
} from "../config/auth.js";

export function setAuthCookie(
  res: Response,
  token: string,
): void {
  res.cookie(
    AUTH_COOKIE_NAME,
    token,
    {
      ...authCookieOptions,
      maxAge: AUTH_COOKIE_MAX_AGE,
    },
  );
}

export function clearAuthCookie(
  res: Response,
): void {
  res.clearCookie(
    AUTH_COOKIE_NAME,
    authCookieOptions,
  );
}