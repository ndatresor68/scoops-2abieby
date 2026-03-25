import { useEffect, useRef, useState } from "react"
import { supabase } from "../../supabaseClient"
import {
  FaUsers,
  FaWeightHanging,
  FaBox,
  FaDollarSign,
  FaCheckCircle,
  FaClock,
  FaTicketAlt,
} from "react-icons/fa"
import Card from "../../components/ui/Card"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import {
  buildQuotaMetrics,
  calculateUsedKgFromAchats,
  getActiveCampagne,
  getCentreQuota,
} from "../../utils/campagnes"
import {
  MonthlyPurchasesChart,
  TopProducteursChart,
  LivraisonsStatusChart,
  StockByCentreChart,
} from "../../components/charts/CentreCharts"

/**
 * Enhanced CENTRE Dashboard
 * Shows centre-specific statistics with charts
 */
export default function CentreDashboardEnhanced() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const hasFetched = useRef(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    nombreProducteurs: 0,
    nombrePesees: 0,
    nombreTickets: 0,
    poidsTotalAchete: 0,
    livraisonsValidees: 0,
    livraisonsEnAttente: 0,
  })
  const [centreInfo, setCentreInfo] = useState(null)
  const [chartData, setChartData] = useState({
    monthlyPurchases: [],
    topProducteurs: [],
    livraisonsStatus: [],
    stockByCentre: [],
  })
  const [quotaMetrics, setQuotaMetrics] = useState(() => buildQuotaMetrics(null, null, 0))

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    console.log("FETCH CALLED")
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDashboardData() {
    if (!user?.centre_id) {
      setLoading(false)
      return
    }

    try {
      // Fetch centre info
      const { data: centreData } = await supabase
        .from("centres")
        .select("*")
        .eq("id", user.centre_id)
        .single()

      setCentreInfo(centreData)

      // Fetch all centre-specific data
      const [producteursRes, achatsRes, livraisonsRes, campagneData] = await Promise.all([
        supabase
          .from("producteurs")
          .select("*", { count: "exact", head: true })
          .eq("centre_id", user.centre_id),
        supabase
          .from("achats")
          .select("poids, montant, date_pesee, nom_producteur, code_producteur")
          .eq("centre_id", user.centre_id)
          .order("date_pesee", { ascending: false }),
        supabase
          .from("livraisons")
          .select("poids_total, statut, date_livraison")
          .eq("centre_id", user.centre_id),
        getActiveCampagne(),
      ])

      const achatsData = achatsRes?.data || []
      const livraisonsData = livraisonsRes?.data || []
      let computedQuotaMetrics = buildQuotaMetrics(campagneData, null, 0)

      if (campagneData?.id) {
        const quotaData = await getCentreQuota(user.centre_id, campagneData.id)
        const usedKg = calculateUsedKgFromAchats(achatsData, user.centre_id, campagneData)
        computedQuotaMetrics = buildQuotaMetrics(campagneData, quotaData, usedKg)
      }

      // Calculate statistics
      const poidsTotal = achatsData.reduce((sum, item) => sum + (Number(item.poids) || 0), 0)
      const livraisonsValidees = livraisonsData.filter((l) => l.statut === "VALIDE").length
      const livraisonsEnAttente = livraisonsData.filter((l) => l.statut === "EN_ATTENTE").length

      setStats({
        nombreProducteurs: producteursRes?.count || 0,
        nombrePesees: achatsData.length,
        nombreTickets: achatsData.length, // Each achat is a ticket
        poidsTotalAchete: Math.round(poidsTotal * 100) / 100,
        livraisonsValidees,
        livraisonsEnAttente,
      })
      setQuotaMetrics(computedQuotaMetrics)

      // Prepare chart data
      prepareChartData(achatsData, livraisonsData, centreData)
    } catch (error) {
      console.error("[CentreDashboardEnhanced] Error:", error)
      showToast("Erreur lors du chargement des données", "error")
    } finally {
      setLoading(false)
    }
  }

  function prepareChartData(achatsData, livraisonsData, currentCentreInfo) {
    // 1. Monthly purchases chart
    const monthlyData = {}
    achatsData.forEach((achat) => {
      const date = new Date(achat.date_pesee || achat.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, poids: 0, count: 0 }
      }
      monthlyData[monthKey].poids += Number(achat.poids) || 0
      monthlyData[monthKey].count += 1
    })
    const monthlyPurchases = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months

    // 2. Top producteurs chart
    const producteurData = {}
    achatsData.forEach((achat) => {
      const key = achat.code_producteur || achat.nom_producteur || "Unknown"
      if (!producteurData[key]) {
        producteurData[key] = { nom: achat.nom_producteur || key, poids: 0 }
      }
      producteurData[key].poids += Number(achat.poids) || 0
    })
    const topProducteurs = Object.values(producteurData)
      .sort((a, b) => b.poids - a.poids)
      .slice(0, 10) // Top 10

    // 3. Livraisons status chart
    const livraisonsStatus = [
      { name: "Validées", value: livraisonsData.filter((l) => l.statut === "VALIDE").length },
      {
        name: "En Attente",
        value: livraisonsData.filter((l) => l.statut === "EN_ATTENTE").length,
      },
    ]

    // 4. Stock by centre (for this centre only)
    const totalAchats = achatsData.reduce((sum, a) => sum + (Number(a.poids) || 0), 0)
    const totalLivraisons = livraisonsData
      .filter((l) => l.statut === "VALIDE")
      .reduce((sum, l) => sum + (Number(l.poids_total) || 0), 0)
    const stock = totalAchats - totalLivraisons

    setChartData({
      monthlyPurchases,
      topProducteurs,
      livraisonsStatus,
      stockByCentre: [{ name: currentCentreInfo?.nom || "Centre", stock: Math.max(0, stock) }],
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
        <div>
          <h1 style={title}>Tableau de Bord Centre</h1>
          <p style={subtitle}>
            {centreInfo?.nom || "Centre"} - {centreInfo?.code || ""}
          </p>
        </div>
      </div>

      <Card>
        <div style={campaignBanner}>
          <div>
            <p style={campaignEyebrow}>Campagne active</p>
            <h3 style={campaignTitle}>
              {quotaMetrics.campagne?.nom || "Aucune campagne active"}
            </h3>
            <p style={campaignText}>
              {quotaMetrics.campagne
                ? `${quotaMetrics.campagne.type || "CAMPAGNE"} · Prix ${Number(quotaMetrics.prixKg || 0).toLocaleString("fr-FR")} FCFA / kg`
                : "Aucune campagne active n'est disponible pour calculer le quota du centre."}
            </p>
          </div>
          <div style={campaignBadge}>
            {quotaMetrics.campagne?.statut || "INACTIF"}
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div style={statsGrid}>
        <StatCard
          icon={<FaUsers size={32} />}
          title="Nombre de Producteurs"
          value={stats.nombreProducteurs}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaWeightHanging size={32} />}
          title="Nombre de Pesées"
          value={stats.nombrePesees}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaTicketAlt size={28} />}
          title="Nombre de Tickets"
          value={stats.nombreTickets}
          color="#8b5cf6"
          bgColor="#f5f3ff"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Poids Total Acheté (Kg)"
          value={stats.poidsTotalAchete.toLocaleString()}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaCheckCircle size={32} />}
          title="Livraisons Validées"
          value={stats.livraisonsValidees}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaClock size={32} />}
          title="Livraisons en Attente"
          value={stats.livraisonsEnAttente}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
      </div>

      <div style={statsGrid}>
        <StatCard
          icon={<FaWeightHanging size={30} />}
          title="Quota total (Kg)"
          value={quotaMetrics.quotaKg.toLocaleString("fr-FR")}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Kg utilisés"
          value={quotaMetrics.usedKg.toLocaleString("fr-FR")}
          color="#2563eb"
          bgColor="#eff6ff"
        />
        <StatCard
          icon={<FaCheckCircle size={28} />}
          title="Kg restants"
          value={quotaMetrics.remainingKg.toLocaleString("fr-FR")}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaClock size={28} />}
          title="Quota utilisé"
          value={`${quotaMetrics.usagePercentage.toFixed(1)} %`}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
      </div>

      <Card>
        <div style={quotaDetailCard}>
          <div style={quotaDetailRow}>
            <span style={quotaDetailLabel}>Budget total calculé</span>
            <strong style={quotaDetailValue}>
              {quotaMetrics.totalBudget.toLocaleString("fr-FR")} FCFA
            </strong>
          </div>
          <div style={quotaDetailRow}>
            <span style={quotaDetailLabel}>Budget consommé</span>
            <strong style={quotaDetailValue}>
              {quotaMetrics.usedBudget.toLocaleString("fr-FR")} FCFA
            </strong>
          </div>
          <div style={quotaProgressTrack}>
            <div
              style={{
                ...quotaProgressFill,
                width: `${Math.max(0, Math.min(100, quotaMetrics.usagePercentage || 0))}%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div style={chartsGrid}>
        <Card title="Achats Mensuels de Cacao">
          <MonthlyPurchasesChart data={chartData.monthlyPurchases} />
        </Card>

        <Card title="Top 10 Producteurs">
          <TopProducteursChart data={chartData.topProducteurs} />
        </Card>

        <Card title="Statut des Livraisons">
          <LivraisonsStatusChart data={chartData.livraisonsStatus} />
        </Card>

        <Card title="Stock par Centre">
          <StockByCentreChart data={chartData.stockByCentre} />
        </Card>
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

const campaignBanner = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
}

const campaignEyebrow = {
  margin: 0,
  fontSize: 12,
  color: "#7a1f1f",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
}

const campaignTitle = {
  margin: "8px 0 6px 0",
  fontSize: "24px",
  color: "#111827",
}

const campaignText = {
  margin: 0,
  color: "#6b7280",
  lineHeight: 1.6,
}

const campaignBadge = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#ecfdf3",
  color: "#166534",
  fontWeight: 700,
  fontSize: 12,
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
}

const chartsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: 20,
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

const quotaDetailCard = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
}

const quotaDetailRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
}

const quotaDetailLabel = {
  color: "#6b7280",
  fontWeight: 600,
}

const quotaDetailValue = {
  color: "#111827",
}

const quotaProgressTrack = {
  width: "100%",
  height: 12,
  borderRadius: 999,
  background: "#e5e7eb",
  overflow: "hidden",
}

const quotaProgressFill = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #f59e0b 0%, #16a34a 100%)",
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
