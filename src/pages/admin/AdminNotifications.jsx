import { useEffect, useMemo, useState } from "react"
import {
  FaBell,
  FaPaperPlane,
  FaSearch,
  FaUsers,
  FaUser,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import Table from "../../components/ui/Table"
import { AdminPage, AdminPanel } from "../../components/ui/AdminPage"
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

  useEffect(() => {
    loadUsers()
    loadNotifications()
  }, [])

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
    [notifications, usersById]
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

  const summary = useMemo(() => {
    const broadcasts = notifications.filter((entry) => entry.target_type === "all").length
    const targeted = notifications.filter((entry) => entry.target_type === "user").length
    const latestDate = notifications[0]?.created_at
    return [
      {
        label: "Notifications envoyées",
        value: notifications.length.toLocaleString("fr-FR"),
        icon: <FaBell />,
        accent: "#2563eb",
      },
      {
        label: "Diffusions globales",
        value: broadcasts.toLocaleString("fr-FR"),
        icon: <FaUsers />,
        accent: "#16a34a",
      },
      {
        label: "Envois ciblés",
        value: targeted.toLocaleString("fr-FR"),
        icon: <FaUser />,
        accent: "#7c3aed",
      },
      {
        label: "Dernier envoi",
        value: latestDate ? formatDate(latestDate) : "-",
        icon: <FaPaperPlane />,
        accent: "#ea580c",
      },
    ]
  }, [notifications])

  const guidanceItems = [
    "Utilisez un titre court et lisible.",
    "Preferez les messages cibles pour les actions sensibles.",
    "Consultez le detail d'un envoi pour verifier les echecs.",
  ]

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
    <AdminPage
      title="Notifications"
      subtitle="Suivez les campagnes envoyées, leurs cibles et le détail par destinataire dans une vue dédiée."
      stats={summary}
      aside={
        <AdminPanel
          title="Bonnes pratiques"
          subtitle="Quelques repères pour garder des envois clairs et fiables."
        >
          <div style={styles.guidanceList}>
            {guidanceItems.map((item) => (
              <div key={item} style={styles.guidanceItem}>
                <span style={styles.guidanceDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      }
      actions={
        <Button icon={<FaPaperPlane />} onClick={() => setComposerOpen(true)} fullWidth={isMobile}>
          Nouvelle notification
        </Button>
      }
    >
      <AdminPanel
        title="Historique des notifications"
        subtitle="Tableau centralisé des communications envoyées et des cibles concernées."
      >
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
      </AdminPanel>

      <button type="button" style={styles.fab} onClick={() => setComposerOpen(true)}>
        <FaPaperPlane />
        <span>Envoyer</span>
      </button>

      <Modal
        isOpen={composerOpen}
        onClose={() => {
          if (sending) return
          setComposerOpen(false)
        }}
        title="Envoyer une notification"
        size="lg"
        mobileFullscreen
      >
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.composerIntro}>
            <div style={styles.composerIntroIcon}>
              <FaPaperPlane size={18} />
            </div>
            <div>
              <div style={styles.composerIntroTitle}>Nouvelle campagne</div>
              <div style={styles.composerIntroText}>
                Choisissez votre cible et diffusez une communication instantanée.
              </div>
            </div>
          </div>

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
              rows={6}
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

          {form.targetType === "user" ? (
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
          ) : null}

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
        mobileFullscreen
      >
        {selectedNotification ? (
          <div style={styles.detailLayout}>
            <div style={styles.detailHero}>
              <div>
                <div style={styles.detailHeroLabel}>Message envoyé</div>
                <div style={styles.detailHeroTitle}>{selectedNotification.title}</div>
                <div style={styles.detailHeroText}>{selectedNotification.message}</div>
              </div>
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
                <div style={styles.detailLabel}>Succès</div>
                <div style={styles.detailValue}>{successCount}</div>
                <div style={styles.detailBadgeSuccess}>
                  <FaCheckCircle size={12} />
                  Livraisons confirmées
                </div>
              </div>
              <div style={styles.detailStatCard}>
                <div style={styles.detailLabel}>Échecs</div>
                <div style={styles.detailValue}>{failureCount}</div>
                <div style={styles.detailBadgeFailed}>
                  <FaExclamationTriangle size={12} />
                  À surveiller
                </div>
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
    </AdminPage>
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
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    padding: "clamp(22px, 3vw, 28px)",
    borderRadius: 28,
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.96) 52%, rgba(37,99,235,0.92) 100%)",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
    color: "#ffffff",
  },
  heroContent: {
    flex: "1 1 480px",
    minWidth: 0,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
  },
  heroTitle: {
    margin: "10px 0 0",
    fontSize: "clamp(28px, 5vw, 40px)",
    fontWeight: 800,
    letterSpacing: "-0.05em",
    lineHeight: 1.02,
  },
  heroSubtitle: {
    margin: "14px 0 0",
    maxWidth: 720,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.7,
    fontSize: 14,
  },
  summaryGridDesktop: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 18,
  },
  summaryGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
  },
  summaryCard: {
    minHeight: 156,
  },
  summaryCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  summaryValue: {
    marginTop: 24,
    fontSize: "clamp(24px, 4vw, 30px)",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#0f172a",
    lineHeight: 1.15,
  },
  summaryLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b",
  },
  tableShell: {
    padding: 20,
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
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    boxShadow: "0 18px 36px rgba(153, 27, 27, 0.28)",
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
  composerIntro: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },
  composerIntroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  composerIntroTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  composerIntroText: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  textarea: {
    width: "100%",
    minHeight: 160,
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    background: "rgba(255,255,255,0.96)",
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
    borderRadius: 20,
    background: "#ffffff",
    padding: 16,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    textAlign: "left",
    cursor: "pointer",
    color: "#334155",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  targetCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.08)",
    background: "#f8fbff",
  },
  targetTitle: {
    fontWeight: 800,
    marginBottom: 4,
    color: "#0f172a",
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
    borderRadius: 16,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  selectedUserName: {
    fontWeight: 800,
    color: "#0f172a",
  },
  selectedUserMeta: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
  },
  userList: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
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
    fontWeight: 800,
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
  detailHero: {
    borderRadius: 22,
    padding: 18,
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#ffffff",
  },
  detailHeroLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.68)",
  },
  detailHeroTitle: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  detailHeroText: {
    marginTop: 10,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.8)",
    whiteSpace: "pre-wrap",
  },
  detailStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  detailStatCard: {
    borderRadius: 18,
    background: "#ffffff",
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
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  detailBadgeSuccess: {
    marginTop: 10,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },
  detailBadgeFailed: {
    marginTop: 10,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
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
    borderRadius: 18,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    background: "#ffffff",
  },
  recipientIdentity: {
    flex: 1,
    minWidth: 220,
  },
  recipientName: {
    fontWeight: 800,
    color: "#0f172a",
  },
  recipientToken: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    wordBreak: "break-all",
    whiteSpace: "pre-wrap",
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
    borderRadius: 18,
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    background: "#f8fafc",
  },
  guidanceList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  guidanceItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
  },
  guidanceDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2563eb",
    marginTop: 6,
    flexShrink: 0,
  },
}
