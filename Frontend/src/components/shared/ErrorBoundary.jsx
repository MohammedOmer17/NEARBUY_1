import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Button from '../ui/Button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-ink">
            {this.props.title || 'Something went wrong'}
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-mute">
            {this.props.message ||
              this.state.error?.message ||
              'An unexpected error occurred while displaying this section. Please try reloading.'}
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReset}
              className="gap-1.5 bg-gradient-to-r from-brand-600 to-pink-600 font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/'
              }}
              className="gap-1.5 font-semibold"
            >
              <Home className="h-3.5 w-3.5 text-mute" />
              Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
