import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", textAlign: "center", padding: "40px" }} role="alert">
            <h2 style={{
              color: "var(--text-primary)",
              marginTop: "0",
              marginBottom: "16px",
              fontSize: "24px",
              fontFamily: "var(--font-display)",
              fontWeight: "700"
            }}>Something went wrong</h2>
            <p style={{
              color: "var(--text-muted)",
              marginBottom: "24px",
              lineHeight: "1.5",
              fontSize: "14px"
            }}>
              An unexpected error occurred in the application. Please reload the page to try again.
            </p>
            <button 
              type="button"
              onClick={this.handleReload}
              className="btn-primary"
              style={{ margin: "0 auto", padding: "10px 24px" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
