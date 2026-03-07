import { useCallback, useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaScaleBalanced, FaBuilding, FaCircleCheck, FaClock, FaBox } from "react-icons/fa6"
import { GiFarmer } from "react-icons/gi"
import Card from "./components/ui/Card"
import { useToast } from "./components/ui/Toast"

export default function DashboardCentral() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    producteurs: 0,
    centres: 0,
    achats: 0,
    livraisonsValidees: 0,
    livraisonsAttente: 0,
    stockGlobal: 0,
    poidsTotal: 0,
  })

  const [centresStats, setCentresStats] = useState([])
  const [recentAchats, setRecentAchats] = useState([])

  function getQuantite(item) {
    return Number(item?.quantite ?? item?.poids ?? 0)
  }

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)

      const [
        producteursRes,
        centresRes,
        achatsRes,
        livraisonsValideesRes,
        livraisonsAttenteRes,
      ] = await Promise.all([
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("*", { count: "exact", head: true }),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "VALIDEE"),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "EN_ATTENTE"),
      ])

      const { data: achatsData } = await supabase.from("achats").select("*")
      const { data: livraisonsData } = await supabase
        .from("livraisons")
        .select("*")
        .eq("statut", "VALIDEE")

      const totalAchats = achatsData ? achatsData.reduce((sum, item) => sum + getQuantite(item), 0) : 0
      const totalLivraisons = livraisonsData
        ? livraisonsData.reduce((sum, item) => sum + getQuantite(item), 0)
        : 0

      const stockGlobal = totalAchats - totalLivraisons
      const poidsTotal = achatsData ? achatsData.reduce((sum, item) => sum + (item.poids || 0), 0) : 0

      setStats({
        producteurs: producteursRes.count || 0,
        centres: centresRes.count || 0,
        achats: achatsRes.count || 0,
        livraisonsValidees: livraisonsValideesRes.count || 0,
        livraisonsAttente: livraisonsAttenteRes.count || 0,
        stockGlobal,
        poidsTotal,
      })

      const { data: centresData } = await supabase.from("centres").select("id, nom, code")

      if (centresData) {
        const centresCalcul = await Promise.all(
          centresData.map(async (centre) => {
            const { data: achatsCentre } = await supabase
              .from("achats")
              .select("*")
              .eq("centre_id", centre.id)

            const { data: livraisonsCentre } = await supabase
              .from("livraisons")
              .select("*")
              .eq("centre_id", centre.id)
              .eq("statut", "VALIDEE")

            const totalCentreAchats = achatsCentre
              ? achatsCentre.reduce((sum, item) => sum + getQuantite(item), 0)
              : 0

            const totalCentreLivraisons = livraisonsCentre
              ? livraisonsCentre.reduce((sum, item) => sum + getQuantite(item), 0)
              : 0

            return {
              id: centre.id,
              nom: centre.nom,
              code: centre.code,
              stock: totalCentreAchats - totalCentreLivraisons,
            }
          }),
        )

        setCentresStats(centresCalcul)
      }

      const { data: recentAchatsData } = await supabase
        .from("achats")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentAchats(recentAchatsData || [])
    } catch (error) {
      console.error("Erreur Dashboard:", error)
      showToast("Erreur lors du chargement du dashboard", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTopColor: "#7a1f1f",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }}
          ></div>
          <p style={{ marginTop: 16, color: "#6b7280" }}>Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={container}>
      <div style={headerSection}>
        <div>
          <h1 style={mainTitle}>Tableau de Bord</h1>
          <p style={subtitle}>Vue d'ensemble de l'activité de la coopérative</p>
        </div>
      </div>

      <div style={statsGrid}>
        <StatCard
          icon={<GiFarmer size={32} />}
          title="Producteurs"
          value={stats.producteurs}
          color="#7a1f1f"
          bgColor="#fef2f2"
        />
        <StatCard
          icon={<FaBuilding size={28} />}
          title="Centres"
          value={stats.centres}
          color="#2563eb"
          bgColor="#eff6ff"
        />
        <StatCard
          icon={<FaScaleBalanced size={32} />}
          title="Pesées"
          value={stats.achats}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Poids Total (Kg)"
          value={stats.poidsTotal.toLocaleString()}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaCircleCheck size={32} />}
          title="Livraisons Validées"
          value={stats.livraisonsValidees}
          color="#16a34a"
          bgColor="#ecfdf3"
        />
        <StatCard
          icon={<FaClock size={32} />}
          title="En Attente"
          value={stats.livraisonsAttente}
          color="#f59e0b"
          bgColor="#fffbeb"
        />
        <StatCard
          icon={<FaBox size={28} />}
          title="Stock Global (Kg)"
          value={stats.stockGlobal.toLocaleString()}
          color={stats.stockGlobal < 100 ? "#dc2626" : "#16a34a"}
          bgColor={stats.stockGlobal < 100 ? "#fef2f2" : "#ecfdf3"}
        />
      </div>

      <div style={contentGrid}>
        <Card title="Stock par Centre" style={{ gridColumn: "span 2" }}>
          {centresStats.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>Aucun centre enregistré</p>
          ) : (
            <div style={centresGrid}>
              {centresStats.map((centre) => (
                <div key={centre.id} style={centreCard}>
                  <div style={centreHeader}>
                    <h4 style={centreName}>{centre.nom}</h4>
                    <span style={centreCode}>{centre.code}</span>
                  </div>
                  <p
                    style={{
                      ...stockValue,
                      color: centre.stock < 100 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {centre.stock.toLocaleString()} Kg
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Pesées Récentes">
          {recentAchats.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>Aucune pesée récente</p>
          ) : (
            <div style={recentList}>
              {recentAchats.map((achat) => (
                <div key={achat.id} style={recentItem}>
                  <div>
                    <p style={recentProducteur}>{achat.nom_producteur || "-"}</p>
                    <p style={recentDate}>
                      {achat.created_at ? new Date(achat.created_at).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div style={recentWeight}>{achat.poids || 0} Kg</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, color, bgColor }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            background: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>
            {title}
          </p>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#1f2937" }}>{value}</p>
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

const headerSection = {
  marginBottom: 8,
}

const mainTitle = {
  margin: 0,
  fontSize: "32px",
  fontWeight: 800,
  color: "#1f2937",
  letterSpacing: "-0.02em",
}

const subtitle = {
  margin: "8px 0 0 0",
  fontSize: "15px",
  color: "#6b7280",
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
}

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 20,
}

const centresGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 16,
}

const centreCard = {
  padding: 16,
  background: "#f9fafb",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
}

const centreHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
}

const centreName = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 600,
  color: "#1f2937",
}

const centreCode = {
  fontSize: "12px",
  color: "#6b7280",
  background: "white",
  padding: "4px 8px",
  borderRadius: "6px",
  fontWeight: 500,
}

const stockValue = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
}

const recentList = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const recentItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 12,
  background: "#f9fafb",
  borderRadius: "10px",
}

const recentProducteur = {
  margin: 0,
  fontSize: "14px",
  fontWeight: 600,
  color: "#1f2937",
}

const recentDate = {
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "#6b7280",
}

const recentWeight = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#7a1f1f",
}
