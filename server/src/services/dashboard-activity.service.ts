import { ObjectId } from "mongodb";
import { checkLogsCollection } from "../config/collections.js";

export interface DashboardActivityItem {
  id: string;
  serviceId: string;
  serviceName: string;
  status: "success" | "failed" | "timeout" | "error";
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  checkedAt: Date;
}

export async function getDashboardActivity(
  userId: string,
  limit = 10,
): Promise<DashboardActivityItem[]> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new ObjectId(userId);

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);

  const activity = await checkLogsCollection()
    .aggregate<{
      _id: ObjectId;
      serviceId: ObjectId;
      serviceName: string;
      status: DashboardActivityItem["status"];
      statusCode: number | null;
      responseTime: number | null;
      error: string | null;
      checkedAt: Date;
    }>([
      {
        $match: {
          userId: userObjectId,
        },
      },
      {
        $sort: {
          checkedAt: -1,
        },
      },
      {
        $limit: safeLimit,
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          serviceId: 1,
          serviceName: {
            $ifNull: ["$service.name", "Deleted service"],
          },
          status: 1,
          statusCode: 1,
          responseTime: 1,
          error: 1,
          checkedAt: 1,
        },
      },
    ])
    .toArray();

  return activity.map((item) => ({
    id: item._id.toString(),
    serviceId: item.serviceId.toString(),
    serviceName: item.serviceName,
    status: item.status,
    statusCode: item.statusCode,
    responseTime: item.responseTime,
    error: item.error,
    checkedAt: item.checkedAt,
  }));
}
