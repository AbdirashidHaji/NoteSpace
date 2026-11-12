import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/** Catches render errors anywhere below it and shows a friendly recovery screen. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6 dark:bg-surface-dark">
          <div className="card max-w-md p-8 text-center animate-slide-up">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
              <AlertTriangle className="text-red-500" size={22} />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              An unexpected error occurred while rendering this page. Your data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-6"
              type="button"
            >
              <RotateCcw size={15} /> Reload NoteSpace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
