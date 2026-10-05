import type {
  MonitoredService,
  CreateServiceInput,
  DeleteServiceResponse,
  ManualCheckStatus,
  ManualServicePingResponse,
  ServiceMutationResponse,
  ServiceMethod,
  ServiceProvider,
  ServiceStatus,
  UpdateServiceInput,
  UserServicesResponse,
} from '../types/service'
import { ApiRequestError, requestJson } from './request'

const SERVICES_PATH = '/api/services/'

export class ServicesApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number | null,
    fieldErrors: Record<string, string[]> | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ServicesApiError'
    this.status = status
    this.fieldErrors = fieldErrors
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

function isNullableDate(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)))
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): value is T[number] {
  return typeof value === 'string' && choices.includes(value)
}

const serviceProviders = [
  'render',
  'railway',
  'fly',
  'koyeb',
  'vercel',
  'custom',
] as const satisfies readonly ServiceProvider[]
const serviceMethods = ['GET', 'HEAD', 'POST'] as const satisfies readonly ServiceMethod[]
const serviceStatuses = ['unknown', 'online', 'offline', 'disabled'] as const satisfies readonly ServiceStatus[]

export function isMonitoredService(value: unknown): value is MonitoredService {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOneOf(value.provider, serviceProviders) &&
    typeof value.url === 'string' &&
    typeof value.endpoint === 'string' &&
    isOneOf(value.method, serviceMethods) &&
    Number.isInteger(value.intervalSeconds) &&
    isNumber(value.intervalSeconds) &&
    Number.isInteger(value.timeoutSeconds) &&
    isNumber(value.timeoutSeconds) &&
    typeof value.enabled === 'boolean' &&
    isOneOf(value.status, serviceStatuses) &&
    isNullableDate(value.lastCheckedAt) &&
    isNullableDate(value.lastSuccessAt) &&
    isNullableNumber(value.lastStatusCode) &&
    isNullableNumber(value.lastResponseTime) &&
    (typeof value.lastError === 'string' || value.lastError === null) &&
    isNullableDate(value.nextCheckAt) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  )
}

function isUserServicesResponse(value: unknown): value is UserServicesResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    Array.isArray(value.services) &&
    value.services.every(isMonitoredService)
  )
}

function getRequestErrorMessage(
  status: number | null,
  action: 'load' | 'create' | 'update' | 'delete' | 'ping',
  serverMessage?: string,
): string {
  if (status === null) {
    return 'Unable to connect to the WakePulse API. Check your connection and try again.'
  }

  if (status === 401) {
    return 'Your session may have expired. We are checking it now.'
  }

  if (status === 403) {
    if (action === 'create') {
      return 'You do not have permission to create services.'
    }

    if (action === 'update') {
      return 'You do not have permission to update this service.'
    }

    if (action === 'delete') {
      return 'You do not have permission to delete this service.'
    }

    if (action === 'ping') {
      return 'You do not have permission to run a manual check for this service.'
    }

    return 'You do not have permission to view these services.'
  }

  if (status === 404) {
    if (action === 'update') {
      return 'This service no longer exists. Refreshing the services list.'
    }

    if (action === 'delete') {
      return 'This service could not be found. Refreshing the services list.'
    }

    if (action === 'ping') {
      return 'This service could not be found. Refreshing the services list.'
    }

    return 'The services endpoint could not be found. Refresh the page and try again.'
  }

  if (status === 409) {
    if (
      serverMessage &&
      serverMessage !==
        'This request conflicts with existing data. Review your details and try again.'
    ) {
      return serverMessage
    }

    if (action === 'update') {
      return 'This service changed before the update completed. Refresh and try again.'
    }

    if (action === 'ping') {
      return 'A check for this service is already in progress. Wait a moment and try again.'
    }

    if (action === 'delete') {
      return 'This service could not be deleted because its state changed. Refresh and try again.'
    }

    return 'This service conflicts with existing data. Review the details and try again.'
  }

  if (status === 429) {
    if (action === 'update' || action === 'delete') {
      return 'Too many service changes were requested. Wait a moment and try again.'
    }

    if (action === 'ping') {
      return 'Too many manual checks were requested. Wait a moment and try again.'
    }

    return 'Too many service requests. Wait a moment and try again.'
  }

  if (status === 400 && action === 'create') {
    return serverMessage === 'Invalid service data'
      ? 'Some service details are invalid. Review the form and try again.'
      : 'Some submitted service details are invalid. Review the form and try again.'
  }

  if (status === 400 && action === 'update') {
    return 'Some service details are invalid. Review the highlighted fields and try again.'
  }

  if (status === 400 && action === 'delete') {
    return 'The delete request was rejected. Close this dialog and try again.'
  }

  if (status === 400 && action === 'ping') {
    return serverMessage === 'Service is disabled'
      ? 'This service is disabled. Enable monitoring before running a manual check.'
      : 'The manual check request was rejected. Refresh the services list and try again.'
  }

  if (status >= 500) {
    if (action === 'update') {
      return 'The server could not update this service. Please try again shortly.'
    }

    if (action === 'delete') {
      return 'The server could not delete this service. Please try again shortly.'
    }

    if (action === 'ping') {
      return 'The server could not run a manual check. Please try again shortly.'
    }

    return action === 'create'
      ? 'The server could not create this service. Please try again shortly.'
      : 'The server could not load your services. Please try again shortly.'
  }

  if (action === 'update') {
    return 'Unable to update this service. Please try again.'
  }

  if (action === 'delete') {
    return 'Unable to delete this service. Please try again.'
  }

  if (action === 'ping') {
    return 'Unable to run a manual check. Please try again.'
  }

  return action === 'create'
    ? 'Unable to create this service. Please review the form and try again.'
    : 'Unable to load your services. Please refresh and try again.'
}

export async function getUserServices(
  signal?: AbortSignal,
): Promise<MonitoredService[]> {
  let payload: unknown

  try {
    payload = await requestJson(SERVICES_PATH, { method: 'GET', signal })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'load'),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (!isUserServicesResponse(payload)) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected services response.',
      null,
    )
  }

  return payload.services
}

function isServiceMutationResponse(
  value: unknown,
): value is ServiceMutationResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string' &&
    isMonitoredService(value.service)
  )
}

function isManualCheckStatus(value: unknown): value is ManualCheckStatus {
  return isOneOf(value, ['success', 'failed', 'timeout', 'error'] as const)
}

function isManualServicePingResponse(
  value: unknown,
): value is ManualServicePingResponse {
  if (!isRecord(value) || !isRecord(value.check)) {
    return false
  }

  const check = value.check
  return (
    value.success === true &&
    typeof value.message === 'string' &&
    isMonitoredService(value.service) &&
    isManualCheckStatus(check.status) &&
    isNullableNumber(check.statusCode) &&
    isNullableNumber(check.responseTime) &&
    (typeof check.error === 'string' || check.error === null) &&
    typeof check.checkedAt === 'string' &&
    !Number.isNaN(Date.parse(check.checkedAt))
  )
}

export async function pingMonitoredService(
  serviceId: string,
): Promise<ManualServicePingResponse> {
  let payload: unknown

  try {
    payload = await requestJson(
      `${SERVICES_PATH}${encodeURIComponent(serviceId)}/ping`,
      { method: 'POST' },
    )
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'ping', requestError?.message),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (
    !isManualServicePingResponse(payload) ||
    payload.service.id !== serviceId
  ) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected manual check response.',
      null,
    )
  }

  return payload
}

export async function createMonitoredService(
  input: CreateServiceInput,
): Promise<MonitoredService> {
  let payload: unknown

  try {
    payload = await requestJson(SERVICES_PATH, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'create', requestError?.message),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (!isServiceMutationResponse(payload)) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected service response.',
      null,
    )
  }

  return payload.service
}

export async function updateServiceEnabled(
  serviceId: string,
  enabled: boolean,
): Promise<MonitoredService> {
  let payload: unknown

  try {
    payload = await requestJson(
      `${SERVICES_PATH}${encodeURIComponent(serviceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      },
    )
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'update', requestError?.message),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (!isServiceMutationResponse(payload)) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected service update response.',
      null,
    )
  }

  return payload.service
}

export async function updateMonitoredService(
  serviceId: string,
  input: UpdateServiceInput,
): Promise<MonitoredService> {
  let payload: unknown

  try {
    payload = await requestJson(
      `${SERVICES_PATH}${encodeURIComponent(serviceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'update', requestError?.message),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (!isServiceMutationResponse(payload) || payload.service.id !== serviceId) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected service update response.',
      null,
    )
  }

  return payload.service
}

function isDeleteServiceResponse(value: unknown): value is DeleteServiceResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string'
  )
}

export async function deleteMonitoredService(serviceId: string): Promise<void> {
  let payload: unknown

  try {
    payload = await requestJson(
      `${SERVICES_PATH}${encodeURIComponent(serviceId)}`,
      { method: 'DELETE' },
    )
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    const requestError = cause instanceof ApiRequestError ? cause : null
    const status = requestError?.status ?? null
    throw new ServicesApiError(
      getRequestErrorMessage(status, 'delete', requestError?.message),
      status,
      requestError?.fieldErrors,
      { cause },
    )
  }

  if (!isDeleteServiceResponse(payload)) {
    throw new ServicesApiError(
      'The WakePulse API returned an unexpected service deletion response.',
      null,
    )
  }
}
