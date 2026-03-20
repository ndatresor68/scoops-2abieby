import { createContext, useContext, useState } from "react"
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa"

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "min(420px, calc(100vw - 24px))",
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  const icons = {
    success: <FaCheckCircle />,
    error: <FaExclamationCircle />,
    warning: <FaExclamationCircle />,
    info: <FaInfoCircle />,
  }

  const colors = {
    success: { bg: "#ecfdf3", border: "#86efac", text: "#166534", icon: "#16a34a" },
    error: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", icon: "#dc2626" },
    warning: { bg: "#fffbeb", border: "#fde047", text: "#a16207", icon: "#f59e0b" },
    info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "#2563eb" },
  }

  const color = colors[toast.type] || colors.info

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${color.bg}, #ffffff)`,
        border: `1px solid ${color.border}`,
        color: color.text,
        padding: "14px 16px",
        borderRadius: 18,
        boxShadow: "0 22px 44px rgba(15, 23, 42, 0.16)",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "slideIn 0.3s ease",
        boxSizing: "border-box",
        backdropFilter: "blur(12px)",
      }}
    >
      <span style={{ fontSize: 18, color: color.icon, marginTop: 1 }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: color.text,
          padding: 0,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
          marginTop: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
      >
        <FaTimes size={14} />
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
