import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// ErrorBoundary uses plain HTML/CSS instead of Tamagui components
// This is critical because if the error is theme-related (e.g., "Missing theme"),
// using Tamagui components in the fallback would cause a cascade failure
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Plain HTML/CSS fallback - no Tamagui dependencies
      return (
        <div style={styles.container}>
          <div style={styles.iconContainer}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div style={styles.textContainer}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.description}>
              An unexpected error occurred. Please try again or restart the application.
            </p>
          </div>

          {this.state.error && (
            <div style={styles.errorBox}>
              <code style={styles.errorText}>
                {this.state.error.message}
              </code>
            </div>
          )}

          <div style={styles.buttonContainer}>
            <button
              style={styles.primaryButton}
              onClick={this.handleReset}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(215, 83%, 55%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(215, 83%, 50%)'
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: '8px' }}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Try Again
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => window.location.reload()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(215, 15%, 30%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(215, 15%, 20%)'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Inline styles to avoid any CSS-in-JS dependencies
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    backgroundColor: '#1a1a2e',
    minHeight: '100vh',
    gap: '24px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: 'hsla(0, 84%, 60%, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  errorBox: {
    backgroundColor: 'hsl(215, 15%, 15%)',
    borderRadius: '8px',
    padding: '16px',
    maxWidth: '500px',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorText: {
    fontSize: '12px',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Code", monospace',
    color: 'hsl(0, 84%, 60%)',
    wordBreak: 'break-word',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: 'hsl(215, 83%, 50%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#9ca3af',
    backgroundColor: 'hsl(215, 15%, 20%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
}
