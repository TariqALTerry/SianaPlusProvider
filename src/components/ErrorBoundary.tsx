import { Component, type ErrorInfo, type ReactNode } from 'react'
import { i18next } from '@/i18n'

interface Props {
  children: ReactNode
  /** Changing this key (e.g. the route path) resets the boundary. */
  resetKey?: string
}

interface State {
  error: Error | null
}

/** Keeps one broken page from blanking the whole shell. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error(error, info.componentStack)
  }

  override componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md rounded-lg border bg-surface p-6 text-center shadow-sm">
        <p className="font-semibold">{i18next.t('errors.pageCrashed')}</p>
        {import.meta.env.DEV && <pre className="mt-3 overflow-auto text-start text-xs text-muted-foreground" dir="ltr">{this.state.error.message}</pre>}
        <button type="button" className="mt-4 text-sm text-primary hover:underline" onClick={() => this.setState({ error: null })}>
          {i18next.t('actions.retry')}
        </button>
      </div>
    )
  }
}
