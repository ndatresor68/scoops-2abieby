import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FaPaperPlane, FaRobot, FaTimes } from "react-icons/fa"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../supabaseClient"
import { useToast } from "./ui/Toast"

function getUserName(user) {
  return user?.nom || user?.email?.split("@")[0] || "Utilisateur"
}

async function fetchCount(queryBuilder) {
  const { count, error } = await queryBuilder
  if (error) throw error
  return count || 0
}

export default function AIChatModal({ onClose }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const scrollRef = useRef(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [executingAction, setExecutingAction] = useState(false)
  const [stats, setStats] = useState({
    production: 0,
    revenue: 0,
    agents: 0,
    centres: 0,
  })
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour. Je peux analyser vos volumes, revenus et structure terrain pour proposer des actions concrètes.",
    },
  ])

  const aiUser = useMemo(
    () => ({
      name: getUserName(user),
      role: user?.role || "Unknown",
    }),
    [user],
  )

  const loadStats = useCallback(async () => {
    if (!user) return

    try {
      const achatsQuery = supabase.from("achats").select("poids, montant")
      const agentsCountQuery = supabase
        .from("utilisateurs")
        .select("*", { count: "exact", head: true })
        .eq("role", "AGENT")
      const centresCountQuery = supabase.from("centres").select("*", { count: "exact", head: true })

      const [achatsResult, agentsCount, centresCount] = await Promise.all([
        achatsQuery,
        fetchCount(agentsCountQuery),
        fetchCount(centresCountQuery),
      ])

      if (achatsResult.error) throw achatsResult.error

      const achats = achatsResult.data || []
      const production = achats.reduce((sum, item) => sum + (Number(item.poids) || 0), 0)
      const revenue = achats.reduce((sum, item) => sum + (Number(item.montant) || 0), 0)

      setStats({
        production: Math.round(production),
        revenue: Math.round(revenue),
        agents: agentsCount,
        centres: centresCount,
      })
    } catch (error) {
      setStats({
        production: 0,
        revenue: 0,
        agents: 0,
        centres: 0,
      })
    }
  }, [user])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  async function sendMessage() {
    const trimmedInput = input.trim()
    if (!trimmedInput || sending) return

    const userMessage = { role: "user", content: trimmedInput }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSending(true)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
          user: aiUser,
          stats,
        }),
      })

      const data = await res.json().catch(() => ({}))

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply || "Aucune réponse disponible.",
          action: data?.action || null,
        },
      ])

      if (!res.ok) {
        showToast(data?.reply || "Erreur lors de la requête IA", "error")
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Je ne peux pas répondre pour le moment. Reessayez dans un instant.",
        },
      ])
      showToast("Impossible de contacter l'assistant IA", "error")
    } finally {
      setSending(false)
    }
  }

  async function handleConfirmAction(action, index) {
    if (!action || executingAction) return

    try {
      setExecutingAction(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      const res = await fetch("/api/admin-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(action),
      })

      const data = await res.json().catch(() => ({}))

      setMessages((prev) =>
        prev.map((message, currentIndex) =>
          currentIndex === index ? { ...message, action: null } : message,
        ),
      )

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply || (res.ok ? "Action exécutée." : "Action impossible."),
        },
      ])

      if (!res.ok) {
        showToast(data?.reply || "Echec de l'action admin", "error")
      } else {
        showToast(data?.reply || "Action exécutée", "success")
      }
    } catch (error) {
      showToast("Impossible d'exécuter l'action admin", "error")
    } finally {
      setExecutingAction(false)
    }
  }

  function handleCancelAction(index) {
    setMessages((prev) =>
      prev.map((message, currentIndex) =>
        currentIndex === index ? { ...message, action: null } : message,
      ),
    )
  }

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Assistant IA">
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <div style={styles.headerIcon}>
              <FaRobot size={16} />
            </div>
            <div>
              <div style={styles.headerTitle}>Assistant IA</div>
              <div style={styles.headerSubtitle}>Conseils business pour la cooperative</div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton} aria-label="Close AI chat">
            <FaTimes />
          </button>
        </div>

        <div style={styles.contextBar}>
          <span>{aiUser.role}</span>
          <span>{stats.production.toLocaleString("fr-FR")} kg</span>
          <span>{stats.revenue.toLocaleString("fr-FR")} FCFA</span>
        </div>

        <div ref={scrollRef} style={styles.messages}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                ...styles.messageRow,
                justifyContent: message.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...styles.messageBubble,
                  ...(message.role === "user" ? styles.userBubble : styles.assistantBubble),
                }}
              >
                <div>{message.content}</div>
                {message.action ? (
                  <div style={styles.actionBox}>
                    <div style={styles.actionTitle}>Action detected: {message.action.type}</div>
                    <div style={styles.actionTarget}>Target: {message.action.target}</div>
                    <div style={styles.actionButtons}>
                      <button
                        type="button"
                        onClick={() => handleConfirmAction(message.action, index)}
                        disabled={executingAction}
                        style={{ ...styles.actionButton, ...styles.confirmButton }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelAction(index)}
                        disabled={executingAction}
                        style={{ ...styles.actionButton, ...styles.cancelButton }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {sending ? (
            <div style={styles.messageRow}>
              <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>Analyse en cours...</div>
            </div>
          ) : null}
        </div>

        <div style={styles.composer}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Posez une question sur la production, les revenus ou la performance..."
            style={styles.input}
            rows={3}
          />
          <button type="button" onClick={sendMessage} disabled={sending || !input.trim()} style={styles.sendButton}>
            <FaPaperPlane size={14} />
          </button>
        </div>
      </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.24)",
    zIndex: 4998,
  },
  modal: {
    position: "fixed",
    right: 20,
    bottom: 92,
    width: "min(380px, calc(100vw - 24px))",
    height: "min(560px, calc(100vh - 128px))",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 4999,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 18px",
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.16)",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 800,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: "none",
    background: "rgba(255,255,255,0.14)",
    color: "#ffffff",
    cursor: "pointer",
  },
  contextBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 16px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
    background: "#fff7f7",
    color: "#7f1d1d",
    fontSize: 12,
    fontWeight: 700,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  messageRow: {
    display: "flex",
  },
  messageBubble: {
    maxWidth: "86%",
    borderRadius: 14,
    padding: "10px 12px",
    lineHeight: 1.5,
    fontSize: 14,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#dc2626",
    color: "#ffffff",
  },
  assistantBubble: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },
  actionBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid rgba(226, 232, 240, 0.95)",
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#991b1b",
  },
  actionTarget: {
    marginTop: 4,
    fontSize: 12,
    color: "#475569",
  },
  actionButtons: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmButton: {
    background: "#991b1b",
    color: "#ffffff",
  },
  cancelButton: {
    background: "#e2e8f0",
    color: "#0f172a",
  },
  composer: {
    display: "flex",
    gap: 10,
    padding: 14,
    borderTop: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
  },
  input: {
    flex: 1,
    borderRadius: 14,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "12px 14px",
    resize: "none",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    cursor: "pointer",
    alignSelf: "flex-end",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}
