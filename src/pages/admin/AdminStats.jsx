import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaBuilding, FaUserTie, FaBox, FaCheckCircle, FaUserSlash, FaBan, FaWeightHanging, FaUserFriends, FaDollarSign, FaPaperPlane } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Modal from "../../components/ui/Modal"
import Input from "../../components/ui/Input"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { broadcastNotification } from "../../utils/notifications"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function AdminStats() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    bannedUsers: 0,
    centres: 0,
    producteurs: 0,
    agents: 0,
    totalPoids: 0,
    totalTransactions: 0,
    totalMontant: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [poidsParCentre, setPoidsParCentre] = useState([])
  const [evolutionPoids, setEvolutionPoids] = useState([])
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [sendingNotification, setSendingNotification] = useState(false)
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
  })
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")

  // Responsive grid: 2 columns (mobile), 3 (tablet), 4 (desktop)
  const gridStyle = isMobile
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        width: "100%",
      }
    : isTablet
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        width: "100%",
      }
    : {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 20,
        width: "100%",
      }

  useEffect(() => {
    fetchStats()
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchStats()
    }, 30000)
    
    return () => clearInterval(refreshInterval)
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      console.log("[AdminStats] ===== FETCHING STATISTICS =====")

      // Fetch counts with timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Stats timeout")), 15000)
      )

      const statsPromise = Promise.all([
        // Fetch ALL users without any filters
        supabase.from("utilisateurs").select("*"),
        supabase.from("centres").select("id, nom"),
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("poids, montant, centre_id, date_pesee, created_at"),
        supabase.from("utilisateurs").select("id").eq("role", "AGENT"),
      ])
      
      console.log("[AdminStats] 🔍 Executing query: supabase.from('utilisateurs').select('*')")

      const [usersRes, centresRes, producteursRes, achatsRes, agentsRes] = await Promise.race([
        statsPromise,
        timeoutPromise,
      ]).catch((err) => {
        console.error("[AdminStats] ❌ Error fetching stats:", err)
        return [
          { data: [], error: err },
          { data: [] },
          { count: 0 },
          { data: [] },
          { data: [] },
        ]
      })

      // Log users query result
      console.log("[AdminStats] Users query result:", {
        dataLength: usersRes?.data?.length || 0,
        error: usersRes?.error,
        hasData: !!usersRes?.data,
        errorCode: usersRes?.error?.code,
        errorMessage: usersRes?.error?.message,
      })

      if (usersRes?.error) {
        console.error("[AdminStats] ❌ Users query error:", usersRes.error)
        console.error("[AdminStats] Error details:", JSON.stringify(usersRes.error, null, 2))
        
        // Check if it's an RLS policy issue
        if (
          usersRes.error.code === "42501" ||
          usersRes.error.message?.includes("permission") ||
          usersRes.error.message?.includes("policy") ||
          usersRes.error.message?.includes("RLS")
        ) {
          console.error("[AdminStats] 🔒 RLS Policy issue detected!")
        }
      }

      // Calculate user statistics
      const usersData = usersRes?.data || []
      
      // Log ALL users fetched - CRITICAL for debugging
      console.log("[AdminStats] 🔍 Users fetched:", usersData)
      console.log(`[AdminStats] ✅ Loaded ${usersData.length} users from database`)
      
      // Log each user individually
      if (usersData.length > 0) {
        console.log("[AdminStats] 📋 All users details:")
        usersData.forEach((user, index) => {
          console.log(`[AdminStats]   User ${index + 1}:`, {
            id: user.id,
            // Note: user.id is the primary key matching auth.users.id
            nom: user.nom,
            email: user.email,
            role: user.role,
            status: user.status,
            hasStatus: user.hasOwnProperty("status"),
            created_at: user.created_at,
          })
        })
      } else {
        console.warn("[AdminStats] ⚠️ No users returned from database!")
      }

      // Normalize users data - handle cases where status column might not exist
      const normalizedUsers = usersData.map((user) => ({
        ...user,
        status: user.status || "active", // Default to active if status column doesn't exist
      }))

      // Total Users: Count ALL records (no filtering)
      const totalUsers = normalizedUsers.length
      
      // Active Users: Filter by status = "active" or no status
      const activeUsers = normalizedUsers.filter((u) => {
        const status = u.status || "active"
        return status === "active"
      }).length
      
      // Suspended Users: Filter by status = "suspended"
      const suspendedUsers = normalizedUsers.filter((u) => {
        const status = u.status || "active"
        return status === "suspended"
      }).length
      
      // Banned Users: Filter by status = "banned"
      const bannedUsers = normalizedUsers.filter((u) => {
        const status = u.status || "active"
        return status === "banned"
      }).length

      console.log("[AdminStats] 📊 Calculated statistics:", {
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        breakdown: {
          total: normalizedUsers.length,
          active: normalizedUsers.filter((u) => (u.status || "active") === "active").length,
          suspended: normalizedUsers.filter((u) => (u.status || "active") === "suspended").length,
          banned: normalizedUsers.filter((u) => (u.status || "active") === "banned").length,
        },
      })
      
      // Verify: Total Users must equal the length of the array
      if (totalUsers !== usersData.length) {
        console.error("[AdminStats] ❌ ERROR: totalUsers !== usersData.length", {
          totalUsers,
          usersDataLength: usersData.length,
        })
      } else {
        console.log("[AdminStats] ✅ Verification: totalUsers === usersData.length", {
          totalUsers,
          usersDataLength: usersData.length,
        })
      }

      // Calculate statistics from achats
      const achatsData = achatsRes?.data || []
      const totalPoids = achatsData.reduce((sum, item) => sum + (Number(item.poids) || 0), 0)
      const totalMontant = achatsData.reduce((sum, item) => sum + (Number(item.montant) || 0), 0)
      const totalTransactions = achatsData.length

      // Calculate poids par centre
      const centresData = centresRes?.data || []
      const poidsParCentreData = centresData.map((centre) => {
        const centreAchats = achatsData.filter((a) => String(a.centre_id) === String(centre.id))
        const poidsTotal = centreAchats.reduce((sum, a) => sum + (Number(a.poids) || 0), 0)
        return {
          centre: centre.nom,
          poids: Math.round(poidsTotal * 100) / 100,
        }
      }).filter((c) => c.poids > 0).sort((a, b) => b.poids - a.poids)

      // Calculate evolution du poids dans le temps (last 12 months)
      const evolutionData = []
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthName = date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
        
        const monthAchats = achatsData.filter((a) => {
          const achatDate = a.date_pesee || a.created_at
          if (!achatDate) return false
          const achatDateObj = new Date(achatDate)
          return (
            achatDateObj.getFullYear() === date.getFullYear() &&
            achatDateObj.getMonth() === date.getMonth()
          )
        })
        
        const poidsMois = monthAchats.reduce((sum, a) => sum + (Number(a.poids) || 0), 0)
        evolutionData.push({
          mois: monthName,
          poids: Math.round(poidsMois * 100) / 100,
        })
      }

      setStats({
        users: totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        centres: centresData.length,
        producteurs: producteursRes?.count || 0,
        agents: agentsRes?.data?.length || 0,
        totalPoids: Math.round(totalPoids * 100) / 100,
        totalTransactions,
        totalMontant: Math.round(totalMontant * 100) / 100,
      })

      setPoidsParCentre(poidsParCentreData)
      setEvolutionPoids(evolutionData)

      console.log("[AdminStats] ✅ Statistics updated:", {
        users: totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        centres: centresRes?.count || 0,
        producteurs: producteursRes?.count || 0,
        totalCacao: Math.round(totalCacao * 100) / 100,
      })

      // Fetch recent users
      const { data: recentUsers, error: recentUsersError } = await supabase
        .from("utilisateurs")
        .select("nom, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentUsersError) {
        console.error("[AdminStats] Error fetching recent users:", recentUsersError)
      } else {
        console.log(`[AdminStats] ✅ Loaded ${recentUsers?.length || 0} recent users`)
      }

      setRecentActivity(recentUsers || [])
    } catch (error) {
      console.error("[AdminStats] ❌ Unexpected error:", error)
      console.error("[AdminStats] Error stack:", error.stack)
    } finally {
      setLoading(false)
      console.log("[AdminStats] ===== FETCH COMPLETE =====")
    }
  }

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>Chargement des statistiques...</p>
      </div>
    )
  }

  /**
   * Send push notification via secure backend endpoint (/api/send-notification).
   * Does not replace the existing Supabase notification broadcast; it augments it.
   */
  async function sendNotification(title, body) {
    const resp = await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      console.warn("[AdminStats] FCM endpoint error:", data)
      return { success: false, details: data }
    }

    return data
  }

  async function handleSendNotification() {
    if (!notificationForm.title || !notificationForm.message) {
      showToast("Veuillez remplir le titre et le message", "error")
      return
    }

    try {
      setSendingNotification(true)
      const result = await broadcastNotification({
        title: notificationForm.title,
        message: notificationForm.message,
        type: "info",
        createdBy: user?.id || null,
      })

      if (result.success) {
        showToast(`Notification envoyée à ${result.count} utilisateur(s)`, "success")

        // Push notifications (best-effort). Never fail the existing Supabase path.
        try {
          const fcmRes = await sendNotification(notificationForm.title, notificationForm.message)
          if (fcmRes?.success) {
            const sentCount =
              typeof fcmRes.sentTotal === "number"
                ? fcmRes.sentTotal
                : typeof fcmRes.count === "number"
                  ? fcmRes.count
                  : undefined
            showToast(
              sentCount !== undefined ? `Push FCM envoyée à ${sentCount} appareil(s)` : "Push FCM envoyée",
              "success",
              3000
            )
          } else {
            showToast("Push FCM indisponible (optionnel)", "warning", 3000)
          }
        } catch (fcmErr) {
          console.warn("[AdminStats] FCM send failed (non-blocking):", fcmErr)
        }

        setShowNotificationModal(false)
        setNotificationForm({ title: "", message: "" })
      } else {
        showToast(result.message || "Erreur lors de l'envoi", "error")
      }
    } catch (error) {
      console.error("[AdminStats] Error sending notification:", error)
      showToast("Erreur lors de l'envoi de la notification", "error")
    } finally {
      setSendingNotification(false)
    }
  }

  return (
    <div style={container}>
      {/* Header with Send Notification Button */}
      <div style={headerActions}>
        <Button
          variant="primary"
          icon={<FaPaperPlane />}
          onClick={() => setShowNotificationModal(true)}
        >
          Envoyer notification
        </Button>
      </div>

      {/* Stats Cards */}
      <div style={gridStyle}>
        <StatCard
          icon={<FaUsers />}
          label="Total Utilisateurs"
          value={stats.users}
          color="#3b82f6"
        />
        <StatCard
          icon={<FaCheckCircle />}
          label="Utilisateurs Actifs"
          value={stats.activeUsers}
          color="#16a34a"
        />
        <StatCard
          icon={<FaUserSlash />}
          label="Suspendus"
          value={stats.suspendedUsers}
          color="#f59e0b"
        />
        <StatCard
          icon={<FaBan />}
          label="Bannis"
          value={stats.bannedUsers}
          color="#dc2626"
        />
        <StatCard
          icon={<FaBuilding />}
          label="Centres"
          value={stats.centres}
          color="#10b981"
        />
        <StatCard
          icon={<FaUserTie />}
          label="Producteurs"
          value={stats.producteurs}
          color="#f59e0b"
        />
        <StatCard
          icon={<FaWeightHanging />}
          label="Poids Total (kg)"
          value={stats.totalPoids.toLocaleString("fr-FR")}
          color="#7a1f1f"
        />
        <StatCard
          icon={<FaUserFriends />}
          label="Agents"
          value={stats.agents}
          color="#8b5cf6"
        />
        <StatCard
          icon={<FaDollarSign />}
          label="Transactions"
          value={stats.totalTransactions}
          color="#06b6d4"
        />
      </div>

      {/* Charts */}
      <div style={chartsContainer}>
        {/* Bar Chart: Poids par centre */}
        {poidsParCentre.length > 0 && (
          <Card
            title="Poids par Centre"
            style={{
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              borderRadius: "16px",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={poidsParCentre}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="centre"
                  stroke="#64748b"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} kg`, "Poids"]}
                />
                <Legend />
                <Bar dataKey="poids" fill="#7a1f1f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Line Chart: Evolution du poids */}
        {evolutionPoids.length > 0 && (
          <Card
            title="Évolution du Poids"
            style={{
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              borderRadius: "16px",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionPoids}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mois" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} kg`, "Poids"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="poids"
                  stroke="#7a1f1f"
                  strokeWidth={3}
                  dot={{ fill: "#7a1f1f", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card
        title="Activité Récente"
        style={{
          background: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderRadius: "16px",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <div style={activityList}>
          {recentActivity.length === 0 ? (
            <div style={emptyState}>
              <FaUsers size={32} style={{ color: "#cbd5e1", marginBottom: 12 }} />
              <p style={emptyText}>Aucune activité récente</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div
                key={index}
                style={activityItem}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc"
                  e.currentTarget.style.transform = "translateX(4px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb"
                  e.currentTarget.style.transform = "translateX(0)"
                }}
              >
                <div style={activityIcon}>
                  <FaUsers size={18} />
                </div>
                <div style={activityContent}>
                  <p style={activityTitle}>
                    {activity.nom || activity.email} ({activity.role})
                  </p>
                  <p style={activityDate}>
                    Créé le {new Date(activity.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Send Notification Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false)
          setNotificationForm({ title: "", message: "" })
        }}
        title="Envoyer une notification"
        size="md"
      >
        <div style={notificationFormStyle}>
          <Input
            label="Titre *"
            value={notificationForm.title}
            onChange={(v) => setNotificationForm({ ...notificationForm, title: v })}
            placeholder="Ex: Nouvelle campagne de collecte"
            required
          />
          <div>
            <label style={label}>Message *</label>
            <textarea
              value={notificationForm.message}
              onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
              placeholder="Ex: La nouvelle campagne de collecte commence le 1er janvier..."
              style={textareaInput}
              rows={5}
              required
            />
          </div>
          <div style={formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNotificationModal(false)
                setNotificationForm({ title: "", message: "" })
              }}
              disabled={sendingNotification}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              icon={<FaPaperPlane />}
              onClick={handleSendNotification}
              disabled={sendingNotification}
            >
              {sendingNotification ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card
      style={{
        ...statCard,
        background: "white",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)"
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)"
        const iconEl = e.currentTarget.querySelector('[data-stat-icon]')
        if (iconEl) iconEl.style.transform = "scale(1.05)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)"
        const iconEl = e.currentTarget.querySelector('[data-stat-icon]')
        if (iconEl) iconEl.style.transform = "scale(1)"
      }}
    >
      <div style={statContent}>
        <div
          data-stat-icon
          style={{
            ...statIcon,
            background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
            color,
          }}
        >
          {icon}
        </div>
        <div style={statInfo}>
          <p style={statValue}>{value}</p>
          <p style={statLabel}>{label}</p>
        </div>
      </div>
    </Card>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
}

const chartsContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: 24,
  width: "100%",
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 20,
  "@media (max-width: 640px)": {
    gridTemplateColumns: "repeat(2, 1fr)",
  },
}

const statCard = {
  padding: "24px",
  transition: "all 0.2s ease",
  cursor: "default",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  minHeight: "140px",
}

const statContent = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  flex: 1,
  width: "100%",
  textAlign: "center",
}

const statIcon = {
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
  transition: "transform 0.2s ease",
}

const statInfo = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  width: "100%",
}

const statValue = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 700,
  color: "#0f172a",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
}

const statLabel = {
  margin: 0,
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 500,
  textAlign: "center",
}

const activityList = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const activityItem = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "16px",
  borderRadius: "12px",
  background: "#f9fafb",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  border: "1px solid rgba(0,0,0,0.04)",
}

const activityIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
  color: "#3b82f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.15)",
}

const activityContent = {
  flex: 1,
  minWidth: 0,
}

const activityTitle = {
  margin: "0 0 6px 0",
  fontSize: "15px",
  fontWeight: 600,
  color: "#0f172a",
  letterSpacing: "-0.01em",
}

const activityDate = {
  margin: 0,
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 500,
}

const emptyState = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  textAlign: "center",
}

const emptyText = {
  color: "#94a3b8",
  fontSize: "15px",
  fontWeight: 500,
  margin: 0,
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  gap: 16,
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const loadingText = {
  color: "#6b7280",
  fontSize: "14px",
}

const headerActions = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: 24,
}

const notificationFormStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const label = {
  display: "block",
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
}

const textareaInput = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "white",
  color: "#111827",
  outline: "none",
  transition: "all 0.2s ease",
  fontFamily: "inherit",
  resize: "vertical",
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
}
