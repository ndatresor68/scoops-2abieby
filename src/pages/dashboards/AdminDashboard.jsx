import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaUsers, FaBuilding, FaWeightHanging, FaBox, FaSeedling, FaUserFriends, FaDollarSign, FaMapMarkerAlt } from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useToast } from "../../components/ui/Toast"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

/**
 * ADMIN Dashboard
 * Shows global statistics and overview
 */
export default function AdminDashboard() {
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducers: 0,
    totalCentres: 0,
    totalAgents: 0,
    totalPurchases: 0,
    totalCocoa: 0,
    totalParcelles: 0,
    totalSuperficie: 0,
    totalMontant: 0,
  })
  const [chartData, setChartData] = useState({
    monthlyPurchases: [],
    centresDistribution: [],
    parcellesByCentre: [],
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)

      const [
        producteursRes,
        centresRes,
        agentsRes,
        achatsRes,
        parcellesRes,
      ] = await Promise.all([
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("utilisateurs").select("*", { count: "exact", head: true }).eq("role", "AGENT"),
        supabase.from("achats").select("poids, montant, date_pesee, centre_id"),
        supabase.from("parcelles").select("superficie, centre_id, created_at"),
      ])

      const achatsData = achatsRes?.data || []
      const parcellesData = parcellesRes?.data || []
      
      const totalCocoa = achatsData.reduce((sum, item) => sum + (Number(item.poids) || 0), 0)
      const totalMontant = achatsData.reduce((sum, item) => sum + (Number(item.montant) || 0), 0)
      const totalSuperficie = parcellesData.reduce((sum, item) => sum + (Number(item.superficie) || 0), 0)

      setStats({
        totalProducers: producteursRes?.count || 0,
        totalCentres: centresRes?.count || 0,
        totalAgents: agentsRes?.count || 0,
        totalPurchases: achatsData.length,
        totalCocoa: Math.round(totalCocoa * 100) / 100,
        totalParcelles: parcellesData.length,
        totalSuperficie: Math.round(totalSuperficie * 10000) / 10000,
        totalMontant: Math.round(totalMontant * 100) / 100,
      })

      // Prepare chart data
      prepareChartData(achatsData, parcellesData)
    } catch (error) {
      console.error("[AdminDashboard] Error:", error)
      showToast("Erreur lors du chargement des statistiques", "error")
    } finally {
      setLoading(false)
    }
  }

  function prepareChartData(achatsData, parcellesData) {
    // Monthly purchases
    const monthlyData = {}
    achatsData.forEach((achat) => {
      const date = new Date(achat.date_pesee || achat.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, poids: 0 }
      }
      monthlyData[monthKey].poids += Number(achat.poids) || 0
    })
    const monthlyPurchases = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)

    // Centres distribution (parcelles)
    const centresData = {}
    parcellesData.forEach((p) => {
      const centreId = p.centre_id || "Sans centre"
      if (!centresData[centreId]) {
        centresData[centreId] = { centre: centreId, count: 0 }
      }
      centresData[centreId].count += 1
    })
    
    // Fetch centre names
    supabase
      .from("centres")
      .select("id, nom")
      .then(({ data: centres }) => {
        const parcellesByCentre = Object.entries(centresData)
          .map(([id, data]) => ({
            name: centres?.find((c) => c.id === id)?.nom || "Sans centre",
            value: data.count,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)

        setChartData({
          monthlyPurchases,
          centresDistribution: [],
          parcellesByCentre,
        })
      })

    setChartData({
      monthlyPurchases,
      centresDistribution: [],
      parcellesByCentre: [],
    })
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
        <h1 style={title}>Tableau de Bord Administrateur</h1>
        <p style={subtitle}>Vue d'ensemble globale du système</p>
      </div>

      <div style={statsGrid}>
        <StatCard
          icon={<FaUsers size={32} />}
          title="Total Producteurs"
          value={stats.totalProducers}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaBuilding size={28} />}
          title="Total Centres"
          value={stats.totalCentres}
          color="#2563eb"
          bgColor="#eff6ff"
        />
        <StatCard
          icon={<FaWeightHanging size={32} />}
          title="Total Pesées"
          value={stats.totalPurchases}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Total Cacao (Kg)"
          value={stats.totalCocoa.toLocaleString()}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaUserFriends size={28} />}
          title="Total Agents"
          value={stats.totalAgents}
          color="#8b5cf6"
          bgColor="#f5f3ff"
        />
        <StatCard
          icon={<FaSeedling size={28} />}
          title="Total Parcelles"
          value={stats.totalParcelles}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaMapMarkerAlt size={28} />}
          title="Superficie Totale (ha)"
          value={stats.totalSuperficie.toFixed(4)}
          color="#06b6d4"
          bgColor="#ecfeff"
        />
        <StatCard
          icon={<FaDollarSign size={28} />}
          title="Montant Total (FCFA)"
          value={stats.totalMontant.toLocaleString()}
          color="#dc2626"
          bgColor="#fef2f2"
        />
      </div>

      {/* Charts Section */}
      {chartData.monthlyPurchases.length > 0 && (
        <div style={chartsGrid}>
          <Card title="Achats Mensuels de Cacao">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyPurchases}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-")
                    return `${month}/${year.slice(2)}`
                  }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Poids"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="poids"
                  stroke="#16a34a"
                  strokeWidth={2}
                  name="Poids (kg)"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {chartData.parcellesByCentre.length > 0 && (
            <Card title="Top 10 Centres par Nombre de Parcelles">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.parcellesByCentre}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#7a1f1f" name="Nombre de parcelles" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
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

const chartsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: 20,
  marginTop: 24,
}
