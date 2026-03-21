import { useEffect, useMemo, useState } from "react"
import { FaShieldAlt, FaTimesCircle } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"
import { listAllActiveSessions, revokeSession } from "../../services/deviceSessionService"

export default function AdminSessions() {
  const { showToast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      setLoading(true)
      const data = await listAllActiveSessions()
      setSessions(data)
    } catch (error) {
      showToast(error.message || "Impossible de charger les sessions", "error")
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(sessionId) {
    try {
      await revokeSession(sessionId)
      showToast("Session révoquée", "success")
      loadSessions()
    } catch (error) {
      showToast(error.message || "Impossible de révoquer la session", "error")
    }
  }

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sessions

    return sessions.filter((session) =>
      [session.user_id, session.device_id, session.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [search, sessions])

  return (
    <div style={page}>
      <Card title="Sessions actives">
        <div style={toolbar}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par user_id, device_id ou statut"
            style={searchInput}
          />
        </div>

        {loading ? (
          <div style={emptyState}>Chargement des sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div style={emptyState}>Aucune session trouvée.</div>
        ) : (
          <div style={list}>
            {filteredSessions.map((session) => (
              <div key={session.id} style={row}>
                <div style={rowContent}>
                  <div style={rowTitle}>
                    <FaShieldAlt size={14} />
                    <strong>{session.user_id}</strong>
                  </div>
                  <div style={rowMeta}>
                    <span>{session.device_id}</span>
                    <span>{session.status || "active"}</span>
                    <span>{session.last_active ? new Date(session.last_active).toLocaleString("fr-FR") : "-"}</span>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleRevoke(session.id)} icon={<FaTimesCircle />}>
                  Révoquer
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const page = {
  display: "grid",
  gap: 20,
}

const toolbar = {
  marginBottom: 16,
}

const searchInput = {
  width: "100%",
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid #dbe2ea",
  padding: "0 14px",
  fontSize: 14,
}

const list = {
  display: "grid",
  gap: 12,
}

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "14px 16px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
}

const rowContent = {
  display: "grid",
  gap: 6,
}

const rowTitle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#0f172a",
}

const rowMeta = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  color: "#64748b",
  fontSize: 12,
  wordBreak: "break-all",
}

const emptyState = {
  padding: "18px 12px",
  borderRadius: 12,
  background: "#f8fafc",
  color: "#64748b",
  textAlign: "center",
}
