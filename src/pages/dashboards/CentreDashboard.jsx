import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaWeightHanging, FaBox, FaDollarSign } from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { useMediaQuery } from "../../hooks/useMediaQuery"

/**
 * CENTRE Dashboard
 * Shows centre-specific statistics
 */
export default function CentreDashboard() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    producersInCentre: 0,
    totalWeighings: 0,
    totalCocoa: 0,
    totalAmountPaid: 0,
  })
  const [centreInfo, setCentreInfo] = useState(null)

  useEffect(() => {
    if (user?.centre_id) {
      fetchStats()
    }
  }, [user])

  async function fetchStats() {
    if (!user?.centre_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch centre info
      const { data: centreData } = await supabase
        .from("centres")
        .select("*")
        .eq("id", user.centre_id)
        .single()

      setCentreInfo(centreData)

      // Fetch centre-specific data
      const [producteursRes, achatsRes] = await Promise.all([
        supabase
          .from("producteurs")
          .select("*", { count: "exact", head: true })
          .eq("centre_id", user.centre_id),
        supabase.from("achats").select("poids, montant").eq("centre_id", user.centre_id),
      ])

      const achatsData = achatsRes?.data || []
      const totalCocoa = achatsData.reduce((sum, item) => sum + (Number(item.poids) || 0), 0)
      const totalAmount = achatsData.reduce((sum, item) => sum + (Number(item.montant) || 0), 0)

      setStats({
        producersInCentre: producteursRes?.count || 0,
        totalWeighings: achatsData.length,
        totalCocoa: Math.round(totalCocoa * 100) / 100,
        totalAmountPaid: Math.round(totalAmount * 100) / 100,
      })
    } catch (error) {
      console.error("[CentreDashboard] Error:", error)
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

  if (!user?.centre_id) {
    return (
      <div style={errorContainer}>
        <p>Aucun centre assigné. Veuillez contacter l'administrateur.</p>
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Tableau de Bord Centre</h1>
        <p style={subtitle}>
          {centreInfo?.nom || "Centre"} - {centreInfo?.code || ""}
        </p>
      </div>

      <div style={statsGrid}>
        <StatCard
          icon={<FaUsers size={32} />}
          title="Producteurs du Centre"
          value={stats.producersInCentre}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaWeightHanging size={32} />}
          title="Nombre de Pesées"
          value={stats.totalWeighings}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Cacao Acheté (Kg)"
          value={stats.totalCocoa.toLocaleString()}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaDollarSign size={28} />}
          title="Montant Total Payé"
          value={`${stats.totalAmountPaid.toLocaleString()} FCFA`}
          color="#2563eb"
          bgColor="#eff6ff"
        />
      </div>
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

const errorContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  padding: 40,
  textAlign: "center",
  color: "#dc2626",
}
