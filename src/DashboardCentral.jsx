import { useCallback, useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaBalanceScale, FaBuilding, FaCheckCircle, FaClock, FaBox } from "react-icons/fa"
import { GiFarmer } from "react-icons/gi"
import Card from "./components/ui/Card"
import { useToast } from "./components/ui/Toast"
import { useMediaQuery } from "./hooks/useMediaQuery"

export default function DashboardCentral() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

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
      console.log("[Dashboard] Fetching dashboard data...")

      // Timeout protection: max 20 seconds for all queries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Dashboard query timeout")), 20000)
      )

      const queriesPromise = Promise.all([
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("*", { count: "exact", head: true }),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "VALIDEE"),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "EN_ATTENTE"),
      ])

      const [
        producteursRes,
        centresRes,
        achatsRes,
        livraisonsValideesRes,
        livraisonsAttenteRes,
      ] = await Promise.race([queriesPromise, timeoutPromise]).catch((err) => {
        console.error("[Dashboard] Query timeout or error:", err)
        // Return default values on timeout
        return [
          { count: 0 },
          { count: 0 },
          { count: 0 },
          { count: 0 },
          { count: 0 },
        ]
      })

      // Fetch detailed data with timeout protection
      const detailTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Detail query timeout")), 15000)
      )

      const detailQueriesPromise = Promise.all([
        supabase.from("achats").select("*"),
        supabase.from("livraisons").select("*").eq("statut", "VALIDEE")
      ])

      const [achatsResult, livraisonsResult] = await Promise.race([
        detailQueriesPromise,
        detailTimeoutPromise
      ]).catch((err) => {
        console.error("[Dashboard] Detail query timeout:", err)
        return [{ data: [] }, { data: [] }]
      })

      const achatsData = achatsResult?.data || []
      const livraisonsData = livraisonsResult?.data || []

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

      const centresQueryPromise = supabase.from("centres").select("id, nom, code")
      const centresTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Centres query timeout")), 10000)
      )

      const { data: centresData } = await Promise.race([
        centresQueryPromise,
        centresTimeoutPromise
      ]).catch((err) => {
        console.error("[Dashboard] Centres query timeout:", err)
        return { data: [] }
      })

      if (centresData && centresData.length > 0) {
        // Limit concurrent queries to avoid overwhelming the database
        const centresCalcul = await Promise.all(
          centresData.slice(0, 10).map(async (centre) => {
            try {
              const centreTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Centre detail timeout")), 5000)
              )

              const centreQueriesPromise = Promise.all([
                supabase.from("achats").select("*").eq("centre_id", centre.id),
                supabase.from("livraisons").select("*").eq("centre_id", centre.id).eq("statut", "VALIDEE")
              ])

              const [achatsResult, livraisonsResult] = await Promise.race([
                centreQueriesPromise,
                centreTimeoutPromise
              ]).catch((err) => {
                console.warn(`[Dashboard] Centre ${centre.id} query timeout:`, err)
                return [{ data: [] }, { data: [] }]
              })

              const achatsCentre = achatsResult?.data || []
              const livraisonsCentre = livraisonsResult?.data || []

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
            } catch (error) {
              console.error(`[Dashboard] Error loading centre ${centre.id}:`, error)
              // Return default values on error
              return {
                id: centre.id,
                nom: centre.nom,
                code: centre.code,
                stock: 0,
              }
            }
          }),
        )

        setCentresStats(centresCalcul)
      }

      // Fetch recent achats with timeout
      const recentTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Recent achats timeout")), 10000)
      )

      const recentQueryPromise = supabase
        .from("achats")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      const { data: recentAchatsData } = await Promise.race([
        recentQueryPromise,
        recentTimeoutPromise
      ]).catch((err) => {
        console.warn("[Dashboard] Recent achats query timeout:", err)
        return { data: [] }
      })

      setRecentAchats(recentAchatsData || [])
      console.log("[Dashboard] Dashboard data loaded successfully")
    } catch (error) {
      console.error("[Dashboard] Erreur Dashboard:", error)
      // Don't show toast on initial load to avoid spam
      setStats({
        producteurs: 0,
        centres: 0,
        achats: 0,
        livraisonsValidees: 0,
        livraisonsAttente: 0,
        stockGlobal: 0,
        poidsTotal: 0,
      })
      setCentresStats([])
      setRecentAchats([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let mounted = true
    
    console.log("[Dashboard] Component mounted, fetching dashboard...")
    fetchDashboard().catch((error) => {
      console.error("[Dashboard] Error in useEffect:", error)
      if (mounted) {
        setLoading(false)
      }
    })
    
    return () => {
      mounted = false
    }
  }, []) // Empty deps - fetchDashboard is stable

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
          <h1 style={{
            ...mainTitle,
            fontSize: isMobile ? "24px" : "32px",
          }}>Tableau de Bord</h1>
          <p style={subtitle}>Vue d'ensemble de l'activité de la coopérative</p>
        </div>
      </div>

      <div style={{
        ...statsGrid,
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
        gap: isMobile ? 12 : 16,
      }}>
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
          icon={<FaBalanceScale size={32} />}
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
          icon={<FaCheckCircle size={32} />}
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

      <div style={{
        ...contentGrid,
        gridTemplateColumns: isTablet ? "1fr" : "repeat(3, 1fr)",
        gap: isTablet ? 16 : 20,
      }}>
        <Card title="Stock par Centre">
          {centresStats.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>Aucun centre enregistré</p>
          ) : (
            <div style={{
              ...centresGrid,
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
              gap: isMobile ? 12 : 16,
            }}>
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
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            width: isMobile ? 48 : 56,
            height: isMobile ? 48 : 56,
            minWidth: isMobile ? 48 : 56,
            borderRadius: "16px",
            background: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontWeight: 500, marginBottom: 4 }}>
            {title}
          </p>
          <p style={{ margin: 0, fontSize: isMobile ? "20px" : "24px", fontWeight: 700, color: "#1f2937" }}>{value}</p>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
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
