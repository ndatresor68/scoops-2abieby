import { useEffect, useMemo, useState } from "react"
import { FaBell, FaPaperPlane, FaSearch, FaUsers, FaUser } from "react-icons/fa"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import Table from "../../components/ui/Table"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { supabase } from "../../supabaseClient"

function formatDate(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function truncate(text, maxLength = 80) {
  if (!text) return "-"
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function getUserLabel(user) {
  if (!user) return "Utilisateur inconnu"
  return user.nom || user.email || user.id
}

export default function AdminNotifications() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState([])
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sending, setSending] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [detailLogs, setDetailLogs] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetType: "all",
    targetUserId: "",
  })

  async function loadUsers() {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom, email, role")
        .order("nom", { ascending: true })

      if (error) throw error

      const rows = data || []
      setUsers(rows)
      setUsersById(Object.fromEntries(rows.map((row) => [row.id, row])))
    } catch (error) {
      console.error("[AdminNotifications] Failed to load users:", error)
      showToast("Impossible de charger les utilisateurs", "error")
    } finally {
      setLoadingUsers(false)
    }
  }

  async function loadNotifications() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, admin_id, target_type, target_user_id, created_at")
        .not("admin_id", "is", null)
        .not("target_type", "is", null)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error("[AdminNotifications] Failed to load notifications:", error)
      showToast("Impossible de charger les notifications", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    loadNotifications()
  }, [])

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return users
    return users.filter((candidate) =>
      [candidate.nom, candidate.email, candidate.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [userSearch, users])

  const selectedTargetUser = form.targetUserId ? usersById[form.targetUserId] : null

  const tableData = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        adminName: getUserLabel(usersById[notification.admin_id]),
        targetLabel:
          notification.target_type === "all"
            ? "Tous les utilisateurs"
            : `Utilisateur spécifique · ${getUserLabel(usersById[notification.target_user_id])}`,
      })),
    [notifications, usersById],
  )

  const detailRecipients = useMemo(() => {
    const grouped = new Map()

    for (const log of detailLogs) {
      const key = log.user_id || log.token
      const current = grouped.get(key) || {
        id: key,
        user_id: log.user_id,
        recipientName: getUserLabel(usersById[log.user_id]),
        successCount: 0,
        failureCount: 0,
        tokens: [],
        lastCreatedAt: log.created_at,
        errors: [],
      }

      if (log.status === "success") {
        current.successCount += 1
      } else {
        current.failureCount += 1
      }

      current.tokens.push(log.token)
      if (log.error_message) current.errors.push(log.error_message)
      if (!current.lastCreatedAt || new Date(log.created_at) > new Date(current.lastCreatedAt)) {
        current.lastCreatedAt = log.created_at
      }

      grouped.set(key, current)
    }

    return [...grouped.values()]
  }, [detailLogs, usersById])

  const successCount = detailLogs.filter((log) => log.status === "success").length
  const failureCount = detailLogs.filter((log) => log.status === "failed").length

  async function openNotificationDetail(notification) {
    setSelectedNotification(notification)
    setDetailOpen(true)
    setDetailLoading(true)

    try {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("id, user_id, token, status, error_message, created_at")
        .eq("notification_id", notification.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDetailLogs(data || [])
    } catch (error) {
      console.error("[AdminNotifications] Failed to load notification detail:", error)
      showToast("Impossible de charger le détail", "error")
      setDetailLogs([])
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Le titre et le message sont requis", "error")
      return
    }

    if (form.targetType === "user" && !form.targetUserId) {
      showToast("Sélectionnez un utilisateur", "error")
      return
    }

    try {
      setSending(true)
      const response = await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          target: form.targetType,
          user_id: form.targetType === "user" ? form.targetUserId : null,
          admin_id: user?.id || null,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        console.error("[AdminNotifications] Send failed:", result)
        showToast(result.error || "Erreur lors de l'envoi", "error")
        return
      }

      const recipientCount =
        typeof result.recipientUserCount === "number"
          ? result.recipientUserCount
          : typeof result.sentTotal === "number"
            ? result.sentTotal
            : 0

      showToast(`Notification envoyée à ${recipientCount} utilisateurs`, "success")
      setComposerOpen(false)
      setForm({
        title: "",
        message: "",
        targetType: "all",
        targetUserId: "",
      })
      setUserSearch("")
      await loadNotifications()
    } catch (error) {
      console.error("[AdminNotifications] Send exception:", error)
      showToast("Erreur lors de l'envoi de la notification", "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Notifications</h1>
          <p style={styles.subtitle}>
            Gérez les notifications administrateur, suivez les envois et consultez les statuts
            par destinataire.
          </p>
        </div>
      </div>

      <div style={styles.tableCard}>
        <Table
          data={tableData}
          loading={loading}
          searchable
          searchPlaceholder="Rechercher par titre, message ou expéditeur"
          searchFields={["title", "message", "adminName", "targetLabel"]}
          pageSize={10}
          onRowClick={openNotificationDetail}
          emptyMessage="Aucune notification envoyée"
          columns={[
            {
              key: "title",
              label: "Titre",
              render: (value) => <span style={styles.cellPrimary}>{value || "-"}</span>,
            },
            {
              key: "message",
              label: "Message",
              render: (value) => <span>{truncate(value, isMobile ? 56 : 90)}</span>,
            },
            {
              key: "adminName",
              label: "Envoyé par",
            },
            {
              key: "targetLabel",
              label: "Cible",
            },
            {
              key: "created_at",
              label: "Date",
              render: (value) => formatDate(value),
            },
          ]}
        />
      </div>

      <button type="button" style={styles.fab} onClick={() => setComposerOpen(true)}>
        <FaPaperPlane />
        <span>Envoyer une notification</span>
      </button>

      <Modal
        isOpen={composerOpen}
        onClose={() => {
          if (sending) return
          setComposerOpen(false)
        }}
        title="Envoyer une notification"
        size="lg"
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          <Input
            label="Titre"
            required
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
            placeholder="Titre de la notification"
          />

          <div style={styles.field}>
            <label style={styles.label}>Message</label>
            <textarea
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Rédigez le message à envoyer"
              style={styles.textarea}
              rows={5}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Cible</label>
            <div style={styles.targetGrid}>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, targetType: "all", targetUserId: "" }))}
                style={{
                  ...styles.targetCard,
                  ...(form.targetType === "all" ? styles.targetCardActive : {}),
                }}
              >
                <FaUsers size={18} />
                <div>
                  <div style={styles.targetTitle}>Tous les utilisateurs</div>
                  <div style={styles.targetText}>Diffuse la notification à tous les appareils actifs.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, targetType: "user" }))}
                style={{
                  ...styles.targetCard,
                  ...(form.targetType === "user" ? styles.targetCardActive : {}),
                }}
              >
                <FaUser size={18} />
                <div>
                  <div style={styles.targetTitle}>Utilisateur spécifique</div>
                  <div style={styles.targetText}>Cible un utilisateur et tous ses appareils actifs.</div>
                </div>
              </button>
            </div>
          </div>

          {form.targetType === "user" && (
            <div style={styles.userPicker}>
              <Input
                label="Rechercher un utilisateur"
                value={userSearch}
                onChange={setUserSearch}
                placeholder="Nom, email ou rôle"
                icon={<FaSearch />}
              />

              {selectedTargetUser ? (
                <div style={styles.selectedUser}>
                  <div>
                    <div style={styles.selectedUserName}>{getUserLabel(selectedTargetUser)}</div>
                    <div style={styles.selectedUserMeta}>{selectedTargetUser.email || "-"}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((current) => ({ ...current, targetUserId: "" }))}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div style={styles.userList}>
                  {loadingUsers ? (
                    <div style={styles.userListEmpty}>Chargement des utilisateurs...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={styles.userListEmpty}>Aucun utilisateur trouvé</div>
                  ) : (
                    filteredUsers.slice(0, 8).map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        style={styles.userOption}
                        onClick={() =>
                          setForm((current) => ({ ...current, targetUserId: candidate.id }))
                        }
                      >
                        <div style={styles.userOptionName}>{getUserLabel(candidate)}</div>
                        <div style={styles.userOptionMeta}>
                          {candidate.email || "-"} {candidate.role ? `• ${candidate.role}` : ""}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div style={styles.formActions}>
            <Button variant="secondary" onClick={() => setComposerOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button type="submit" icon={<FaPaperPlane />} disabled={sending}>
              {sending ? "Envoi en cours..." : "Envoyer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedNotification(null)
          setDetailLogs([])
        }}
        title="Détail de la notification"
        size="lg"
      >
        {selectedNotification ? (
          <div style={styles.detailLayout}>
            <div style={styles.detailBlock}>
              <div style={styles.detailLabel}>Titre</div>
              <div style={styles.detailValue}>{selectedNotification.title}</div>
            </div>

            <div style={styles.detailBlock}>
              <div style={styles.detailLabel}>Message</div>
              <div style={styles.detailMessage}>{selectedNotification.message}</div>
            </div>

            <div style={styles.detailStats}>
              <div style={styles.detailStatCard}>
                <div style={styles.detailLabel}>Expéditeur</div>
                <div style={styles.detailValue}>
                  {getUserLabel(usersById[selectedNotification.admin_id])}
                </div>
              </div>
              <div style={styles.detailStatCard}>
                <div style={styles.detailLabel}>Cible</div>
                <div style={styles.detailValue}>
                  {selectedNotification.target_type === "all"
                    ? "Tous les utilisateurs"
                    : getUserLabel(usersById[selectedNotification.target_user_id])}
                </div>
              </div>
              <div style={styles.detailStatCard}>
                <div style={styles.detailLabel}>Envois réussis</div>
                <div style={styles.detailValue}>{successCount}</div>
              </div>
              <div style={styles.detailStatCard}>
                <div style={styles.detailLabel}>Envois échoués</div>
                <div style={styles.detailValue}>{failureCount}</div>
              </div>
            </div>

            <div style={styles.recipientsHeader}>
              <h3 style={styles.recipientsTitle}>Destinataires</h3>
              <span style={styles.recipientsCount}>{detailRecipients.length} utilisateurs</span>
            </div>

            <div style={styles.recipientList}>
              {detailLoading ? (
                <div style={styles.recipientEmpty}>Chargement du détail...</div>
              ) : detailRecipients.length === 0 ? (
                <div style={styles.recipientEmpty}>Aucun log de notification disponible.</div>
              ) : (
                detailRecipients.map((recipient) => (
                  <div key={recipient.id} style={styles.recipientRow}>
                    <div style={styles.recipientIdentity}>
                      <div style={styles.recipientName}>{recipient.recipientName}</div>
                      <div style={styles.recipientToken}>
                        {recipient.tokens.length} appareil(s)
                        <br />
                        {recipient.tokens.join("\n")}
                      </div>
                    </div>
                    <div style={styles.recipientMeta}>
                      <span style={{ ...styles.statusBadge, ...styles.statusSuccess }}>
                        {recipient.successCount} succès
                      </span>
                      <span style={{ ...styles.statusBadge, ...styles.statusFailed }}>
                        {recipient.failureCount} échec
                      </span>
                      <span style={styles.recipientDate}>{formatDate(recipient.lastCreatedAt)}</span>
                      {recipient.errors.length ? (
                        <span style={styles.recipientError}>
                          {recipient.errors[0]}
                          {recipient.errors.length > 1 ? ` (+${recipient.errors.length - 1})` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    position: "relative",
    minHeight: "calc(100vh - 140px)",
    paddingBottom: 96,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    lineHeight: 1.6,
    maxWidth: 760,
  },
  tableCard: {
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), #ffffff)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: 16,
  },
  cellPrimary: {
    fontWeight: 700,
    color: "#0f172a",
  },
  fab: {
    position: "fixed",
    right: 24,
    bottom: 24,
    border: "none",
    borderRadius: 999,
    background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
    color: "#ffffff",
    boxShadow: "0 18px 36px rgba(122, 31, 31, 0.32)",
    minHeight: 56,
    padding: "0 22px",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    cursor: "pointer",
    zIndex: 1200,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  },
  textarea: {
    width: "100%",
    minHeight: 140,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.6,
    boxSizing: "border-box",
  },
  targetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  targetCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    padding: 16,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    textAlign: "left",
    cursor: "pointer",
    color: "#334155",
  },
  targetCardActive: {
    borderColor: "#7a1f1f",
    boxShadow: "0 0 0 3px rgba(122, 31, 31, 0.08)",
    background: "#fff8f8",
  },
  targetTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  targetText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  userPicker: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  selectedUser: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  selectedUserName: {
    fontWeight: 700,
    color: "#0f172a",
  },
  selectedUserMeta: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
  },
  userList: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    maxHeight: 280,
    overflowY: "auto",
  },
  userListEmpty: {
    padding: 16,
    textAlign: "center",
    color: "#64748b",
  },
  userOption: {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    background: "#ffffff",
    padding: "14px 16px",
    textAlign: "left",
    cursor: "pointer",
  },
  userOptionName: {
    fontWeight: 700,
    color: "#0f172a",
  },
  userOptionMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },
  detailLayout: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  detailBlock: {
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  detailMessage: {
    color: "#334155",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  detailStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  detailStatCard: {
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: 16,
  },
  recipientsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  recipientsTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  recipientsCount: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
  },
  recipientList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  recipientRow: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  recipientIdentity: {
    flex: 1,
    minWidth: 220,
  },
  recipientName: {
    fontWeight: 700,
    color: "#0f172a",
  },
  recipientToken: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    wordBreak: "break-all",
  },
  recipientMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    maxWidth: 280,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  statusSuccess: {
    background: "#dcfce7",
    color: "#166534",
  },
  statusFailed: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  recipientDate: {
    fontSize: 12,
    color: "#64748b",
  },
  recipientError: {
    fontSize: 12,
    color: "#b91c1c",
    textAlign: "right",
    wordBreak: "break-word",
  },
  recipientEmpty: {
    border: "1px dashed #cbd5e1",
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
  },
}
