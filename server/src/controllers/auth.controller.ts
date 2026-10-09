import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  AUTH_COOKIE_MAX_AGE
} from "../config/auth.js";
import { authenticateUser, registerUser } from "../services/auth.service.js";
import { createSession } from "../services/session.service.js";
import { loginSchema, registerSchema } from "../validation/auth.js";
import { usersCollection } from "../config/collections.js";
import { sessionsCollection } from "../config/collections.js";
import { verifyAccessToken } from "../utils/jwt.js";
import {
  requestPasswordReset,
  resetPassword as updatePasswordFromReset,
} from "../services/password-reset.service.js";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/auth.js";

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

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = forgotPasswordSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid password recovery data",
      errors: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await requestPasswordReset(result.data);
  } catch (error) {
    console.error("Password recovery email delivery failed:", error);
  }

  res.status(200).json({
    success: true,
    message: "If an account exists for that email, a password reset link has been sent.",
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = resetPasswordSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid password reset data",
      errors: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await updatePasswordFromReset(result.data);
    res.status(200).json({
      success: true,
      message: "Password reset successfully. Sign in with your new password.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_OR_EXPIRED_RESET_TOKEN"
    ) {
      res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
      return;
    }

    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to reset password right now. Please try again.",
    });
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });

    return;
  }

  try {
    if (!ObjectId.isValid(req.auth.sub)) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication user",
      });

      return;
    }

    const user = await usersCollection().findOne({
      _id: new ObjectId(req.auth.sub),
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });

      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Account is disabled",
      });

      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve current user",
    });
  }
}

export async function logout(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (token) {
      try {
        const payload = verifyAccessToken(token);

        await sessionsCollection().deleteOne({
          tokenId: payload.jti,
        });
      } catch {
        // Even if the token is invalid or expired,
        // we still clear the authentication cookie.
      }
    }

    res.clearCookie(
      AUTH_COOKIE_NAME,
      authCookieOptions,
    );

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
}