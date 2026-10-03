import type { NextFunction, Request, Response } from "express";

import { AUTH_COOKIE_NAME } from "../config/auth.js";
import {
  sessionsCollection,
  usersCollection,
} from "../config/collections.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Read JWT from the HTTP-only cookie
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    // 2. Verify the JWT signature and expiration
    const payload = verifyAccessToken(token);

    // 3. Find the session using the JWT's jti/tokenId
    const session = await sessionsCollection().findOne({
      tokenId: payload.jti,
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Session is no longer valid",
      });

      return;
    }

    // 4. Check session expiration
    if (session.expiresAt <= new Date()) {
      res.status(401).json({
        success: false,
        message: "Session has expired",
      });

      return;
    }

    // 5. Update session activity
    await sessionsCollection().updateOne(
      {
        _id: session._id,
      },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      },
    );

    // 6. Find the user associated with this session
    const user = await usersCollection().findOne({
      _id: session.userId,
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });

      return;
    }

    // 7. Check whether the account is active
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Account is disabled",
      });

      return;
    }

    // 8. Attach authenticated JWT information to the request
    req.auth = payload;

    // 9. Continue to the protected controller
    next();
  } catch (error) {
    // JWT verification errors
    if (
      error instanceof Error &&
      (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });

      return;
    }

    // Unexpected server/database errors
    console.error("Authentication middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Authentication check failed",
    });
  }
}