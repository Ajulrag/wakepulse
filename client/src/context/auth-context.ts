import { createContext } from 'react'
import type {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth'

export type AuthState =
  | { status: 'checking' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated'; logoutWarning?: boolean }
  | { status: 'error'; message: string }

export interface AuthContextValue {
  state: AuthState
  refreshUser: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  register: (credentials: RegisterCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
