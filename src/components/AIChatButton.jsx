import { useState } from "react"
import { FaRobot } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import AIChatModal from "./AIChatModal"

export default function AIChatButton() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)

  if (loading || !user) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        style={styles.button}
      >
        <FaRobot size={22} />
      </button>

      {open ? <AIChatModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

const styles = {
  button: {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 5000,
    boxShadow: "0 20px 40px rgba(153, 27, 27, 0.28)",
  },
}
