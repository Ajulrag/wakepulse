import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mockToArray = vi.fn();

vi.mock("../../config/collections.js", () => ({
  checkLogsCollection: vi.fn(() => ({
    aggregate: vi.fn(() => ({
      toArray: mockToArray,
    })),
  })),
}));

import { getDashboardActivity } from "../dashboard-activity.service.js";

describe("dashboard activity", () => {
  it("returns recent activity items", async () => {
    const checkId = new ObjectId();
    const serviceId = new ObjectId();
    const checkedAt = new Date();

    mockToArray.mockResolvedValueOnce([
      {
        _id: checkId,
        serviceId,
        serviceName: "API Server",
        status: "success",
        statusCode: 200,
        responseTime: 245,
        error: null,
        checkedAt,
      },
    ]);

    const activity = await getDashboardActivity(
      "507f1f77bcf86cd799439011",
    );

    expect(activity).toHaveLength(1);
    expect(activity[0]).toEqual({
      id: checkId.toString(),
      serviceId: serviceId.toString(),
      serviceName: "API Server",
      status: "success",
      statusCode: 200,
      responseTime: 245,
      error: null,
      checkedAt,
    });
  });

  it("supports failed checks with an error", async () => {
    const checkId = new ObjectId();
    const serviceId = new ObjectId();

    mockToArray.mockResolvedValueOnce([
      {
        _id: checkId,
        serviceId,
        serviceName: "Backend",
        status: "failed",
        statusCode: 503,
        responseTime: 900,
        error: "Service unavailable",
        checkedAt: new Date(),
      },
    ]);

    const activity = await getDashboardActivity(
      "507f1f77bcf86cd799439011",
    );

    expect(activity[0].status).toBe("failed");
    expect(activity[0].statusCode).toBe(503);
    expect(activity[0].error).toBe("Service unavailable");
  });

  it("returns an empty array when there is no activity", async () => {
    mockToArray.mockResolvedValueOnce([]);

    const activity = await getDashboardActivity(
      "507f1f77bcf86cd799439011",
    );

    expect(activity).toEqual([]);
  });

  it("maps multiple activity records", async () => {
    const firstCheckId = new ObjectId();
    const secondCheckId = new ObjectId();
    const firstServiceId = new ObjectId();
    const secondServiceId = new ObjectId();

    mockToArray.mockResolvedValueOnce([
      {
        _id: firstCheckId,
        serviceId: firstServiceId,
        serviceName: "Frontend",
        status: "success",
        statusCode: 200,
        responseTime: 120,
        error: null,
        checkedAt: new Date(),
      },
      {
        _id: secondCheckId,
        serviceId: secondServiceId,
        serviceName: "Worker",
        status: "timeout",
        statusCode: null,
        responseTime: null,
        error: "Request timed out",
        checkedAt: new Date(),
      },
    ]);

    const activity = await getDashboardActivity(
      "507f1f77bcf86cd799439011",
    );

    expect(activity).toHaveLength(2);
    expect(activity[0].serviceName).toBe("Frontend");
    expect(activity[1].serviceName).toBe("Worker");
    expect(activity[1].status).toBe("timeout");
  });

  it("accepts a custom activity limit", async () => {
    mockToArray.mockResolvedValueOnce([]);

    await getDashboardActivity(
      "507f1f77bcf86cd799439011",
      25,
    );

    expect(mockToArray).toHaveBeenCalled();
  });

  it("caps the activity limit at 50", async () => {
    mockToArray.mockResolvedValueOnce([]);

    await getDashboardActivity(
      "507f1f77bcf86cd799439011",
      100,
    );

    expect(mockToArray).toHaveBeenCalled();
  });

  it("rejects an invalid user ID", async () => {
    await expect(
      getDashboardActivity("invalid-user-id"),
    ).rejects.toThrow("Invalid user ID");
  });
});
