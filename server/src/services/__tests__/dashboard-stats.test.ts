import { describe, expect, it, vi } from "vitest";

const mockToArray = vi.fn();

vi.mock("../../config/collections.js", () => ({
  checkLogsCollection: vi.fn(() => ({
    aggregate: vi.fn(() => ({
      toArray: mockToArray,
    })),
  })),
}));

import { getDashboardStats } from "../dashboard-stats.service.js";

describe("dashboard statistics", () => {
  it("returns zero statistics when there are no checks", async () => {
    mockToArray.mockResolvedValueOnce([]);

    const stats = await getDashboardStats(
      "507f1f77bcf86cd799439011",
    );

    expect(stats).toEqual({
      checks24h: 0,
      successfulChecks24h: 0,
      failedChecks24h: 0,
      uptime24h: 0,
      averageResponseTime24h: null,
    });
  });

  it("calculates successful and failed checks", async () => {
    mockToArray.mockResolvedValueOnce([
      {
        checks24h: 10,
        successfulChecks24h: 8,
        averageResponseTime24h: 250,
      },
    ]);

    const stats = await getDashboardStats(
      "507f1f77bcf86cd799439011",
    );

    expect(stats.checks24h).toBe(10);
    expect(stats.successfulChecks24h).toBe(8);
    expect(stats.failedChecks24h).toBe(2);
  });

  it("calculates 24 hour uptime percentage", async () => {
    mockToArray.mockResolvedValueOnce([
      {
        checks24h: 20,
        successfulChecks24h: 18,
        averageResponseTime24h: 300,
      },
    ]);

    const stats = await getDashboardStats(
      "507f1f77bcf86cd799439011",
    );

    expect(stats.uptime24h).toBe(90);
  });

  it("rounds the average response time", async () => {
    mockToArray.mockResolvedValueOnce([
      {
        checks24h: 3,
        successfulChecks24h: 3,
        averageResponseTime24h: 123.67,
      },
    ]);

    const stats = await getDashboardStats(
      "507f1f77bcf86cd799439011",
    );

    expect(stats.averageResponseTime24h).toBe(124);
  });

  it("returns null average response time when no response times exist", async () => {
    mockToArray.mockResolvedValueOnce([
      {
        checks24h: 2,
        successfulChecks24h: 0,
        averageResponseTime24h: null,
      },
    ]);

    const stats = await getDashboardStats(
      "507f1f77bcf86cd799439011",
    );

    expect(stats.averageResponseTime24h).toBeNull();
  });

  it("rejects an invalid user ID", async () => {
    await expect(
      getDashboardStats("invalid-user-id"),
    ).rejects.toThrow("Invalid user ID");
  });
});
