import {
  usersCollection,
  sessionsCollection,
  servicesCollection,
  checkLogsCollection,
} from "./collections.js";

export async function initializeDatabase(): Promise<void> {
  await usersCollection().createIndex(
    { email: 1 },
    { unique: true },
  );

  await sessionsCollection().createIndex(
    { tokenId: 1 },
    { unique: true },
  );

  await sessionsCollection().createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  await servicesCollection().createIndex({
    userId: 1,
    createdAt: -1,
  });

  await servicesCollection().createIndex({
    enabled: 1,
    nextCheckAt: 1,
  });

  await checkLogsCollection().createIndex({
    serviceId: 1,
    checkedAt: -1,
  });

  await checkLogsCollection().createIndex({
    userId: 1,
    checkedAt: -1,
  });

  await checkLogsCollection().createIndex({
    serviceId: 1,
    userId: 1,
    checkedAt: -1,
  });

  console.log("WakePulse database indexes initialized");
}