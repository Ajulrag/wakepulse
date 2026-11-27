import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVisitorAnalytics,
  isValidPageView,
} from "../analytics.service.js";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  toArray: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock("../../config/collections.js", () => ({
  pageViewsCollection: () => ({
    aggregate: mocks.aggregate,
    insertOne: mocks.insertOne,
  }),
}));

describe("visitor analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a complete daily series and aggregate visitor totals", async () => {
    const today = new Date();
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
    mocks.toArray.mockResolvedValue([
      {
        summary: [{ uniqueVisitors: 3 }],
        daily: [{ date, pageViews: 4, visitors: ["a", "b", "c"] }],
        topPages: [{ path: "/", pageViews: 4 }],
        totals: [{ pageViews: 4 }],
      },
    ]);
    mocks.aggregate.mockReturnValue({ toArray: mocks.toArray });

    const analytics = await getVisitorAnalytics(7);

    expect(analytics).toEqual({
      days: 7,
      pageViews: 4,
      uniqueVisitors: 3,
      daily: [
        ...Array.from({ length: 6 }, (_, index) => {
          const dateValue = new Date(`${date}T00:00:00.000Z`);
          dateValue.setUTCDate(dateValue.getUTCDate() - 6 + index);
          return {
            date: dateValue.toISOString().slice(0, 10),
            pageViews: 0,
            visitors: 0,
          };
        }),
        { date, pageViews: 4, visitors: 3 },
      ],
      topPages: [{ path: "/", pageViews: 4 }],
    });
  });

  it("accepts only anonymous visitor IDs and normalized local page paths", () => {
    const visitorId = crypto.randomUUID();

    expect(isValidPageView(visitorId, "/dashboard")).toBe(true);
    expect(isValidPageView(visitorId, "/services/:serviceId")).toBe(true);
    expect(isValidPageView(visitorId, "/dashboard?token=secret")).toBe(false);
    expect(isValidPageView(visitorId, "/admin")).toBe(false);
    expect(isValidPageView("not-a-uuid", "/")).toBe(false);
  });
});
