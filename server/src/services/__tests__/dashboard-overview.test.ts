import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardOverview } from "../dashboard-overview.service.js";

const mocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getDashboardStats: vi.fn(),
  getDashboardActivity: vi.fn(),
  getDashboardUpcoming: vi.fn(),
}));

vi.mock("../../services/dashboard.service.js", () => ({
  getDashboardSummary: mocks.getDashboardSummary,
}));

vi.mock("../../services/dashboard-stats.service.js", () => ({
  getDashboardStats: mocks.getDashboardStats,
}));

vi.mock("../../services/dashboard-activity.service.js", () => ({
  getDashboardActivity: mocks.getDashboardActivity,
}));

vi.mock("../../services/dashboard-upcoming.service.js", () => ({
  getDashboardUpcoming: mocks.getDashboardUpcoming,
}));

describe("getDashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getDashboardSummary.mockResolvedValue({
      totalServices: 4,
      onlineServices: 2,
      offlineServices: 1,
      disabledServices: 1,
      unknownServices: 0,
      totalChecks: 120,
    });

    mocks.getDashboardStats.mockResolvedValue({
      checks24h: 50,
      successfulChecks24h: 47,
      failedChecks24h: 3,
      uptime24h: 94,
      averageResponseTime24h: 320,
    });

    mocks.getDashboardActivity.mockResolvedValue([
      {
        id: "check-1",
        serviceId: "service-1",
        serviceName: "API",
        status: "success",
        statusCode: 200,
        responseTime: 250,
        error: null,
        checkedAt: new Date("2026-10-04T00:00:00.000Z"),
      },
    ]);

    mocks.getDashboardUpcoming.mockResolvedValue([
      {
        id: "service-2",
        name: "Frontend",
        provider: "render",
        status: "online",
        nextCheckAt: new Date("2026-10-04T00:05:00.000Z"),
        intervalSeconds: 300,
      },
    ]);
  });

  it("returns all dashboard sections", async () => {
    const result = await getDashboardOverview("user-123");

    expect(result).toEqual({
      summary: {
        totalServices: 4,
        onlineServices: 2,
        offlineServices: 1,
        disabledServices: 1,
        unknownServices: 0,
        totalChecks: 120,
      },
      stats: {
        checks24h: 50,
        successfulChecks24h: 47,
        failedChecks24h: 3,
        uptime24h: 94,
        averageResponseTime24h: 320,
      },
      activity: [
        expect.objectContaining({
          id: "check-1",
          serviceName: "API",
        }),
      ],
      upcoming: [
        expect.objectContaining({
          id: "service-2",
          name: "Frontend",
        }),
      ],
    });
  });

  it("uses the authenticated user ID for every dashboard section", async () => {
    await getDashboardOverview("user-456");

    expect(mocks.getDashboardSummary).toHaveBeenCalledWith("user-456");
    expect(mocks.getDashboardStats).toHaveBeenCalledWith("user-456");
    expect(mocks.getDashboardActivity).toHaveBeenCalledWith("user-456");
    expect(mocks.getDashboardUpcoming).toHaveBeenCalledWith("user-456");
  });

  it("loads dashboard sections in parallel", async () => {
    await getDashboardOverview("user-789");

    expect(mocks.getDashboardSummary).toHaveBeenCalledTimes(1);
    expect(mocks.getDashboardStats).toHaveBeenCalledTimes(1);
    expect(mocks.getDashboardActivity).toHaveBeenCalledTimes(1);
    expect(mocks.getDashboardUpcoming).toHaveBeenCalledTimes(1);
  });

  it("propagates an error from a dashboard section", async () => {
    const error = new Error("Dashboard stats failed");

    mocks.getDashboardStats.mockRejectedValueOnce(error);

    await expect(
      getDashboardOverview("user-123"),
    ).rejects.toThrow("Dashboard stats failed");
  });
});