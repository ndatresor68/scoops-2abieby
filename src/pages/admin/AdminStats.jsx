import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaBuilding, FaUserTie, FaBox } from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function AdminStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    centres: 0,
    producteurs: 0,
    totalCacao: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)

      // Fetch counts with timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Stats timeout")), 15000)
      )

      const statsPromise = Promise.all([
        supabase.from("utilisateurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("quantite, poids"),
      ])

      const [usersRes, centresRes, producteursRes, achatsRes] = await Promise.race([
        statsPromise,
        timeoutPromise,
      ]).catch((err) => {
        console.error("[AdminStats] Error fetching stats:", err)
        return [
          { count: 0 },
          { count: 0 },
          { count: 0 },
          { data: [] },
        ]
      })

      // Calculate total cacao
      const achatsData = achatsRes?.data || []
      const totalCacao = achatsData.reduce((sum, item) => {
        return sum + (Number(item.quantite) || Number(item.poids) || 0)
      }, 0)

      setStats({
        users: usersRes?.count || 0,
        centres: centresRes?.count || 0,
        producteurs: producteursRes?.count || 0,
        totalCacao: Math.round(totalCacao * 100) / 100,
      })

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from("utilisateurs")
        .select("nom, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentActivity(recentUsers || [])
    } catch (error) {
      console.error("[AdminStats] Error:", error)
    } finally {
      setLoading(false)
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

  return (
    <div style={container}>
      {/* Stats Cards */}
      <div style={statsGrid}>
        <StatCard
          icon={<FaUsers />}
          label="Utilisateurs"
          value={stats.users}
          color="#3b82f6"
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
          icon={<FaBox />}
          label="Cacao Total (kg)"
          value={stats.totalCacao.toLocaleString("fr-FR")}
          color="#7a1f1f"
        />
      </div>

      {/* Recent Activity */}
      <Card title="Activité Récente">
        <div style={activityList}>
          {recentActivity.length === 0 ? (
            <p style={emptyText}>Aucune activité récente</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} style={activityItem}>
                <div style={activityIcon}>
                  <FaUsers size={16} />
                </div>
                <div style={activityContent}>
                  <p style={activityTitle}>
                    {activity.nom || activity.email} ({activity.role})
                  </p>
                  <p style={activityDate}>
                    Créé le {new Date(activity.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card style={statCard}>
      <div style={statContent}>
        <div style={{ ...statIcon, background: `${color}15`, color }}>
          {icon}
        </div>
        <div style={statInfo}>
          <p style={statLabel}>{label}</p>
          <p style={statValue}>{value}</p>
        </div>
      </div>
    </Card>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
}

const statCard = {
  padding: "24px",
}

const statContent = {
  display: "flex",
  alignItems: "center",
  gap: 16,
}

const statIcon = {
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
}

const statInfo = {
  flex: 1,
}

const statLabel = {
  margin: "0 0 4px 0",
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: 500,
}

const statValue = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1.2,
}

const activityList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const activityItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px",
  borderRadius: "8px",
  background: "#f9fafb",
  transition: "background 0.2s ease",
}

const activityIcon = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  background: "#eff6ff",
  color: "#3b82f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const activityContent = {
  flex: 1,
  minWidth: 0,
}

const activityTitle = {
  margin: "0 0 4px 0",
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
}

const activityDate = {
  margin: 0,
  fontSize: "12px",
  color: "#6b7280",
}

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  fontSize: "14px",
  padding: "20px",
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
