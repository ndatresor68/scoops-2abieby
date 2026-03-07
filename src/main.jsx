import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import { AuthProvider } from "./context/AuthContext"
import { ToastProvider } from "./components/ui/Toast"
import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
