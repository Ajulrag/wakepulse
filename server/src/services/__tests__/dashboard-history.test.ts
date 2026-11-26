import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const { mockAggregate, mockToArray } = vi.hoisted(() => ({
  mockAggregate: vi.fn(),
  mockToArray: vi.fn(),
}));

vi.mock("../../config/collections.js", () => ({
  checkLogsCollection: vi.fn(() => ({
    aggregate: mockAggregate,
  })),
}));

import { getDashboardHistory } from "../dashboard-activity.service.js";

describe("monitoring history pagination", () => {
  beforeEach(() => {
    mockAggregate.mockReturnValue({ toArray: mockToArray });
    mockToArray.mockReset();
    mockAggregate.mockClear();
  });

  it("returns a cursor when another page is available", async () => {
    const firstId = new ObjectId();
    const secondId = new ObjectId();
    const serviceId = new ObjectId();
    const checkedAt = new Date("2026-01-02T03:04:05.000Z");
    mockToArray.mockResolvedValueOnce([
      {
        _id: firstId,
        serviceId,
        serviceName: "API",
        status: "success",
        statusCode: 200,
        responseTime: 123,
        error: null,
        checkedAt,
      },
      {
        _id: secondId,
        serviceId,
        serviceName: "API",
        status: "failed",
        statusCode: 503,
        responseTime: 321,
        error: "HTTP 503",
        checkedAt,
      },
    ]);

    const page = await getDashboardHistory(
      "507f1f77bcf86cd799439011",
      1,
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe(firstId.toString());
    expect(page.nextCursor).not.toBeNull();
    expect(
      JSON.parse(Buffer.from(page.nextCursor!, "base64url").toString("utf8")),
    ).toEqual({
      checkedAt: checkedAt.toISOString(),
      id: firstId.toString(),
    });
  });

  it("applies the cursor and returns null when there are no older records", async () => {
    const checkId = new ObjectId();
    const serviceId = new ObjectId();
    const checkedAt = new Date("2026-01-02T03:04:05.000Z");
    mockToArray.mockResolvedValueOnce([
      {
        _id: checkId,
        serviceId,
        serviceName: "API",
        status: "success",
        statusCode: 200,
        responseTime: 123,
        error: null,
        checkedAt,
      },
    ]);
    const cursor = Buffer.from(
      JSON.stringify({
        checkedAt: checkedAt.toISOString(),
        id: checkId.toString(),
      }),
    ).toString("base64url");

    const page = await getDashboardHistory(
      "507f1f77bcf86cd799439011",
      20,
      cursor,
    );

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
    const pipeline = mockAggregate.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;
    expect(pipeline[0]?.$match).toEqual({
      userId: expect.any(ObjectId),
      $or: [
        { checkedAt: { $lt: checkedAt } },
        { checkedAt, _id: { $lt: checkId } },
      ],
    });
  });

  it("rejects malformed cursors", async () => {
    await expect(
      getDashboardHistory("507f1f77bcf86cd799439011", 20, "bad-cursor"),
    ).rejects.toThrow("INVALID_HISTORY_CURSOR");
    expect(mockAggregate).not.toHaveBeenCalled();
  });
});
