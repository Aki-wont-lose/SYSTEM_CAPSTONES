import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Catches render-time errors anywhere below it so a single bad page cannot blank
// the entire app. Shows the actual message + stack so the fault is diagnosable
// instead of an unexplained white screen.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-sti-gray-light dark:bg-slate-900">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover border border-black/5 dark:border-white/10 p-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="font-bold">Something went wrong on this page</h1>
            </div>
            <p className="text-sm text-sti-gray mb-4">
              The rest of the app is safe. Reload to try again — if it keeps happening, send the message below.
            </p>
            <pre className="text-xs bg-sti-gray-light dark:bg-slate-900 text-red-600 dark:text-red-300 rounded-xl p-3 overflow-auto max-h-48 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={this.handleReload}
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark"
            >
              <RotateCcw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
