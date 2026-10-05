import type { MonitoredService, ServiceDetailsResponse } from '../types/service'
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
