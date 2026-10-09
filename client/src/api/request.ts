function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const UNMAPPED_FIELD_KEY = '__unmapped'
const FALLBACK_FIELD_ERROR = 'This value is invalid.'

// These are fixed, user-facing messages emitted by the current API. Unknown
// server text is replaced with a status-specific message so implementation
// details can never flow directly into the UI.
const safeApiMessages = new Set([
  'Authentication required',
  'Session is no longer valid',
  'Session has expired',
  'User account no longer exists',
  'Account is disabled',
  'Invalid or expired authentication token',
  'Authentication check failed',
  'You do not have permission to perform this action',
  'Invalid registration data',
  'An account with this email already exists',
  'Invalid login data',
  'Invalid email or password',
  'This account is disabled',
  'Unable to create authentication session',
  'Unable to create account',
  'Unable to login',
  'Unable to retrieve current user',
  'Unable to logout',
  'Invalid password recovery data',
  'Invalid password reset data',
  'This password reset link is invalid or has expired.',
  'Password reset successfully. Sign in with your new password.',
  'Unable to reset password right now. Please try again.',
  'If an account exists for that email, a password reset link has been sent.',
  'Invalid service data',
  'Unable to create service',
  'Unable to retrieve services',
  'Service not found',
  'Service is disabled',
  'Invalid service update data',
  'Unable to update service',
  'Unable to delete service',
  'Unable to ping service',
  'Unable to retrieve check history',
  'Failed to get service summary',
  'Failed to load dashboard activity',
  'Failed to load dashboard overview',
  'Failed to load dashboard statistics',
  'Failed to load upcoming checks',
  'Failed to load dashboard summary',
  'Too many authentication attempts. Please try again later.',
  'Name must be at least 2 characters',
  'Name must be at most 100 characters',
  'Please provide a valid email address',
  'Password must be at least 8 characters',
  'Password is required',
  'Password is too long',
  'Service name must be at least 2 characters',
  'Service name must be at most 100 characters',
  'Please provide a valid URL',
  'Endpoint is required',
  'Endpoint is too long',
  'Interval must be a whole number',
  'Interval must be at least 30 seconds',
  'Interval cannot exceed 24 hours',
  'Timeout must be a whole number',
  'Timeout must be at least 5 seconds',
  'Timeout cannot exceed 60 seconds',
  'At least one field must be provided',
])

function getFieldErrors(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value) || !isRecord(value.errors)) {
    return null
  }

  const fieldErrors: Record<string, string[]> = {}

  for (const [field, messages] of Object.entries(value.errors).slice(0, 20)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field)) {
      fieldErrors[UNMAPPED_FIELD_KEY] = [FALLBACK_FIELD_ERROR]
      continue
    }

    if (!Array.isArray(messages)) {
      fieldErrors[field] = [FALLBACK_FIELD_ERROR]
      continue
    }

    const safeMessages = messages.slice(0, 3).map((message) =>
      typeof message === 'string' && safeApiMessages.has(message.trim())
        ? message.trim()
        : FALLBACK_FIELD_ERROR,
    )

    if (safeMessages.length > 0) {
      fieldErrors[field] = safeMessages
    }
  }

  if (Object.keys(value.errors).length > 20) {
    fieldErrors[UNMAPPED_FIELD_KEY] = [FALLBACK_FIELD_ERROR]
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
}

function getStatusErrorMessage(status: number): string {
  if (status === 400) {
    return 'Some submitted information is invalid. Review the form and try again.'
  }

  if (status === 401) {
    return 'Your session has expired. Sign in again to continue.'
  }

  if (status === 403) {
    return 'You do not have permission to complete this request.'
  }

  if (status === 404) {
    return 'The requested resource could not be found.'
  }

  if (status === 409) {
    return 'This request conflicts with existing data. Review your details and try again.'
  }

  if (status === 429) {
    return 'Too many requests. Wait a moment and try again.'
  }

  if (status >= 500) {
    return 'The server could not complete the request. Please try again shortly.'
  }

  return 'The request could not be completed. Please try again.'
}

function getResponseMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.message === 'string') {
    const message = payload.message.trim()

    if (safeApiMessages.has(message)) {
      return message
    }
  }

  return getStatusErrorMessage(status)
}

export class ApiRequestError extends Error {
  readonly status: number | null
  readonly fieldErrors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number | null,
    fieldErrors: Record<string, string[]> | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Sends a JSON API request using the server-managed HTTP-only auth cookie. */
export async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers,
    })
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiRequestError(
      'Unable to connect to the WakePulse API.',
      null,
      null,
      { cause },
    )
  }

  let payload: unknown = null

  if (response.status !== 204) {
    try {
      payload = await response.json()
    } catch (cause) {
      if (response.ok) {
        throw new ApiRequestError(
          'The WakePulse API returned an invalid JSON response.',
          response.status,
          null,
          { cause },
        )
      }
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      getResponseMessage(payload, response.status),
      response.status,
      getFieldErrors(payload),
    )
  }

  return payload
}
