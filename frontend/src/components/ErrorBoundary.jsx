// frontend/src/components/ErrorBoundary.jsx
// Catches rendering errors so a single broken page doesn't blank the whole app.
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Send to terminal via existing log pipeline
    try {
      fetch("/api/posts/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "[ERROR BOUNDARY] " + (error?.message || String(error))
        })
      }).catch(() => {});
    } catch {}
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-scroll">
          <div className="page-container" style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))",
              borderRadius: 20,
              padding: 32,
              border: "1px solid rgba(139,92,246,0.3)",
              maxWidth: 400,
              margin: "0 auto"
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Something went wrong
              </h2>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
                This page hit an error. Your data is safe.
              </p>
              <button
                onClick={this.handleReset}
                className="primary-button"
                style={{ marginRight: 8 }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="outline-button"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
