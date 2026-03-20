import { FaExclamationTriangle, FaInfoCircle } from "react-icons/fa"
import Modal from "./Modal"
import Button from "./Button"

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmation",
  message = "Êtes-vous sûr de vouloir continuer ?",
  type = "warning", // warning, danger, info
  confirmText = "Confirmer",
  cancelText = "Annuler",
  loading = false,
}) {
  if (!isOpen) return null

  const icons = {
    warning: <FaExclamationTriangle />,
    danger: <FaExclamationTriangle />,
    info: <FaInfoCircle />,
  }

  const colors = {
    warning: { icon: "#f59e0b", bg: "#fffbeb", border: "#fde047" },
    danger: { icon: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
    info: { icon: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
  }

  const color = colors[type] || colors.warning
  const Icon = icons[type] || icons.warning

  function handleConfirm() {
    onConfirm?.()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div style={container}>
        <div style={{ ...iconContainer, background: color.bg, borderColor: color.border }}>
          <div style={{ color: color.icon, fontSize: 42 }}>{Icon}</div>
        </div>
        <h3 style={titleStyle}>{title}</h3>
        <p style={messageStyle}>{message}</p>
        <div style={actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={type === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Traitement..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "8px 4px",
}

const iconContainer = {
  width: 88,
  height: 88,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
  border: "2px solid",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
}

const titleStyle = {
  margin: "0 0 12px 0",
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a",
  textAlign: "center",
  letterSpacing: "-0.03em",
}

const messageStyle = {
  margin: "0 0 24px 0",
  fontSize: 14,
  color: "#64748b",
  textAlign: "center",
  lineHeight: 1.6,
  maxWidth: 360,
}

const actions = {
  display: "flex",
  gap: 12,
  width: "100%",
  justifyContent: "flex-end",
  flexWrap: "wrap",
}
