import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaSeedling, FaClipboardList, FaMapMarkerAlt } from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { getUserRoleInfo } from "../../utils/rolePermissions"

/**
 * AGENT Dashboard
 * Shows field work statistics
 */
export default function AgentDashboard() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    producersRegistered: 0,
    fieldActivities: 0,
    parcelMeasurements: 0,
    superficieTotale: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [user])

  async function fetchStats() {
    try {
      setLoading(true)

      if (!user?.id) {
        setLoading(false)
        return
      }

      // Count producers created by this agent (or in their centre if they have one)
      const { isAgent, centreId } = getUserRoleInfo(user)
      
      let producersQuery = supabase
        .from("producteurs")
        .select("*", { count: "exact", head: true })
      
      // If agent has a centre, count all producers in that centre
      // Otherwise, count only those created by this agent
      if (centreId) {
        producersQuery = producersQuery.eq("centre_id", centreId)
      } else {
        producersQuery = producersQuery.eq("created_by", user.id)
      }

      const { count: producersCount } = await producersQuery

      // Count parcelles created by this agent (or in their centre)
      let parcellesQuery = supabase
        .from("parcelles")
        .select("*", { count: "exact", head: true })
      
      if (centreId) {
        parcellesQuery = parcellesQuery.eq("centre_id", centreId)
      } else {
        parcellesQuery = parcellesQuery.eq("created_by", user.id)
      }

      const { count: parcellesCount } = await parcellesQuery

      // Calculate total superficie
      let superficieQuery = supabase
        .from("parcelles")
        .select("superficie")
      
      if (centreId) {
        superficieQuery = superficieQuery.eq("centre_id", centreId)
      } else {
        superficieQuery = superficieQuery.eq("created_by", user.id)
      }

      const { data: superficieData } = await superficieQuery
      const superficieTotale = (superficieData || []).reduce(
        (sum, p) => sum + (Number(p.superficie) || 0),
        0
      )

      setStats({
        producersRegistered: producersCount || 0,
        fieldActivities: 0, // Future feature
        parcelMeasurements: parcellesCount || 0,
        superficieTotale: Math.round(superficieTotale * 10000) / 10000, // Round to 4 decimals
      })
    } catch (error) {
      console.error("[AgentDashboard] Error:", error)
      showToast("Erreur lors du chargement des statistiques", "error")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Tableau de Bord Agent</h1>
        <p style={subtitle}>Gestion des activités terrain</p>
      </div>

      <div style={statsGrid}>
        <StatCard
          icon={<FaUsers size={32} />}
          title="Producteurs Enregistrés"
          value={stats.producersRegistered}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaClipboardList size={32} />}
          title="Activités Terrain"
          value={stats.fieldActivities}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaSeedling size={28} />}
          title="Mesures de Parcelles"
          value={stats.parcelMeasurements}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaMapMarkerAlt size={28} />}
          title="Superficie Totale (ha)"
          value={stats.superficieTotale.toFixed(4)}
          color="#2563eb"
          bgColor="#eff6ff"
        />
      </div>

      <Card title="Informations">
        <p style={infoText}>
          En tant qu'agent, vous pouvez gérer les producteurs et leurs parcelles.
          <br />
          Les pesées sont effectuées par les centres de collecte.
        </p>
      </Card>
    </div>
  )
}

function StatCard({ icon, title, value, color, bgColor }) {
  return (
    <Card>
      <div style={statCardContent}>
        <div style={{ ...statIcon, background: bgColor, color }}>
          {icon}
        </div>
        <div>
          <p style={statLabel}>{title}</p>
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

const header = {
  marginBottom: 8,
}

const title = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#1f2937",
}

const subtitle = {
  margin: "8px 0 0 0",
  fontSize: "15px",
  color: "#6b7280",
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
}

const statCardContent = {
  display: "flex",
  alignItems: "center",
  gap: 16,
}

const statIcon = {
  width: 56,
  height: 56,
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const statLabel = {
  margin: 0,
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 500,
  marginBottom: 4,
}

const statValue = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#1f2937",
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
  width: "48px",
  height: "48px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const infoText = {
  margin: 0,
  fontSize: "14px",
  color: "#6b7280",
  lineHeight: "1.6",
}
