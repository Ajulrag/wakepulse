import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mockToArray = vi.fn();

const mockLimit = vi.fn(() => ({
  project: vi.fn(() => ({
    toArray: mockToArray,
  })),
}));

const mockSort = vi.fn(() => ({
  limit: mockLimit,
}));

const mockFind = vi.fn(() => ({
  sort: mockSort,
}));

vi.mock("../../config/collections.js", () => ({
  servicesCollection: vi.fn(() => ({
    find: mockFind,
  })),
}));

import { getDashboardUpcoming } from "../dashboard-upcoming.service.js";

describe("dashboard upcoming checks", () => {
  it("returns upcoming enabled services", async () => {
    const serviceId = new ObjectId();
    const nextCheckAt = new Date("2026-10-04T04:00:00.000Z");

    mockToArray.mockResolvedValueOnce([
      {
        _id: serviceId,
        name: "API Server",
        provider: "render",
        status: "online",
        nextCheckAt,
        intervalSeconds: 300,
      },
    ]);

    const now = new Date("2026-10-04T03:00:00.000Z");

    const upcoming = await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
      10,
      now,
    );

    expect(upcoming).toEqual([
      {
        id: serviceId.toString(),
        name: "API Server",
        provider: "render",
        status: "online",
        nextCheckAt,
        intervalSeconds: 300,
      },
    ]);
  });

  it("returns an empty array when there are no upcoming checks", async () => {
    mockToArray.mockResolvedValueOnce([]);

    const upcoming = await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
    );

    expect(upcoming).toEqual([]);
  });

  it("maps multiple upcoming services", async () => {
    const firstId = new ObjectId();
    const secondId = new ObjectId();

    mockToArray.mockResolvedValueOnce([
      {
        _id: firstId,
        name: "Frontend",
        provider: "vercel",
        status: "online",
        nextCheckAt: new Date("2026-10-04T04:00:00.000Z"),
        intervalSeconds: 300,
      },
      {
        _id: secondId,
        name: "Worker",
        provider: "railway",
        status: "unknown",
        nextCheckAt: new Date("2026-10-04T04:05:00.000Z"),
        intervalSeconds: 600,
      },
    ]);

    const upcoming = await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
    );

    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].name).toBe("Frontend");
    expect(upcoming[1].name).toBe("Worker");
  });

  it("accepts a custom limit", async () => {
    mockToArray.mockResolvedValueOnce([]);

    await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
      25,
    );

    expect(mockLimit).toHaveBeenCalledWith(25);
  });

  it("caps the limit at 50", async () => {
    mockToArray.mockResolvedValueOnce([]);

    await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
      100,
    );

    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it("normalizes a limit below 1 to 1", async () => {
    mockToArray.mockResolvedValueOnce([]);

    await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
      0,
    );

    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("rejects an invalid user ID", async () => {
    await expect(
      getDashboardUpcoming("invalid-user-id"),
    ).rejects.toThrow("Invalid user ID");
  });

  it("passes the user and upcoming-check filters to MongoDB", async () => {
    mockToArray.mockResolvedValueOnce([]);

    const now = new Date("2026-10-04T03:00:00.000Z");

    await getDashboardUpcoming(
      "507f1f77bcf86cd799439011",
      10,
      now,
    );

    expect(mockFind).toHaveBeenCalledWith({
      userId: new ObjectId("507f1f77bcf86cd799439011"),
      enabled: true,
      nextCheckAt: {
        $ne: null,
        $gte: now,
      },
    });

    expect(mockSort).toHaveBeenCalledWith({
      nextCheckAt: 1,
    });
  });
});
