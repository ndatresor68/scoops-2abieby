import { createContext, useContext, useState } from "react"
import { FaCircleCheck, FaCircleExclamation, FaCircleInfo, FaXmark } from "react-icons/fa6"

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
    success: <FaCircleCheck />,
    error: <FaCircleExclamation />,
    warning: <FaCircleExclamation />,
    info: <FaCircleInfo />,
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
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
        padding: "14px 18px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        minWidth: "300px",
        maxWidth: "400px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        animation: "slideIn 0.3s ease",
      }}
    >
      <span style={{ fontSize: "20px", color: color.icon }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: color.text,
          padding: 4,
          display: "flex",
          alignItems: "center",
          opacity: 0.7,
        }}
        onMouseEnter={(e) => (e.target.style.opacity = 1)}
        onMouseLeave={(e) => (e.target.style.opacity = 0.7)}
      >
        <FaXmark size={14} />
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
