import { Component } from "react"

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={errorContainer}>
          <div style={errorCard}>
            <h2 style={errorTitle}>Une erreur est survenue</h2>
            <p style={errorMessage}>
              L'application a rencontré une erreur. Veuillez rafraîchir la page.
            </p>
            {this.state.error && (
              <details style={errorDetails}>
                <summary>Détails techniques</summary>
                <pre style={errorPre}>{this.state.error.toString()}</pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={errorButton}
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const errorContainer = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  padding: "20px",
}

const errorCard = {
  background: "white",
  borderRadius: "16px",
  padding: "40px",
  maxWidth: "600px",
  boxShadow: "0 20px 42px rgba(0,0,0,0.1)",
  textAlign: "center",
}

const errorTitle = {
  margin: "0 0 16px 0",
  fontSize: "24px",
  fontWeight: 700,
  color: "#dc2626",
}

const errorMessage = {
  margin: "0 0 24px 0",
  fontSize: "16px",
  color: "#6b7280",
}

const errorDetails = {
  margin: "20px 0",
  textAlign: "left",
  fontSize: "14px",
}

const errorPre = {
  background: "#f3f4f6",
  padding: "12px",
  borderRadius: "8px",
  overflow: "auto",
  fontSize: "12px",
  color: "#1f2937",
}

const errorButton = {
  marginTop: "20px",
  padding: "12px 24px",
  background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
}
