export interface AdminOverview {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  totalServices: number
  enabledServices: number
  disabledServices: number
  onlineServices: number
  offlineServices: number
}

export interface VisitorAnalytics {
  days: number
  pageViews: number
  uniqueVisitors: number
  daily: Array<{ date: string; pageViews: number; visitors: number }>
  topPages: Array<{ path: string; pageViews: number }>
}

export interface AdminDashboardData {
  overview: AdminOverview
  analytics: VisitorAnalytics
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
}

export interface AdminService {
  id: string
  userId: string
  ownerName: string
  ownerEmail: string
  name: string
  provider: string
  url: string
  enabled: boolean
  status: string
  lastCheckedAt: string | null
  createdAt: string
}

export interface AdminPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface AdminEmailSettings {
  senderName: string
  senderEmail: string
  smtpConfigured: boolean
  updatedAt: string | null
}
