import { ObjectId } from "mongodb";

import {
  notificationsCollection,
} from "../config/collections.js";
import type {
  NotificationDocument,
  NotificationEvent,
  ServiceStatus,
} from "../types/database.js";

export interface SafeNotification {
  id: string;
  serviceId: string;
  serviceName: string;
  event: NotificationEvent;
  message: string;
  error: string | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationInbox {
  notifications: SafeNotification[];
  unreadCount: number;
}

export function getServiceAlertEvent(
  previousStatus: ServiceStatus,
  nextStatus: "online" | "offline",
): NotificationEvent | null {
  if (previousStatus !== "offline" && nextStatus === "offline") {
    return "service_down";
  }

  if (previousStatus === "offline" && nextStatus === "online") {
    return "service_recovered";
  }

  return null;
}

function toSafeNotification(
  notification: NotificationDocument,
): SafeNotification {
  if (!notification._id) {
    throw new Error("Notification document is missing an ID");
  }

  return {
    id: notification._id.toString(),
    serviceId: notification.serviceId.toString(),
    serviceName: notification.serviceName,
    event: notification.event,
    message: notification.message,
    error: notification.error,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
  };
}

export async function listUserNotifications(
  userId: string,
): Promise<NotificationInbox> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("INVALID_USER_ID");
  }

  const userObjectId = new ObjectId(userId);
  const [notifications, unreadCount] = await Promise.all([
    notificationsCollection()
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray(),
    notificationsCollection().countDocuments({
      userId: userObjectId,
      readAt: null,
    }),
  ]);

  return {
    notifications: notifications.map(toSafeNotification),
    unreadCount,
  };
}

export async function markUserNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(notificationId)) {
    return false;
  }

  const result = await notificationsCollection().updateOne(
    {
      _id: new ObjectId(notificationId),
      userId: new ObjectId(userId),
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );

  return result.matchedCount > 0;
}

export async function markAllUserNotificationsRead(
  userId: string,
): Promise<void> {
  if (!ObjectId.isValid(userId)) {
    throw new Error("INVALID_USER_ID");
  }

  await notificationsCollection().updateMany(
    { userId: new ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } },
  );
}

export async function storeServiceNotification(input: {
  userId: ObjectId;
  serviceId: ObjectId;
  serviceName: string;
  event: NotificationEvent;
  error: string | null;
  createdAt: Date;
}): Promise<void> {
  const message =
    input.event === "service_down"
      ? `${input.serviceName} is experiencing a failure.`
      : `${input.serviceName} has recovered and is responding again.`;

  await notificationsCollection().insertOne({
    ...input,
    message,
    readAt: null,
  });
}
