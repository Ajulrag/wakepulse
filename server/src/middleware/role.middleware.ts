import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../types/database.js";

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });

      return;
    }

    next();
  };
}