export type ServiceProvider =
  | 'render'
  | 'railway'
  | 'fly'
  | 'koyeb'
  | 'vercel'
  | 'custom'

export type ServiceMethod = 'GET' | 'HEAD' | 'POST'

export type ServiceStatus = 'unknown' | 'online' | 'offline' | 'disabled'

export type ManualCheckStatus = 'success' | 'failed' | 'timeout' | 'error'

/** Safe service fields returned by the authenticated services API. */
export interface MonitoredService {
  id: string
  name: string
  provider: ServiceProvider
  url: string
  endpoint: string
  method: ServiceMethod
  intervalSeconds: number
  timeoutSeconds: number
  enabled: boolean
  status: ServiceStatus
  lastCheckedAt: string | null
  lastSuccessAt: string | null
  lastStatusCode: number | null
  lastResponseTime: number | null
  lastError: string | null
  nextCheckAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UserServicesResponse {
  success: true
  services: MonitoredService[]
}

export interface ServiceDetailsResponse {
  success: true
  service: MonitoredService
}

export interface CreateServiceInput {
  name: string
  provider: ServiceProvider
  url: string
  endpoint: string
  method: ServiceMethod
  intervalSeconds: number
  timeoutSeconds: number
}

export type UpdateServiceInput = Partial<CreateServiceInput>

export interface ServiceMutationResponse {
  success: true
  message: string
  service: MonitoredService
}

export interface ManualServiceCheck {
  status: ManualCheckStatus
  statusCode: number | null
  responseTime: number | null
  error: string | null
  checkedAt: string
}

export interface ManualServicePingResponse {
  success: true
  message: string
  service: MonitoredService
  check: ManualServiceCheck
}

export type CreateServiceResponse = ServiceMutationResponse

export interface DeleteServiceResponse {
  success: true
  message: string
}

export interface ServiceSummaryMetrics {
  window: '24h' | '7d' | '30d'
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  uptimePercentage: number
  averageResponseTime: number | null
  minimumResponseTime: number | null
  maximumResponseTime: number | null
}

export interface ServiceSummaryLatestCheck {
  id: string
  status: string
  statusCode: number | null
  responseTime: number | null
  error: string | null
  checkedAt: string
}

export interface ServiceSummaryResponse {
  success: true
  summary: {
    service: {
      id: string
      name: string
      status: ServiceStatus
      enabled: boolean
      lastCheckedAt: string | null
      lastSuccessAt: string | null
      lastStatusCode: number | null
      lastResponseTime: number | null
      nextCheckAt: string | null
    }
    metrics: ServiceSummaryMetrics
    latestCheck: ServiceSummaryLatestCheck | null
  }
}
