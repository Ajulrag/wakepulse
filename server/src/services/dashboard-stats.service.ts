import { ObjectId } from "mongodb";
import { checkLogsCollection } from "../config/collections.js";

export interface DashboardStats {
  checks24h: number;
  successfulChecks24h: number;
  failedChecks24h: number;
  uptime24h: number;
  averageResponseTime24h: number | null;
}

export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new ObjectId(userId);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [result] = await checkLogsCollection()
    .aggregate<{
      checks24h: number;
      successfulChecks24h: number;
      averageResponseTime24h: number | null;
    }>([
      {
        $match: {
          userId: userObjectId,
          checkedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          checks24h: { $sum: 1 },
          successfulChecks24h: {
            $sum: {
              $cond: [{ $eq: ["$status", "success"] }, 1, 0],
            },
          },
          averageResponseTime24h: {
            $avg: {
              $cond: [
                { $ne: ["$responseTime", null] },
                "$responseTime",
                null,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  if (!result) {
    return {
      checks24h: 0,
      successfulChecks24h: 0,
      failedChecks24h: 0,
      uptime24h: 0,
      averageResponseTime24h: null,
    };
  }

  const failedChecks24h =
    result.checks24h - result.successfulChecks24h;

  const uptime24h =
    result.checks24h > 0
      ? Number(
          (
            (result.successfulChecks24h / result.checks24h) *
            100
          ).toFixed(2),
        )
      : 0;

  return {
    checks24h: result.checks24h,
    successfulChecks24h: result.successfulChecks24h,
    failedChecks24h,
    uptime24h,
    averageResponseTime24h:
      result.averageResponseTime24h !== null
        ? Math.round(result.averageResponseTime24h)
        : null,
  };
}
