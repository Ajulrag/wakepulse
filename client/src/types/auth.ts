export type AuthUserRole = 'user' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: AuthUserRole
  isActive: boolean
  /** ISO date string returned by JSON serialization of the backend Date. */
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  name: string
}

export interface AuthUserResponse {
  success: true
  user: AuthUser
  message: string
}

export interface CurrentUserResponse {
  success: true
  user: AuthUser
}

export interface LogoutResponse {
  success: true
  message: string
}

export interface ForgotPasswordResponse {
  success: true
  message: string
}

export interface ResetPasswordCredentials {
  token: string
  password: string
}
