import { ApiRequestError, requestJson } from './request'
import type {
  AdminDashboardData,
  AdminOverview,
  AdminPage,
  AdminService,
  AdminUser,
  VisitorAnalytics,
} from '../types/admin'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOverview(value: unknown): value is AdminOverview {
  return (
    isRecord(value) &&
    [
      'totalUsers',
      'activeUsers',
      'adminUsers',
      'totalServices',
      'enabledServices',
      'disabledServices',
      'onlineServices',
      'offlineServices',
    ].every((key) => Number.isInteger(value[key]))
  )
}

function isVisitorAnalytics(value: unknown): value is VisitorAnalytics {
  return (
    isRecord(value) &&
    Number.isInteger(value.days) &&
    Number.isInteger(value.pageViews) &&
    Number.isInteger(value.uniqueVisitors) &&
    Array.isArray(value.daily) &&
    value.daily.every(
      (item) =>
        isRecord(item) &&
        typeof item.date === 'string' &&
        Number.isInteger(item.pageViews) &&
        Number.isInteger(item.visitors),
    ) &&
    Array.isArray(value.topPages) &&
    value.topPages.every(
      (item) =>
        isRecord(item) &&
        typeof item.path === 'string' &&
        Number.isInteger(item.pageViews),
    )
  )
}

function isAdminUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'user' || value.role === 'admin') &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string'
  )
}

function isAdminService(value: unknown): value is AdminService {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.ownerName === 'string' &&
    typeof value.ownerEmail === 'string' &&
    typeof value.name === 'string' &&
    typeof value.provider === 'string' &&
    typeof value.url === 'string' &&
    typeof value.enabled === 'boolean' &&
    typeof value.status === 'string' &&
    (value.lastCheckedAt === null || typeof value.lastCheckedAt === 'string') &&
    typeof value.createdAt === 'string'
  )
}

function invalidResponse(): ApiRequestError {
  return new ApiRequestError(
    'The WakePulse API returned an unexpected admin response.',
    null,
  )
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || value.success !== true) {
    throw invalidResponse()
  }
  return value
}

function parsePage<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): AdminPage<T> {
  const record = requireRecord(value)
  if (
    !Array.isArray(record.items) ||
    !record.items.every(isItem) ||
    !Number.isInteger(record.page) ||
    !Number.isInteger(record.pageSize) ||
    !Number.isInteger(record.total)
  ) {
    throw invalidResponse()
  }

  return {
    items: record.items,
    page: Number(record.page),
    pageSize: Number(record.pageSize),
    total: Number(record.total),
  }
}

export async function getAdminDashboard(
  signal?: AbortSignal,
): Promise<AdminDashboardData> {
  const record = requireRecord(
    await requestJson('/api/admin/overview', { signal }),
  )
  if (!isOverview(record.overview) || !isVisitorAnalytics(record.analytics)) {
    throw invalidResponse()
  }
  return { overview: record.overview, analytics: record.analytics }
}

export async function getAdminAnalytics(
  days: number,
  signal?: AbortSignal,
): Promise<VisitorAnalytics> {
  const record = requireRecord(
    await requestJson(`/api/admin/analytics?days=${days}`, { signal }),
  )
  if (!isVisitorAnalytics(record.analytics)) {
    throw invalidResponse()
  }
  return record.analytics
}

export async function getAdminUsers(
  page: number,
  search: string,
  signal?: AbortSignal,
): Promise<AdminPage<AdminUser>> {
  const query = new URLSearchParams({ page: String(page), search })
  return parsePage(
    await requestJson(`/api/admin/users?${query}`, { signal }),
    isAdminUser,
  )
}

export async function updateAdminUser(
  id: string,
  changes: { role?: 'user' | 'admin'; isActive?: boolean },
): Promise<AdminUser> {
  const record = requireRecord(
    await requestJson(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  )
  if (!isAdminUser(record.user)) {
    throw invalidResponse()
  }
  return record.user
}

export async function getAdminServices(
  page: number,
  search: string,
  signal?: AbortSignal,
): Promise<AdminPage<AdminService>> {
  const query = new URLSearchParams({ page: String(page), search })
  return parsePage(
    await requestJson(`/api/admin/services?${query}`, { signal }),
    isAdminService,
  )
}

export async function updateAdminService(
  id: string,
  enabled: boolean,
): Promise<AdminService> {
  const record = requireRecord(
    await requestJson(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  )
  if (!isAdminService(record.service)) {
    throw invalidResponse()
  }
  return record.service
}

export async function deleteAdminService(id: string): Promise<void> {
  requireRecord(
    await requestJson(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  )
}

export async function trackPageView(
  visitorId: string,
  path: string,
): Promise<void> {
  requireRecord(
    await requestJson('/api/analytics/page-view', {
      method: 'POST',
      body: JSON.stringify({ visitorId, path }),
    }),
  )
}
