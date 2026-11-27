import { ObjectId } from "mongodb";

import {
  checkLogsCollection,
  servicesCollection,
  usersCollection,
} from "../config/collections.js";
import type {
  ServiceDocument,
  UserDocument,
  UserRole,
} from "../types/database.js";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface AdminService {
  id: string;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  provider: ServiceDocument["provider"];
  url: string;
  enabled: boolean;
  status: ServiceDocument["status"];
  lastCheckedAt: Date | null;
  createdAt: Date;
}

export interface AdminPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalServices: number;
  enabledServices: number;
  disabledServices: number;
  onlineServices: number;
  offlineServices: number;
}

function toAdminUser(user: UserDocument): AdminUser {
  if (!user._id) {
    throw new Error("User document is missing an ID");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [totalUsers, activeUsers, adminUsers, serviceCounts] =
    await Promise.all([
      usersCollection().countDocuments(),
      usersCollection().countDocuments({ isActive: true }),
      usersCollection().countDocuments({ role: "admin", isActive: true }),
      servicesCollection()
        .aggregate<{
          _id: ServiceDocument["status"];
          count: number;
          enabledCount: number;
        }>([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              enabledCount: {
                $sum: { $cond: ["$enabled", 1, 0] },
              },
            },
          },
        ])
        .toArray(),
    ]);

  const statusCounts = new Map(
    serviceCounts.map((entry) => [entry._id, entry]),
  );
  const totalServices = serviceCounts.reduce(
    (total, entry) => total + entry.count,
    0,
  );
  const enabledServices = serviceCounts.reduce(
    (total, entry) => total + entry.enabledCount,
    0,
  );
  const disabledServices = totalServices - enabledServices;

  return {
    totalUsers,
    activeUsers,
    adminUsers,
    totalServices,
    enabledServices,
    disabledServices,
    onlineServices: statusCounts.get("online")?.count ?? 0,
    offlineServices: statusCounts.get("offline")?.count ?? 0,
  };
}

export async function listAdminUsers(
  search: string,
  page: number,
  pageSize: number,
): Promise<AdminPage<AdminUser>> {
  const query = search.trim();
  const filter = query
    ? {
        $or: [
          { name: { $regex: escapeRegex(query), $options: "i" } },
          { email: { $regex: escapeRegex(query), $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    usersCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    usersCollection().countDocuments(filter),
  ]);

  return {
    items: users.map(toAdminUser),
    page,
    pageSize,
    total,
  };
}

export async function updateAdminUser(
  actorId: string,
  targetId: string,
  changes: { role?: UserRole; isActive?: boolean },
): Promise<AdminUser | "not-found" | "self" | "last-admin"> {
  if (!ObjectId.isValid(actorId) || !ObjectId.isValid(targetId)) {
    return "not-found";
  }

  if (new ObjectId(actorId).equals(new ObjectId(targetId))) {
    return "self";
  }

  const users = usersCollection();
  const targetObjectId = new ObjectId(targetId);
  const target = await users.findOne({ _id: targetObjectId });

  if (!target) {
    return "not-found";
  }

  const willLoseAdminAccess =
    target.role === "admin" &&
    target.isActive &&
    (changes.role === "user" || changes.isActive === false);

  if (
    willLoseAdminAccess &&
    (await users.countDocuments({ role: "admin", isActive: true })) <= 1
  ) {
    return "last-admin";
  }

  await users.updateOne(
    { _id: targetObjectId },
    { $set: { ...changes, updatedAt: new Date() } },
  );

  const updatedUser = await users.findOne({ _id: targetObjectId });

  return updatedUser ? toAdminUser(updatedUser) : "not-found";
}

export async function listAdminServices(
  search: string,
  page: number,
  pageSize: number,
): Promise<AdminPage<AdminService>> {
  const query = search.trim();
  const regex = query ? new RegExp(escapeRegex(query), "i") : null;
  const filter = regex
    ? {
        $or: [
          { name: { $regex: regex } },
          { provider: { $regex: regex } },
          { url: { $regex: regex } },
        ],
      }
    : {};

  const [services, total] = await Promise.all([
    servicesCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    servicesCollection().countDocuments(filter),
  ]);
  const serviceOwnerIds = [...new Set(services.map((service) => service.userId))];
  const owners = await usersCollection()
    .find({ _id: { $in: serviceOwnerIds } })
    .toArray();
  const ownersById = new Map(
    owners.flatMap((owner) =>
      owner._id
        ? [[owner._id.toString(), owner] as const]
        : [],
    ),
  );

  return {
    items: services.flatMap((service) => {
      if (!service._id) {
        return [];
      }

      const owner = ownersById.get(service.userId.toString());

      return [{
        id: service._id.toString(),
        userId: service.userId.toString(),
        ownerName: owner?.name ?? "Deleted account",
        ownerEmail: owner?.email ?? "",
        name: service.name,
        provider: service.provider,
        url: service.url,
        enabled: service.enabled,
        status: service.status,
        lastCheckedAt: service.lastCheckedAt,
        createdAt: service.createdAt,
      }];
    }),
    page,
    pageSize,
    total,
  };
}

export async function updateAdminService(
  serviceId: string,
  enabled: boolean,
): Promise<AdminService | "not-found"> {
  if (!ObjectId.isValid(serviceId)) {
    return "not-found";
  }

  const id = new ObjectId(serviceId);
  await servicesCollection().updateOne(
    { _id: id },
    {
      $set: {
        enabled,
        status: enabled ? "unknown" : "disabled",
        nextCheckAt: enabled ? new Date() : null,
        updatedAt: new Date(),
      },
    },
  );

  const service = await servicesCollection().findOne({ _id: id });
  if (!service?._id) {
    return "not-found";
  }

  const owner = await usersCollection().findOne({ _id: service.userId });

  return {
    id: service._id.toString(),
    userId: service.userId.toString(),
    ownerName: owner?.name ?? "Deleted account",
    ownerEmail: owner?.email ?? "",
    name: service.name,
    provider: service.provider,
    url: service.url,
    enabled: service.enabled,
    status: service.status,
    lastCheckedAt: service.lastCheckedAt,
    createdAt: service.createdAt,
  };
}

export async function deleteAdminService(
  serviceId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(serviceId)) {
    return false;
  }

  const id = new ObjectId(serviceId);
  const deleted = await servicesCollection().deleteOne({ _id: id });

  if (deleted.deletedCount === 0) {
    return false;
  }

  await checkLogsCollection().deleteMany({ serviceId: id });
  return true;
}
