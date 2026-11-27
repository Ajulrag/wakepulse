import { ApiRequestError, requestJson } from './request'
import type { NotificationInbox, UserNotification } from '../types/notification'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNotification(value: unknown): value is UserNotification {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.serviceId === 'string' &&
    typeof value.serviceName === 'string' &&
    (value.event === 'service_down' || value.event === 'service_recovered') &&
    typeof value.message === 'string' &&
    (typeof value.error === 'string' || value.error === null) &&
    typeof value.createdAt === 'string' &&
    (typeof value.readAt === 'string' || value.readAt === null)
  )
}

function isInbox(value: unknown): value is NotificationInbox {
  return (
    isRecord(value) &&
    value.success === true &&
    Array.isArray(value.notifications) &&
    value.notifications.every(isNotification) &&
    Number.isInteger(value.unreadCount)
  )
}

function invalidResponse(): ApiRequestError {
  return new ApiRequestError(
    'The WakePulse API returned an unexpected notification response.',
    null,
  )
}

export async function getNotificationInbox(
  signal?: AbortSignal,
): Promise<NotificationInbox> {
  const response = await requestJson('/api/notifications', { signal })
  if (!isInbox(response)) {
    throw invalidResponse()
  }
  return {
    notifications: response.notifications,
    unreadCount: Number(response.unreadCount),
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await requestJson(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  )
  if (!isRecord(response) || response.success !== true) {
    throw invalidResponse()
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await requestJson('/api/notifications/read-all', {
    method: 'POST',
  })
  if (!isRecord(response) || response.success !== true) {
    throw invalidResponse()
  }
}
