export type DashboardCheckStatus =
  | 'success'
  | 'failed'
  | 'timeout'
  | 'error'

export type DashboardServiceProvider =
  | 'render'
  | 'railway'
  | 'fly'
  | 'koyeb'
  | 'vercel'
  | 'custom'

export type DashboardServiceStatus =
  | 'unknown'
  | 'online'
  | 'offline'
  | 'disabled'

export interface DashboardSummary {
  totalServices: number | null
  onlineServices: number | null
  offlineServices: number | null
  disabledServices: number | null
  unknownServices: number | null
  totalChecks: number | null
}

export interface DashboardStats {
  checks24h: number | null
  successfulChecks24h: number | null
  failedChecks24h: number | null
  uptime24h: number | null
  averageResponseTime24h: number | null
}

export interface DashboardActivityItem {
  id: string
  serviceId: string
  serviceName: string
  status: DashboardCheckStatus
  statusCode: number | null
  responseTime: number | null
  error: string | null
  /** ISO date string returned by JSON serialization of the backend Date. */
  checkedAt: string
}

export interface DashboardUpcomingItem {
  id: string
  name: string
  provider: DashboardServiceProvider
  status: DashboardServiceStatus
  /** ISO date string returned by JSON serialization of the backend Date. */
  nextCheckAt: string
  intervalSeconds: number
}

export interface DashboardOverview {
  summary: DashboardSummary
  stats: DashboardStats
  activity: DashboardActivityItem[]
  upcoming: DashboardUpcomingItem[]
}

export interface DashboardOverviewResponse {
  dashboard: DashboardOverview
}
