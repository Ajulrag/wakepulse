import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../api/auth'
import { ApiRequestError } from '../api/request'
import { AuthContext, type AuthState } from './auth-context'
import type { LoginCredentials, RegisterCredentials } from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
}

function getSafeAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  return 'Unable to verify your session. Please try again.'
}

function isUnauthenticatedError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    (error.status === 401 || error.status === 403)
  )
}

function getAuthFailureState(
  error: unknown,
  previousState?: AuthState,
): AuthState {
  if (isUnauthenticatedError(error)) {
    return { status: 'unauthenticated' }
  }

  if (previousState?.status === 'authenticated') {
    return previousState
  }

  return {
    status: 'error',
    message: getSafeAuthErrorMessage(error),
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'checking' })
  const currentRequest = useRef<AbortController | null>(null)
  const logoutInProgress = useRef(false)

  const verifyCurrentUser = useCallback(
    async (controller: AbortController, previousState?: AuthState) => {
      try {
        const user = await getCurrentUser(controller.signal)

        if (!controller.signal.aborted) {
          setState({ status: 'authenticated', user })
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return
        }

        setState(getAuthFailureState(error, previousState))
      } finally {
        if (currentRequest.current === controller) {
          currentRequest.current = null
        }
      }
    },
    [],
  )

  const refreshUser = useCallback(async () => {
    const previousState = state
    currentRequest.current?.abort()
    const controller = new AbortController()
    currentRequest.current = controller

    if (previousState.status !== 'authenticated') {
      setState({ status: 'checking' })
    }

    await verifyCurrentUser(controller, previousState)
  }, [state, verifyCurrentUser])

  useEffect(() => {
    const controller = new AbortController()
    currentRequest.current = controller

    getCurrentUser(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) {
          setState({ status: 'authenticated', user })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState(getAuthFailureState(error))
        }
      })
      .finally(() => {
        if (currentRequest.current === controller) {
          currentRequest.current = null
        }
      })

    return () => {
      controller.abort()
      if (currentRequest.current === controller) {
        currentRequest.current = null
      }
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const user = await loginUser(credentials)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const user = await registerUser(credentials)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const logout = useCallback(async () => {
    if (logoutInProgress.current) {
      return
    }

    logoutInProgress.current = true
    currentRequest.current?.abort()
    currentRequest.current = null
    let serverConfirmed = false

    try {
      await logoutUser()
      serverConfirmed = true
    } catch {
      serverConfirmed = false
    } finally {
      setState(
        serverConfirmed
          ? { status: 'unauthenticated' }
          : { status: 'unauthenticated', logoutWarning: true },
      )
      logoutInProgress.current = false
    }
  }, [])

  const value = useMemo(
    () => ({ state, refreshUser, login, register, logout }),
    [state, refreshUser, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
