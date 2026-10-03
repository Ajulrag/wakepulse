import { ApiRequestError, requestJson } from './request'
import type {
  AuthUser,
  AuthUserResponse,
  CurrentUserResponse,
  LoginCredentials,
  LogoutResponse,
  RegisterCredentials,
} from '../types/auth'

const AUTH_PATH = '/api/auth'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'user' || value.role === 'admin') &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt))
  )
}

function isAuthUserResponse(value: unknown): value is AuthUserResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string' &&
    isAuthUser(value.user)
  )
}

function isCurrentUserResponse(value: unknown): value is CurrentUserResponse {
  return (
    isRecord(value) && value.success === true && isAuthUser(value.user)
  )
}

function isLogoutResponse(value: unknown): value is LogoutResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string'
  )
}

function invalidResponseError(): ApiRequestError {
  return new ApiRequestError(
    'The WakePulse API returned an unexpected authentication response.',
    null,
  )
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  const payload = await requestJson(`${AUTH_PATH}/me`, {
    method: 'GET',
    signal,
  })

  if (!isCurrentUserResponse(payload)) {
    throw invalidResponseError()
  }

  return payload.user
}

export async function loginUser(
  credentials: LoginCredentials,
): Promise<AuthUser> {
  const payload = await requestJson(`${AUTH_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

  if (!isAuthUserResponse(payload)) {
    throw invalidResponseError()
  }

  return payload.user
}

export async function registerUser(
  credentials: RegisterCredentials,
): Promise<AuthUser> {
  const payload = await requestJson(`${AUTH_PATH}/register`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

  if (!isAuthUserResponse(payload)) {
    throw invalidResponseError()
  }

  return payload.user
}

export async function logoutUser(): Promise<void> {
  const payload = await requestJson(`${AUTH_PATH}/logout`, {
    method: 'POST',
  })

  if (!isLogoutResponse(payload)) {
    throw invalidResponseError()
  }
}
