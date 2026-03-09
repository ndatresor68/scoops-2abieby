import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from "react-icons/fa"
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
          <div style={{ color: color.icon, fontSize: "48px" }}>{Icon}</div>
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
  padding: "8px 0",
}

const iconContainer = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "20px",
  border: "2px solid",
}

const titleStyle = {
  margin: "0 0 12px 0",
  fontSize: "20px",
  fontWeight: 700,
  color: "#111827",
  textAlign: "center",
}

const messageStyle = {
  margin: "0 0 24px 0",
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center",
  lineHeight: 1.6,
}

const actions = {
  display: "flex",
  gap: 12,
  width: "100%",
  justifyContent: "flex-end",
}
