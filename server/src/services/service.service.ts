import { ObjectId } from "mongodb";

import {
  servicesCollection,
  checkLogsCollection,
  usersCollection,
} from "../config/collections.js";

import type {
  CheckLogDocument,
  ServiceDocument,
} from "../types/database.js";

import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "../validation/service.js";

import { checkHttpEndpoint } from "../utils/http-checker.js";
import {
  getServiceAlertEvent,
  storeServiceNotification,
} from "./notification.service.js";
import { sendServiceAlertEmail } from "./email.service.js";

export type MonitoringWindow =
  | "24h"
  | "7d"
  | "30d";

const inFlightServiceChecks = new Set<string>();

async function sendServiceAlertToOwner(input: {
  userId: ObjectId;
  serviceName: string;
  event: "service_down" | "service_recovered";
  error: string | null;
  checkedAt: Date;
}): Promise<void> {
  try {
    const owner = await usersCollection().findOne({
      _id: input.userId,
    });
    if (!owner) {
      throw new Error("SERVICE_OWNER_NOT_FOUND");
    }

    await sendServiceAlertEmail({
      email: owner.email,
      name: owner.name,
      serviceName: input.serviceName,
      event: input.event,
      error: input.error,
      checkedAt: input.checkedAt,
    });
  } catch (error) {
    console.error("Unable to send service alert email:", error);
  }
}

function getMonitoringWindowStart(
  window: MonitoringWindow,
): Date {
  const now = Date.now();

  const durationMs = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  }[window];

  return new Date(now - durationMs);
}

export interface SafeService {
  id: string;
  name: string;
  provider: ServiceDocument["provider"];
  url: string;
  endpoint: string;
  method: ServiceDocument["method"];
  intervalSeconds: number;
  timeoutSeconds: number;
  enabled: boolean;
  status: ServiceDocument["status"];
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastStatusCode: number | null;
  lastResponseTime: number | null;
  lastError: string | null;
  nextCheckAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toSafeService(
  service: ServiceDocument,
): SafeService {
  return {
    id: service._id!.toString(),
    name: service.name,
    provider: service.provider,
    url: service.url,
    endpoint: service.endpoint,
    method: service.method,
    intervalSeconds: service.intervalSeconds,
    timeoutSeconds: service.timeoutSeconds,
    enabled: service.enabled,
    status: service.status,
    lastCheckedAt: service.lastCheckedAt,
    lastSuccessAt: service.lastSuccessAt,
    lastStatusCode: service.lastStatusCode,
    lastResponseTime: service.lastResponseTime,
    lastError: service.lastError,
    nextCheckAt: service.nextCheckAt,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export async function createService(
  userId: string,
  input: CreateServiceInput,
): Promise<SafeService> {
  const now = new Date();

  const service: ServiceDocument = {
    userId: new ObjectId(userId),
    name: input.name,
    provider: input.provider,
    url: input.url,
    endpoint: input.endpoint,
    method: input.method,
    intervalSeconds: input.intervalSeconds,
    timeoutSeconds: input.timeoutSeconds,
    enabled: true,
    status: "unknown",
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastStatusCode: null,
    lastResponseTime: null,
    lastError: null,
    nextCheckAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const result = await servicesCollection().insertOne(
    service,
  );

  service._id = result.insertedId;

  return toSafeService(service);
}

export async function getUserServices(
  userId: string,
): Promise<SafeService[]> {
  const services = await servicesCollection()
    .find({
      userId: new ObjectId(userId),
    })
    .sort({
      createdAt: -1,
    })
    .toArray();

  return services.map(toSafeService);
}

export async function getServiceById(
  userId: string,
  serviceId: string,
): Promise<SafeService | null> {
  if (!ObjectId.isValid(serviceId)) {
    return null;
  }

  const service = await servicesCollection().findOne({
    _id: new ObjectId(serviceId),
    userId: new ObjectId(userId),
  });

  if (!service) {
    return null;
  }

  return toSafeService(service);
}

export async function updateService(
  userId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<SafeService | null> {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return null;
  }

  const now = new Date();

  const result = await servicesCollection().findOneAndUpdate(
    {
      _id: new ObjectId(serviceId),
      userId: new ObjectId(userId),
    },
    {
      $set: {
        ...input,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!result) {
    return null;
  }

  return toSafeService(result);
}

export async function deleteService(
  userId: string,
  serviceId: string,
): Promise<boolean> {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return false;
  }

  const result = await servicesCollection().deleteOne({
    _id: new ObjectId(serviceId),
    userId: new ObjectId(userId),
  });

  return result.deletedCount === 1;
}

async function runServiceCheck(
  userId: string,
  serviceId: string,
): Promise<{
  service: SafeService;
  check: {
    status: "success" | "failed" | "timeout" | "error";
    statusCode: number | null;
    responseTime: number | null;
    error: string | null;
    checkedAt: Date;
  };
} | null> {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return null;
  }

  const service = await servicesCollection().findOne({
    _id: new ObjectId(serviceId),
    userId: new ObjectId(userId),
  });

  if (!service || !service._id) {
    return null;
  }

  if (!service.enabled) {
    throw new Error("SERVICE_DISABLED");
  }

  const checkedAt = new Date();

  const result = await checkHttpEndpoint({
    baseUrl: service.url,
    endpoint: service.endpoint,
    method: service.method,
    timeoutSeconds: service.timeoutSeconds,
  });
  const nextStatus =
    result.status === "success" ? "online" : "offline";
  const alertEvent = getServiceAlertEvent(service.status, nextStatus);

  const nextCheckAt = new Date(
    checkedAt.getTime() +
      service.intervalSeconds * 1000,
  );

  const update: Partial<ServiceDocument> = {
    status: nextStatus,
    lastCheckedAt: checkedAt,
    lastStatusCode: result.statusCode,
    lastResponseTime: result.responseTime,
    lastError: result.error,
    nextCheckAt,
    updatedAt: checkedAt,
  };

  if (result.status === "success") {
    update.lastSuccessAt = checkedAt;
  }

  await servicesCollection().updateOne(
    {
      _id: service._id,
      userId: new ObjectId(userId),
    },
    {
      $set: update,
    },
  );

  await checkLogsCollection().insertOne({
    serviceId: service._id,
    userId: new ObjectId(userId),
    status: result.status,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    error: result.error,
    checkedAt,
    createdAt: checkedAt,
  });

  if (alertEvent) {
    try {
      await storeServiceNotification({
        userId: service.userId,
        serviceId: service._id,
        serviceName: service.name,
        event: alertEvent,
        error: alertEvent === "service_down" ? result.error : null,
        createdAt: checkedAt,
      });
    } catch (error) {
      console.error("Unable to save service alert notification:", error);
    }

    void sendServiceAlertToOwner({
      userId: service.userId,
      serviceName: service.name,
      event: alertEvent,
      error: alertEvent === "service_down" ? result.error : null,
      checkedAt,
    });
  }

  const updatedService =
    await servicesCollection().findOne({
      _id: service._id,
      userId: new ObjectId(userId),
    });

  if (!updatedService) {
    throw new Error(
      "SERVICE_DISAPPEARED_AFTER_CHECK",
    );
  }

  return {
    service: toSafeService(updatedService),
    check: {
      status: result.status,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error,
      checkedAt,
    },
  };
}

export async function pingService(
  userId: string,
  serviceId: string,
): Promise<Awaited<ReturnType<typeof runServiceCheck>>> {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return null;
  }

  if (inFlightServiceChecks.has(serviceId)) {
    throw new Error("SERVICE_CHECK_IN_PROGRESS");
  }

  inFlightServiceChecks.add(serviceId);

  try {
    return await runServiceCheck(userId, serviceId);
  } finally {
    inFlightServiceChecks.delete(serviceId);
  }
}

export async function getServiceCheckHistory(
  userId: string,
  serviceId: string,
  limit = 50,
) {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return null;
  }

  const service = await servicesCollection().findOne({
    _id: new ObjectId(serviceId),
    userId: new ObjectId(userId),
  });

  if (!service) {
    return null;
  }

  const checks = await checkLogsCollection()
    .find({
      serviceId: new ObjectId(serviceId),
      userId: new ObjectId(userId),
    })
    .sort({
      checkedAt: -1,
    })
    .limit(limit)
    .toArray();

  return checks.map((check) => ({
    id: check._id!.toString(),
    status: check.status,
    statusCode: check.statusCode,
    responseTime: check.responseTime,
    error: check.error,
    checkedAt: check.checkedAt,
    createdAt: check.createdAt,
  }));
}

export async function getServiceSummary(
  userId: string,
  serviceId: string,
  window: MonitoringWindow = "7d",
) {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(serviceId)
  ) {
    return null;
  }

  const service = await servicesCollection().findOne({
    _id: new ObjectId(serviceId),
    userId: new ObjectId(userId),
  });

  if (!service) {
    return null;
  }

  const windowStart =
    getMonitoringWindowStart(window);

  const [aggregated] = await checkLogsCollection()
    .aggregate<{
      totalChecks: number;
      successfulChecks: number;
      averageResponseTime: number | null;
      minimumResponseTime: number | null;
      maximumResponseTime: number | null;
      latestCheck: {
        id: ObjectId;
        status: CheckLogDocument["status"];
        statusCode: number | null;
        responseTime: number | null;
        error: string | null;
        checkedAt: Date;
      };
    }>([
      {
        $match: {
          serviceId: new ObjectId(serviceId),
          userId: new ObjectId(userId),
          checkedAt: {
            $gte: windowStart,
          },
        },
      },
      {
        $set: {
          responseTimeForMetrics: {
            $cond: [
              { $isNumber: "$responseTime" },
              "$responseTime",
              "$$REMOVE",
            ],
          },
        },
      },
      {
        $sort: {
          checkedAt: -1,
          _id: -1,
        },
      },
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          successfulChecks: {
            $sum: {
              $cond: [{ $eq: ["$status", "success"] }, 1, 0],
            },
          },
          averageResponseTime: { $avg: "$responseTimeForMetrics" },
          minimumResponseTime: { $min: "$responseTimeForMetrics" },
          maximumResponseTime: { $max: "$responseTimeForMetrics" },
          latestCheck: {
            $first: {
              id: "$_id",
              status: "$status",
              statusCode: "$statusCode",
              responseTime: "$responseTime",
              error: "$error",
              checkedAt: "$checkedAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalChecks: 1,
          successfulChecks: 1,
          averageResponseTime: 1,
          minimumResponseTime: 1,
          maximumResponseTime: 1,
          latestCheck: 1,
        },
      },
    ])
    .toArray();

  const totalChecks = aggregated?.totalChecks ?? 0;
  const successfulChecks = aggregated?.successfulChecks ?? 0;
  const metrics = {
    totalChecks,
    successfulChecks,
    failedChecks: totalChecks - successfulChecks,
    uptimePercentage:
      totalChecks > 0
        ? Number(((successfulChecks / totalChecks) * 100).toFixed(2))
        : 0,
    averageResponseTime:
      aggregated?.averageResponseTime == null
        ? null
        : Math.round(aggregated.averageResponseTime),
    minimumResponseTime: aggregated?.minimumResponseTime ?? null,
    maximumResponseTime: aggregated?.maximumResponseTime ?? null,
  };

  return {
    service: {
      id: service._id!.toString(),
      name: service.name,
      status: service.status,
      enabled: service.enabled,
      lastCheckedAt: service.lastCheckedAt,
      lastSuccessAt: service.lastSuccessAt,
      lastStatusCode: service.lastStatusCode,
      lastResponseTime: service.lastResponseTime,
      nextCheckAt: service.nextCheckAt,
    },
    metrics: {
      window,
      ...metrics,
    },
    latestCheck: aggregated?.latestCheck
      ? {
          id: aggregated.latestCheck.id.toString(),
          status: aggregated.latestCheck.status,
          statusCode: aggregated.latestCheck.statusCode,
          responseTime: aggregated.latestCheck.responseTime,
          error: aggregated.latestCheck.error,
          checkedAt: aggregated.latestCheck.checkedAt,
        }
      : null,
  };
}

export async function getDueServices(
  now = new Date(),
  limit = 100,
): Promise<ServiceDocument[]> {
  return servicesCollection()
    .find({
      enabled: true,
      nextCheckAt: {
        $ne: null,
        $lte: now,
      },
    })
    .sort({
      nextCheckAt: 1,
    })
    .limit(Math.max(1, Math.floor(limit)))
    .toArray();
}