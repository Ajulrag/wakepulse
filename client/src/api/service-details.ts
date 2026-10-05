import type {
  MonitoredService,
  ServiceDetailsResponse,
  ServiceSummaryResponse,
} from '../types/service'
import { isMonitoredService } from './services'
import { ApiRequestError, requestJson } from './request'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isServiceDetailsResponse(value: unknown): value is ServiceDetailsResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isMonitoredService(value.service)
  )
}

export async function getServiceDetails(
  serviceId: string,
  signal?: AbortSignal,
): Promise<MonitoredService> {
  const payload = await requestJson(
    `/api/services/${encodeURIComponent(serviceId)}`,
    { method: 'GET', signal },
  )

  if (!isServiceDetailsResponse(payload)) {
    throw new ApiRequestError(
      'The WakePulse API returned an unexpected service response.',
      null,
    )
  }

  return payload.service
}

export async function getServiceSummary(
  serviceId: string,
  window: '24h' | '7d' | '30d' = '7d',
  signal?: AbortSignal,
): Promise<ServiceSummaryResponse['summary']> {
  const payload = await requestJson(
    `/api/services/${encodeURIComponent(serviceId)}/summary?window=${encodeURIComponent(window)}`,
    { method: 'GET', signal },
  )

  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.summary)) {
    throw new ApiRequestError(
      'The WakePulse API returned an unexpected summary response.',
      null,
    )
  }

  return payload.summary as ServiceSummaryResponse['summary']
}
