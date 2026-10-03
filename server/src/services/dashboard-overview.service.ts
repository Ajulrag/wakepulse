import {
  getDashboardSummary,
  type DashboardSummary,
} from "./dashboard.service.js";

import {
  getDashboardStats,
  type DashboardStats,
} from "./dashboard-stats.service.js";

import {
  getDashboardActivity,
  type DashboardActivityItem,
} from "./dashboard-activity.service.js";

import {
  getDashboardUpcoming,
  type DashboardUpcomingItem,
} from "./dashboard-upcoming.service.js";

export interface DashboardOverview {
  summary: DashboardSummary;
  stats: DashboardStats;
  activity: DashboardActivityItem[];
  upcoming: DashboardUpcomingItem[];
}

export async function getDashboardOverview(
  userId: string,
): Promise<DashboardOverview> {
  const [summary, stats, activity, upcoming] = await Promise.all([
    getDashboardSummary(userId),
    getDashboardStats(userId),
    getDashboardActivity(userId),
    getDashboardUpcoming(userId),
  ]);

  return {
    summary,
    stats,
    activity,
    upcoming,
  };
}