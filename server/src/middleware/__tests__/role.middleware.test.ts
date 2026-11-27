import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { requireRole } from "../role.middleware.js";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("requireRole", () => {
  it("rejects requests without an authenticated user", () => {
    const response = createResponse();
    const next = vi.fn();

    requireRole("admin")({} as Request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects authenticated users without the requested role", () => {
    const response = createResponse();
    const next = vi.fn();
    const request = {
      auth: { sub: "user-1", jti: "session-1", role: "user" },
    } as Request;

    requireRole("admin")(request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an authenticated administrator", () => {
    const response = createResponse();
    const next = vi.fn();
    const request = {
      auth: { sub: "admin-1", jti: "session-1", role: "admin" },
    } as Request;

    requireRole("admin")(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
});
