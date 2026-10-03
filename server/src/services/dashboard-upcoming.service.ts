import { ObjectId } from "mongodb";
import { servicesCollection } from "../config/collections.js";
import type {
  ServiceProvider,
  ServiceStatus,
} from "../types/database.js";

export interface DashboardUpcomingItem {
  id: string;
  name: string;
  provider: ServiceProvider;
  status: ServiceStatus;
  nextCheckAt: Date;
  intervalSeconds: number;
}

export async function getDashboardUpcoming(
  userId: string,
  limit = 10,
  now = new Date(),
): Promise<DashboardUpcomingItem[]> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userObjectId = new ObjectId(userId);

  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    50,
  );

  const upcoming = await servicesCollection()
    .find({
      userId: userObjectId,
      enabled: true,
      nextCheckAt: {
        $ne: null,
        $gte: now,
      },
    })
    .sort({
      nextCheckAt: 1,
    })
    .limit(safeLimit)
    .project<{
      _id: ObjectId;
      name: string;
      provider: ServiceProvider;
      status: ServiceStatus;
      nextCheckAt: Date;
      intervalSeconds: number;
    }>({
      _id: 1,
      name: 1,
      provider: 1,
      status: 1,
      nextCheckAt: 1,
      intervalSeconds: 1,
    })
    .toArray();

  return upcoming.map((service) => ({
    id: service._id.toString(),
    name: service.name,
    provider: service.provider,
    status: service.status,
    nextCheckAt: service.nextCheckAt,
    intervalSeconds: service.intervalSeconds,
  }));
}
