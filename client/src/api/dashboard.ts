import type {
  DashboardActivityItem,
  DashboardCheckStatus,
  DashboardOverview,
  DashboardOverviewResponse,
  DashboardServiceProvider,
  DashboardServiceStatus,
  DashboardStats,
  DashboardSummary,
  DashboardUpcomingItem,
} from '../types/dashboard'
import { ApiRequestError, requestJson } from './request'

const DASHBOARD_OVERVIEW_PATH = '/api/dashboard/overview'

export class DashboardApiError extends Error {
  readonly status: number | null

  constructor(
    message: string,
    status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DashboardApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): value is T[number] {
  return typeof value === 'string' && choices.includes(value)
}

const checkStatuses = ['success', 'failed', 'timeout', 'error'] as const
const serviceProviders = [
  'render',
  'railway',
  'fly',
  'koyeb',
  'vercel',
  'custom',
] as const
const serviceStatuses = ['unknown', 'online', 'offline', 'disabled'] as const

function isDashboardSummary(value: unknown): value is DashboardSummary {
  return (
    isRecord(value) &&
    isNullableNumber(value.totalServices) &&
    isNullableNumber(value.onlineServices) &&
    isNullableNumber(value.offlineServices) &&
    isNullableNumber(value.disabledServices) &&
    isNullableNumber(value.unknownServices) &&
    isNullableNumber(value.totalChecks)
  )
}

function isDashboardStats(value: unknown): value is DashboardStats {
  return (
    isRecord(value) &&
    isNullableNumber(value.checks24h) &&
    isNullableNumber(value.successfulChecks24h) &&
    isNullableNumber(value.failedChecks24h) &&
    isNullableNumber(value.uptime24h) &&
    isNullableNumber(value.averageResponseTime24h)
  )
}

function isDashboardActivityItem(value: unknown): value is DashboardActivityItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.serviceId === 'string' &&
    typeof value.serviceName === 'string' &&
    isOneOf<readonly DashboardCheckStatus[]>(value.status, checkStatuses) &&
    isNullableNumber(value.statusCode) &&
    isNullableNumber(value.responseTime) &&
    (typeof value.error === 'string' || value.error === null) &&
    typeof value.checkedAt === 'string'
  )
}

function isDashboardUpcomingItem(value: unknown): value is DashboardUpcomingItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOneOf<readonly DashboardServiceProvider[]>(value.provider, serviceProviders) &&
    isOneOf<readonly DashboardServiceStatus[]>(value.status, serviceStatuses) &&
    typeof value.nextCheckAt === 'string' &&
    isNumber(value.intervalSeconds)
  )
}

function isDashboardOverviewResponse(
  value: unknown,
): value is DashboardOverviewResponse {
  if (!isRecord(value) || !isRecord(value.dashboard)) {
    return false
  }

  const { dashboard } = value

  return (
    isDashboardSummary(dashboard.summary) &&
    isDashboardStats(dashboard.stats) &&
    Array.isArray(dashboard.activity) &&
    dashboard.activity.every(isDashboardActivityItem) &&
    Array.isArray(dashboard.upcoming) &&
    dashboard.upcoming.every(isDashboardUpcomingItem)
  )
}

function getRequestErrorMessage(status: number | null): string {
  if (status === null) {
    return 'Unable to connect to the WakePulse API.'
  }

  if (status === 401) {
    return 'Your session has expired. Sign in again, then retry loading the dashboard.'
  }

  if (status === 403) {
    return 'You do not have permission to view this dashboard.'
  }

  return 'The dashboard could not be loaded. Please try again.'
}

export async function getDashboardOverview(
  signal?: AbortSignal,
): Promise<DashboardOverview> {
  let payload: unknown

  try {
    payload = await requestJson(DASHBOARD_OVERVIEW_PATH, {
      method: 'GET',
      signal,
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const status = cause instanceof ApiRequestError ? cause.status : null
    throw new DashboardApiError(
      getRequestErrorMessage(status),
      status,
      { cause },
    )
  }

  if (!isDashboardOverviewResponse(payload)) {
    throw new DashboardApiError(
      'The WakePulse API returned an unexpected dashboard response.',
      null,
    )
  }

  return payload.dashboard
}
