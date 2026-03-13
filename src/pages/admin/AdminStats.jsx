import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaBuilding, FaUserTie, FaBox, FaCheckCircle, FaUserSlash, FaBan } from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function AdminStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    bannedUsers: 0,
    centres: 0,
    producteurs: 0,
    totalCacao: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Dynamic grid style based on screen size
  const gridStyle = isMobile
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 12,
        width: "100%",
      }
    : {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("poids, montant"),
      ])
      
      console.log("[AdminStats] 🔍 Executing query: supabase.from('utilisateurs').select('*')")

      const [usersRes, centresRes, producteursRes, achatsRes] = await Promise.race([
        statsPromise,
        timeoutPromise,
      ]).catch((err) => {
        console.error("[AdminStats] ❌ Error fetching stats:", err)
        return [
          { data: [], error: err },
          { count: 0 },
          { count: 0 },
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

      // Calculate total cacao (sum of poids from achats)
      const achatsData = achatsRes?.data || []
      const totalCacao = achatsData.reduce((sum, item) => {
        return sum + (Number(item.poids) || 0)
      }, 0)

      setStats({
        users: totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        centres: centresRes?.count || 0,
        producteurs: producteursRes?.count || 0,
        totalCacao: Math.round(totalCacao * 100) / 100,
      })

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

  return (
    <div style={container}>
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
          icon={<FaBox />}
          label="Cacao Total (kg)"
          value={stats.totalCacao.toLocaleString("fr-FR")}
          color="#7a1f1f"
        />
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
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card
      style={{
        ...statCard,
        background: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        borderRadius: "16px",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)"
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)"
        const iconEl = e.currentTarget.querySelector('[data-stat-icon]')
        if (iconEl) iconEl.style.transform = "scale(1.1)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"
        const iconEl = e.currentTarget.querySelector('[data-stat-icon]')
        if (iconEl) iconEl.style.transform = "scale(1)"
      }}
    >
      <div style={statContent}>
        <div
          data-stat-icon
          style={{
            ...statIcon,
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
            color,
            boxShadow: `0 4px 12px ${color}20`,
          }}
        >
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
  gap: 32,
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
  padding: "28px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "default",
}

const statContent = {
  display: "flex",
  alignItems: "flex-start",
  gap: 20,
  flexDirection: "column",
}

const statIcon = {
  width: "64px",
  height: "64px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  flexShrink: 0,
  transition: "transform 0.2s ease",
}

const statInfo = {
  flex: 1,
  width: "100%",
}

const statLabel = {
  margin: "0 0 8px 0",
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const statValue = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
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
