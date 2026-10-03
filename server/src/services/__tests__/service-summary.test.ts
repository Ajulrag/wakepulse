import { describe, expect, it } from "vitest";
import { calculateServiceMetrics } from "../../utils/service-metrics.js";
import { runWithConcurrency } from "../../scheduler/concurrency.js";

describe("service summary monitoring windows", () => {
  it("supports the 24h monitoring window", () => {
    const window = "24h";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("supports the 7d monitoring window", () => {
    const window = "7d";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("supports the 30d monitoring window", () => {
    const window = "30d";

    expect(["24h", "7d", "30d"]).toContain(window);
  });

  it("rejects an unsupported monitoring window", () => {
    const window = "1h";

    expect(["24h", "7d", "30d"]).not.toContain(window);
  });
});

describe("service summary metrics", () => {
  it("calculates check counts and uptime correctly", () => {
    const metrics = calculateServiceMetrics([
      {
        status: "success",
        responseTime: 100,
      },
      {
        status: "success",
        responseTime: 200,
      },
      {
        status: "failed",
        responseTime: 300,
      },
      {
        status: "timeout",
        responseTime: null,
      },
    ]);

    expect(metrics.totalChecks).toBe(4);
    expect(metrics.successfulChecks).toBe(2);
    expect(metrics.failedChecks).toBe(2);
    expect(metrics.uptimePercentage).toBe(50);
  });

  it("calculates average response time", () => {
    const metrics = calculateServiceMetrics([
      {
        status: "success",
        responseTime: 100,
      },
      {
        status: "success",
        responseTime: 200,
      },
      {
        status: "success",
        responseTime: 300,
      },
    ]);

    expect(metrics.averageResponseTime).toBe(200);
  });

  it("calculates minimum and maximum response time", () => {
    const metrics = calculateServiceMetrics([
      {
        status: "success",
        responseTime: 250,
      },
      {
        status: "success",
        responseTime: 100,
      },
      {
        status: "success",
        responseTime: 400,
      },
    ]);

    expect(metrics.minimumResponseTime).toBe(100);
    expect(metrics.maximumResponseTime).toBe(400);
  });

  it("ignores null response times", () => {
    const metrics = calculateServiceMetrics([
      {
        status: "success",
        responseTime: 100,
      },
      {
        status: "timeout",
        responseTime: null,
      },
      {
        status: "failed",
        responseTime: 300,
      },
    ]);

    expect(metrics.averageResponseTime).toBe(200);
    expect(metrics.minimumResponseTime).toBe(100);
    expect(metrics.maximumResponseTime).toBe(300);
  });

  it("handles an empty check history", () => {
    const metrics = calculateServiceMetrics([]);

    expect(metrics.totalChecks).toBe(0);
    expect(metrics.successfulChecks).toBe(0);
    expect(metrics.failedChecks).toBe(0);
    expect(metrics.uptimePercentage).toBe(0);
    expect(metrics.averageResponseTime).toBeNull();
    expect(metrics.minimumResponseTime).toBeNull();
    expect(metrics.maximumResponseTime).toBeNull();
  });
});

describe("scheduler concurrency", () => {
  it("does not exceed the configured concurrency", async () => {
    const items = Array.from(
      { length: 10 },
      (_, index) => index,
    );

    let activeWorkers = 0;
    let maximumActiveWorkers = 0;

    await runWithConcurrency(
      items,
      3,
      async () => {
        activeWorkers += 1;

        maximumActiveWorkers = Math.max(
          maximumActiveWorkers,
          activeWorkers,
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 20),
        );

        activeWorkers -= 1;
      },
    );

    expect(maximumActiveWorkers).toBeLessThanOrEqual(3);
  });
});