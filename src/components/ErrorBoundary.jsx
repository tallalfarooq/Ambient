import { Component } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Global error boundary — catches any unhandled JS error in the React tree
 * and shows a recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center"
          style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.3)" }}>
          <RefreshCw className="w-7 h-7" style={{ color: "#1B8FA0" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-white/40 text-sm max-w-sm mb-8">
          An unexpected error occurred. Your designs are safe — just reload to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Reload app
        </button>
      </div>
    );
  }
}
