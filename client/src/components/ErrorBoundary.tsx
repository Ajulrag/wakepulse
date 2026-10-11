import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorPage } from './ErrorPage'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('WakePulse encountered an unexpected application error.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          variant="application"
          onRetry={() => window.location.reload()}
          showThemeToggle={false}
        />
      )
    }

    return this.props.children
  }
}
