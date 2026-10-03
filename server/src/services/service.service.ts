import { ObjectId } from "mongodb";

import { servicesCollection, checkLogsCollection } from "../config/collections.js";
import type { ServiceDocument } from "../types/database.js";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "../validation/service.js";
import { checkHttpEndpoint } from "../utils/http-checker.js";

export type MonitoringWindow =
  | "24h"
  | "7d"
  | "30d";

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

export async function pingService(
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

  const nextCheckAt = new Date(
    checkedAt.getTime() +
    service.intervalSeconds * 1000,
  );

  const update: Partial<ServiceDocument> = {
    status:
      result.status === "success"
        ? "online"
        : "offline",
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

  const checks = await checkLogsCollection()
    .find({
      serviceId: new ObjectId(serviceId),
      userId: new ObjectId(userId),
      checkedAt: {
        $gte: windowStart,
      },
    })
    .sort({
      checkedAt: -1,
    })
    .toArray();

  const totalChecks = checks.length;

  const successfulChecks = checks.filter(
    (check) => check.status === "success",
  ).length;

  const failedChecks =
    totalChecks - successfulChecks;

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

  const uptimePercentage =
    totalChecks > 0
      ? Number(
        (
          (successfulChecks / totalChecks) *
          100
        ).toFixed(2),
      )
      : null;

  const latestCheck = checks[0] ?? null;

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
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercentage,
      averageResponseTime,
      minimumResponseTime,
      maximumResponseTime,
    },
    latestCheck: latestCheck
      ? {
        id: latestCheck._id!.toString(),
        status: latestCheck.status,
        statusCode: latestCheck.statusCode,
        responseTime: latestCheck.responseTime,
        error: latestCheck.error,
        checkedAt: latestCheck.checkedAt,
      }
      : null,
  };
}