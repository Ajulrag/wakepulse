import { ObjectId } from "mongodb";
import { checkLogsCollection, servicesCollection } from "../config/collections.js";

export interface DashboardSummary {
  totalServices: number;
  onlineServices: number;
  offlineServices: number;
  disabledServices: number;
  unknownServices: number;
  totalChecks: number;
}

export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new ObjectId(userId);

  const [serviceCounts, totalChecks] = await Promise.all([
    servicesCollection()
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            userId: userObjectId,
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$enabled", false] },
                "disabled",
                "$status",
              ],
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),

    checkLogsCollection().countDocuments({
      userId: userObjectId,
    }),
  ]);

  const summary: DashboardSummary = {
    totalServices: 0,
    onlineServices: 0,
    offlineServices: 0,
    disabledServices: 0,
    unknownServices: 0,
    totalChecks,
  };

  for (const item of serviceCounts) {
    summary.totalServices += item.count;

    switch (item._id) {
      case "online":
        summary.onlineServices += item.count;
        break;

      case "offline":
        summary.offlineServices += item.count;
        break;

      case "disabled":
        summary.disabledServices += item.count;
        break;

      case "unknown":
        summary.unknownServices += item.count;
        break;
    }
  }

  return summary;
}