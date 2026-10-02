import type { Request, Response } from "express";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  AUTH_COOKIE_MAX_AGE
} from "../config/auth.js";
import { authenticateUser, registerUser } from "../services/auth.service.js";
import { createSession } from "../services/session.service.js";
import { loginSchema, registerSchema } from "../validation/auth.js";

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid registration data",
      errors: result.error.flatten().fieldErrors,
    });

    return;
  }

  try {
    const user = await registerUser(result.data);

    const { token } = await createSession({
      userId: user.id,
      role: user.role,
    });

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      {
        ...authCookieOptions,
        maxAge: AUTH_COOKIE_MAX_AGE,
      },
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_USER_ID"
    ) {
      res.status(500).json({
        success: false,
        message: "Unable to create authentication session",
      });

      return;
    }

    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid login data",
      errors: result.error.flatten().fieldErrors,
    });

    return;
  }

  try {
    const user = await authenticateUser(result.data);

    const { token } = await createSession({
      userId: user.id,
      role: user.role,
    });

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      {
        ...authCookieOptions,
        maxAge: AUTH_COOKIE_MAX_AGE,
      },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message === "ACCOUNT_DISABLED"
    ) {
      res.status(403).json({
        success: false,
        message: "This account is disabled",
      });

      return;
    }

    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
}