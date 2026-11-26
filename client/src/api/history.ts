import type {
  DashboardActivityItem,
  DashboardHistoryPage,
  DashboardCheckStatus,
} from '../types/dashboard'
import { ApiRequestError, requestJson } from './request'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isHistoryItem(value: unknown): value is DashboardActivityItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.serviceId === 'string' &&
    typeof value.serviceName === 'string' &&
    typeof value.status === 'string' &&
    isHistoryStatus(value.status) &&
    isNullableNumber(value.statusCode) &&
    isNullableNumber(value.responseTime) &&
    (typeof value.error === 'string' || value.error === null) &&
    typeof value.checkedAt === 'string' &&
    !Number.isNaN(Date.parse(value.checkedAt))
  )
}

function isHistoryPage(value: unknown): value is DashboardHistoryPage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isHistoryItem) &&
    (typeof value.nextCursor === 'string' || value.nextCursor === null) &&
    typeof value.total === 'number'
  )
}

export async function getMonitoringHistory(
  limit = 20,
  cursor?: string,
  signal?: AbortSignal,
  status: 'all' | DashboardCheckStatus = 'all',
  searchTerm = '',
  sort: 'newest' | 'oldest' = 'newest',
): Promise<DashboardHistoryPage> {
  const search = new URLSearchParams({ limit: String(limit) })
  if (cursor) {
    search.set('cursor', cursor)
  }
  if (status !== 'all') {
    search.set('status', status)
  }
  if (searchTerm.trim()) {
    search.set('search', searchTerm.trim())
  }
  search.set('sort', sort)

  const payload = await requestJson(`/api/dashboard/history?${search}`, {
    method: 'GET',
    signal,
  })

  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isHistoryPage(payload.history)
  ) {
    throw new ApiRequestError(
      'The WakePulse API returned an unexpected history response.',
      null,
    )
  }

  return payload.history
}

export function isHistoryStatus(value: string): value is DashboardCheckStatus {
  return ['success', 'failed', 'timeout', 'error'].includes(value)
}
