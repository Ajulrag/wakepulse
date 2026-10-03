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
    isNumber(value.totalServices) &&
    isNumber(value.onlineServices) &&
    isNumber(value.offlineServices) &&
    isNumber(value.disabledServices) &&
    isNumber(value.unknownServices) &&
    isNumber(value.totalChecks)
  )
}

function isDashboardStats(value: unknown): value is DashboardStats {
  return (
    isRecord(value) &&
    isNumber(value.checks24h) &&
    isNumber(value.successfulChecks24h) &&
    isNumber(value.failedChecks24h) &&
    isNumber(value.uptime24h) &&
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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()

    if (isRecord(payload) && typeof payload.message === 'string') {
      return payload.message
    }
  } catch {
    // Fall back to the HTTP status when an error response has no JSON body.
  }

  return `Dashboard request failed with status ${response.status}.`
}

export async function getDashboardOverview(
  signal?: AbortSignal,
): Promise<DashboardOverview> {
  let response: Response

  try {
    response = await fetch(DASHBOARD_OVERVIEW_PATH, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      signal,
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    throw new DashboardApiError(
      'Unable to connect to the WakePulse API.',
      null,
      { cause },
    )
  }

  if (!response.ok) {
    throw new DashboardApiError(
      await readErrorMessage(response),
      response.status,
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch (cause) {
    throw new DashboardApiError(
      'The WakePulse API returned an invalid JSON response.',
      response.status,
      { cause },
    )
  }

  if (!isDashboardOverviewResponse(payload)) {
    throw new DashboardApiError(
      'The WakePulse API returned an unexpected dashboard response.',
      response.status,
    )
  }

  return payload.dashboard
}
