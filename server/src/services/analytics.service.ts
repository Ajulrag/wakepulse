import { pageViewsCollection } from "../config/collections.js";

export interface VisitorAnalytics {
  days: number;
  pageViews: number;
  uniqueVisitors: number;
  daily: Array<{ date: string; pageViews: number; visitors: number }>;
  topPages: Array<{ path: string; pageViews: number }>;
}

export async function recordPageView(
  visitorId: string,
  path: string,
): Promise<void> {
  const now = new Date();
  await pageViewsCollection().insertOne({
    visitorId,
    path,
    date: now.toISOString().slice(0, 10),
    createdAt: now,
  });
}

export async function getVisitorAnalytics(
  days: number,
): Promise<VisitorAnalytics> {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);

  const [result] = await pageViewsCollection()
    .aggregate<{
      summary: Array<{ uniqueVisitors: number }>;
      daily: Array<{
        date: string;
        pageViews: number;
        visitors: string[];
      }>;
      topPages: Array<{ path: string; pageViews: number }>;
      totals: Array<{ pageViews: number }>;
    }>([
      { $match: { createdAt: { $gte: start } } },
      {
        $facet: {
          summary: [
            { $group: { _id: "$visitorId" } },
            { $count: "uniqueVisitors" },
          ],
          daily: [
            {
              $group: {
                _id: "$date",
                pageViews: { $sum: 1 },
                visitors: { $addToSet: "$visitorId" },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                pageViews: 1,
                visitors: 1,
              },
            },
            { $sort: { date: 1 } },
          ],
          topPages: [
            { $group: { _id: "$path", pageViews: { $sum: 1 } } },
            { $sort: { pageViews: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                path: "$_id",
                pageViews: 1,
              },
            },
          ],
          totals: [{ $count: "pageViews" }],
        },
      },
    ])
    .toArray();

  const dailyByDate = new Map(
    (result?.daily ?? []).map((entry) => [
      entry.date,
      {
        date: entry.date,
        pageViews: entry.pageViews,
        visitors: entry.visitors.length,
      },
    ]),
  );
  const daily: VisitorAnalytics["daily"] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const dateKey = date.toISOString().slice(0, 10);
    daily.push(
      dailyByDate.get(dateKey) ?? {
        date: dateKey,
        pageViews: 0,
        visitors: 0,
      },
    );
  }

  return {
    days,
    pageViews: result?.totals[0]?.pageViews ?? 0,
    uniqueVisitors: result?.summary[0]?.uniqueVisitors ?? 0,
    daily,
    topPages: result?.topPages ?? [],
  };
}

export function isValidPageView(
  visitorId: unknown,
  path: unknown,
): visitorId is string {
  return (
    typeof visitorId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      visitorId,
    ) &&
    typeof path === "string" &&
    path.length <= 200 &&
    /^\/[a-zA-Z0-9/_:-]*$/.test(path) &&
    !path.startsWith("/admin") &&
    !path.startsWith("/api")
  );
}

