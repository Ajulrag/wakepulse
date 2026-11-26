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

export interface DashboardHistoryPage {
  items: DashboardActivityItem[];
  nextCursor: string | null;
  total: number;
}

interface ActivityCursor {
  checkedAt: Date;
  id: ObjectId;
}

function decodeCursor(cursor: string): ActivityCursor {
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(cursor)) {
    throw new Error("INVALID_HISTORY_CURSOR");
  }

  try {
    const value: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (
      typeof value !== "object" ||
      value === null ||
      !("checkedAt" in value) ||
      !("id" in value) ||
      typeof value.checkedAt !== "string" ||
      typeof value.id !== "string"
    ) {
      throw new Error("INVALID_HISTORY_CURSOR");
    }

    const checkedAt = new Date(value.checkedAt);
    if (
      Number.isNaN(checkedAt.getTime()) ||
      checkedAt.toISOString() !== value.checkedAt ||
      !ObjectId.isValid(value.id)
    ) {
      throw new Error("INVALID_HISTORY_CURSOR");
    }

    return {
      checkedAt,
      id: new ObjectId(value.id),
    };
  } catch {
    throw new Error("INVALID_HISTORY_CURSOR");
  }
}

function encodeCursor(item: {
  id: ObjectId;
  checkedAt: Date;
}): string {
  return Buffer.from(
    JSON.stringify({
      checkedAt: item.checkedAt.toISOString(),
      id: item.id.toString(),
    }),
  ).toString("base64url");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getDashboardActivity(
  userId: string,
  limit = 10,
): Promise<DashboardActivityItem[]> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new ObjectId(userId);

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);

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

export async function getDashboardHistory(
  userId: string,
  limit = 20,
  cursor?: string,
  status?: DashboardActivityItem["status"] | "all",
  search?: string,
  sort: "newest" | "oldest" = "newest",
): Promise<DashboardHistoryPage> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const cursorValue = cursor ? decodeCursor(cursor) : null;
  const userObjectId = new ObjectId(userId);
  const safeStatus = status && status !== "all" ? status : null;
  const safeSearch = typeof search === "string"
    ? escapeRegex(search.trim().slice(0, 100))
    : "";
  const isNewest = sort !== "oldest";

  const filteredMatch: Record<string, unknown> = {
    userId: userObjectId,
  };

  if (safeStatus) {
    filteredMatch.status = safeStatus;
  }

  const pipelinePrefix: Record<string, unknown>[] = [
    { $match: filteredMatch },
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
  ];

  if (safeSearch) {
    pipelinePrefix.push({
      $match: {
        $or: [
          { "service.name": { $regex: safeSearch, $options: "i" } },
          { status: { $regex: safeSearch, $options: "i" } },
        ],
      },
    });
  }

  const countPipeline = [
    ...pipelinePrefix,
    { $count: "total" },
  ];
  const [countResult] = await checkLogsCollection()
    .aggregate<{ total: number }>(countPipeline)
    .toArray();
  const total = countResult?.total ?? 0;

  const paginatedMatch: Record<string, unknown> = {};
  if (cursorValue) {
    paginatedMatch.$or = isNewest
      ? [
          { checkedAt: { $lt: cursorValue.checkedAt } },
          {
            checkedAt: cursorValue.checkedAt,
            _id: { $lt: cursorValue.id },
          },
        ]
      : [
          { checkedAt: { $gt: cursorValue.checkedAt } },
          {
            checkedAt: cursorValue.checkedAt,
            _id: { $gt: cursorValue.id },
          },
        ];
  }

  const results = await checkLogsCollection()
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
      ...pipelinePrefix,
      ...(cursorValue ? [{ $match: paginatedMatch }] : []),
      {
        $sort: isNewest
          ? { checkedAt: -1, _id: -1 }
          : { checkedAt: 1, _id: 1 },
      },
      { $limit: safeLimit + 1 },
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

  const hasMore = results.length > safeLimit;
  const pageItems = results.slice(0, safeLimit);
  const items = pageItems.map((item) => ({
    id: item._id.toString(),
    serviceId: item.serviceId.toString(),
    serviceName: item.serviceName,
    status: item.status,
    statusCode: item.statusCode,
    responseTime: item.responseTime,
    error: item.error,
    checkedAt: item.checkedAt,
  }));
  const lastItem = pageItems[pageItems.length - 1];

  return {
    items,
    total,
    nextCursor: hasMore && lastItem
      ? encodeCursor({
          id: lastItem._id,
          checkedAt: lastItem.checkedAt,
        })
      : null,
  };
}
