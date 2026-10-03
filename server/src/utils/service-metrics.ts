export interface ServiceMetricCheck {
  status: "success" | "failed" | "timeout" | "error";
  responseTime: number | null;
}

export interface ServiceMetrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  averageResponseTime: number | null;
  minimumResponseTime: number | null;
  maximumResponseTime: number | null;
}

export function calculateServiceMetrics(
  checks: ServiceMetricCheck[],
): ServiceMetrics {
  const totalChecks = checks.length;

  const successfulChecks = checks.filter(
    (check) => check.status === "success",
  ).length;

  const failedChecks = totalChecks - successfulChecks;

  const uptimePercentage =
    totalChecks > 0
      ? Number(((successfulChecks / totalChecks) * 100).toFixed(2))
      : 0;

  const responseTimes = checks
    .map((check) => check.responseTime)
    .filter((value): value is number => value !== null);

  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length,
        )
      : null;

  const minimumResponseTime =
    responseTimes.length > 0
      ? Math.min(...responseTimes)
      : null;

  const maximumResponseTime =
    responseTimes.length > 0
      ? Math.max(...responseTimes)
      : null;

  return {
    totalChecks,
    successfulChecks,
    failedChecks,
    uptimePercentage,
    averageResponseTime,
    minimumResponseTime,
    maximumResponseTime,
  };
}