export type NotificationEvent = 'service_down' | 'service_recovered'

export interface UserNotification {
  id: string
  serviceId: string
  serviceName: string
  event: NotificationEvent
  message: string
  error: string | null
  createdAt: string
  readAt: string | null
}

export interface NotificationInbox {
  notifications: UserNotification[]
  unreadCount: number
}
