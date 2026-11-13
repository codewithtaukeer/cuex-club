import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CueX Application Error Boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-obsidian flex items-center justify-center p-4 text-warmivory">
          <div className="max-w-md w-full rounded-3xl bg-charcoal border border-champagne/30 p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="font-display text-2xl uppercase tracking-wider mb-2">Something Went Wrong</h2>
            <p className="text-xs text-mutedgrey mb-6 leading-relaxed">
              An unexpected error occurred while loading this view. You can refresh or return safely to the home page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-champagne text-obsidian text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-gold-glow hover:bg-warmgold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="flex-1 py-3 px-4 rounded-xl bg-obsidian border border-white/10 text-warmivory text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>CueX Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
