import { Component, ReactNode, ErrorInfo } from 'react';

/**
 * ErrorBoundary component props
 */
export interface ErrorBoundaryProps {
  /**
   * Child components to render
   */
  children: ReactNode;

  /**
   * Optional fallback UI to render when an error occurs
   */
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;

  /**
   * Optional callback when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ErrorBoundary component state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component
 * Catches React errors in child components and displays a fallback UI
 * Provides retry functionality and logs errors to console
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method called when an error is thrown in a child component
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been thrown
   * Used for logging and side effects
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Retry handler - resets error state to attempt re-render
   */
  handleRetry = () => {
    console.log('[ErrorBoundary] Retrying render after error');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Default fallback UI when no custom fallback is provided
   */
  renderDefaultFallback() {
    const { error, errorInfo } = this.state;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '32px',
          textAlign: 'center',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Error icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Error title */}
        <h2
          style={{
            fontSize: 'var(--fs-xl)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '12px',
          }}
        >
          Something went wrong
        </h2>

        {/* Error message */}
        <p
          style={{
            fontSize: 'var(--fs-md)',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            maxWidth: '400px',
          }}
        >
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>

        {/* Retry button */}
        <button
          className="flint-btn primary"
          onClick={this.handleRetry}
          aria-label="Retry"
          style={{
            marginBottom: '16px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          Try Again
        </button>

        {/* Error details (collapsible) */}
        {errorInfo && (
          <details
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--stroke)',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <summary
              style={{
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                fontSize: 'var(--fs-xs)',
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                fontFamily: 'monospace',
                lineHeight: '1.5',
              }}
            >
              {error?.stack}
              {'\n\n'}
              {errorInfo.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorInfo) {
      // Render custom fallback if provided, otherwise use default
      if (fallback) {
        return fallback(error, errorInfo, this.handleRetry);
      }
      return this.renderDefaultFallback();
    }

    // No error, render children normally
    return children;
  }
}
