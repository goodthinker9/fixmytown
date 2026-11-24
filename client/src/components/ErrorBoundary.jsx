// React error boundary: catches unhandled render errors so the whole app
// doesn't go blank. Shows a friendly recovery screen instead.
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to an error tracking service (Sentry etc.).
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to home so the broken component unmounts.
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <div className="error-boundary__icon" aria-hidden="true">
            <AlertTriangle size={48} strokeWidth={1.5} />
          </div>
          <h1 className="error-boundary__title">Something went wrong</h1>
          <p className="error-boundary__desc">
            An unexpected error occurred. The team has been notified.
            Try refreshing or going back to the home page.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre className="error-boundary__detail">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            className="btn btn--primary btn--icon"
            onClick={this.handleReset}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Go to home
          </button>
        </div>
      </div>
    );
  }
}
