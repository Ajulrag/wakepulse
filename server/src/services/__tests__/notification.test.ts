import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  toArray: vi.fn(),
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock("../../config/collections.js", () => ({
  notificationsCollection: () => ({
    find: mocks.find,
    countDocuments: mocks.countDocuments,
    updateOne: mocks.updateOne,
    updateMany: mocks.updateMany,
    insertOne: mocks.insertOne,
  }),
}));

import {
  getServiceAlertEvent,
  listUserNotifications,
  markUserNotificationRead,
} from "../notification.service.js";

describe("notification persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only queries the authenticated user's inbox", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const serviceId = "507f1f77bcf86cd799439012";
    const notificationId = "507f1f77bcf86cd799439013";
    const createdAt = new Date();
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: mocks.toArray,
    };
    mocks.find.mockReturnValue(chain);
    mocks.toArray.mockResolvedValue([
      {
        _id: { toString: () => notificationId },
        serviceId: { toString: () => serviceId },
        serviceName: "API",
        event: "service_down",
        message: "API is experiencing a failure.",
        error: "Request timed out",
        createdAt,
        readAt: null,
      },
    ]);
    mocks.countDocuments.mockResolvedValue(1);

    const inbox = await listUserNotifications(userId);

    expect(mocks.find.mock.calls[0]?.[0].userId.toString()).toBe(userId);
    expect(mocks.countDocuments.mock.calls[0]?.[0]).toMatchObject({
      readAt: null,
    });
    expect(inbox.unreadCount).toBe(1);
    expect(inbox.notifications[0]).toMatchObject({
      id: notificationId,
      serviceId,
      event: "service_down",
    });
  });

  it("marks a notification read only when it belongs to that user", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const notificationId = "507f1f77bcf86cd799439013";
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });

    await expect(
      markUserNotificationRead(userId, notificationId),
    ).resolves.toBe(true);

    const filter = mocks.updateOne.mock.calls[0]?.[0];
    expect(filter.userId.toString()).toBe(userId);
    expect(filter._id.toString()).toBe(notificationId);
  });
});

describe("service alert transitions", () => {
  it("alerts once when a service first becomes unavailable", () => {
    expect(getServiceAlertEvent("online", "offline")).toBe("service_down");
    expect(getServiceAlertEvent("unknown", "offline")).toBe("service_down");
    expect(getServiceAlertEvent("offline", "offline")).toBeNull();
  });

  it("sends a recovery event only after an outage", () => {
    expect(getServiceAlertEvent("offline", "online")).toBe(
      "service_recovered",
    );
    expect(getServiceAlertEvent("online", "online")).toBeNull();
    expect(getServiceAlertEvent("unknown", "online")).toBeNull();
  });
});
