import { ObjectId } from "mongodb";

import { servicesCollection } from "../config/collections.js";
import type { ServiceDocument } from "../types/database.js";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "../validation/service.js";

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