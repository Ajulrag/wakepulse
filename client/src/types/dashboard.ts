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
  totalServices: number
  onlineServices: number
  offlineServices: number
  disabledServices: number
  unknownServices: number
  totalChecks: number
}

export interface DashboardStats {
  checks24h: number
  successfulChecks24h: number
  failedChecks24h: number
  uptime24h: number
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
