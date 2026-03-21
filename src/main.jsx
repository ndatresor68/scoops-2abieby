import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import { AuthProvider } from "./context/AuthContext"
import { SettingsProvider } from "./context/SettingsContext"
import { ToastProvider } from "./components/ui/Toast"
import { ErrorBoundary } from "./components/ErrorBoundary"
import "./index.css"

if (typeof console !== "undefined" && import.meta.env.PROD) {
  console.log = () => {}
  console.debug = () => {}
  console.warn = () => {}
}

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found. Make sure index.html has a div with id='root'")
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
