import { FaShieldAlt } from "react-icons/fa"
import OpportunitiesPage from "../Opportunities"
import { useAuth } from "../../context/AuthContext"

export default function AdminOpportunities() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div style={styles.restrictedState}>
        <FaShieldAlt size={40} style={{ color: "#dc2626" }} />
        <h2 style={styles.title}>Accès administrateur requis</h2>
        <p style={styles.text}>Cette page est réservée aux administrateurs.</p>
      </div>
    )
  }

  return <OpportunitiesPage />
}

const styles = {
  restrictedState: {
    minHeight: 320,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    textAlign: "center",
    padding: 24,
    borderRadius: 24,
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 24,
  },
  text: {
    margin: 0,
    color: "#64748b",
  },
}
