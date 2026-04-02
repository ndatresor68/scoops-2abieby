import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FaBalanceScale,
  FaBox,
  FaBuilding,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaStore,
  FaWeightHanging,
} from "react-icons/fa"
import { GiFarmer } from "react-icons/gi"
import Card from "./components/ui/Card"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useSettings } from "./context/SettingsContext"
import { supabase } from "./supabaseClient"

function toNumber(value) {
  return Number(value || 0)
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fr-FR")
}

function formatWeight(value) {
  return `${formatNumber(value)} kg`
}

function getQuantite(item) {
  return Number(item?.quantite ?? item?.poids ?? 0)
}

function StatCard({ icon, title, value, helper, accent }) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <Card padding={isMobile ? "18px" : "22px"} style={styles.statCard}>
      <div style={styles.statInner}>
        <div style={{ ...styles.statIcon, background: `${accent}14`, color: accent }}>{icon}</div>
        <div style={styles.statContent}>
          <div style={styles.statLabel}>{title}</div>
          <div style={styles.statValue}>{value}</div>
          {helper ? <div style={styles.statHelper}>{helper}</div> : null}
        </div>
      </div>
    </Card>
  )
}

export default function DashboardCentral() {
  const { settings } = useSettings()
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

  const heroMetrics = useMemo(
    () => [
      {
        label: "Volume acheté",
        value: formatWeight(stats.poidsTotal),
        accent: "#2563eb",
      },
      {
        label: "Stock disponible",
        value: formatWeight(stats.stockGlobal),
        accent: stats.stockGlobal < 100 ? "#dc2626" : "#16a34a",
      },
      {
        label: "Livraisons validées",
        value: formatNumber(stats.livraisonsValidees),
        accent: "#f59e0b",
      },
    ],
    [stats]
  )

  const statCards = useMemo(
    () => [
      {
        title: "Producteurs",
        value: formatNumber(stats.producteurs),
        helper: "Réseau coopératif",
        icon: <GiFarmer size={26} />,
        accent: "#7a1f1f",
      },
      {
        title: "Centres",
        value: formatNumber(stats.centres),
        helper: "Implantations actives",
        icon: <FaBuilding size={22} />,
        accent: "#2563eb",
      },
      {
        title: "Pesées",
        value: formatNumber(stats.achats),
        helper: "Opérations enregistrées",
        icon: <FaBalanceScale size={24} />,
        accent: "#16a34a",
      },
      {
        title: "Poids total",
        value: formatWeight(stats.poidsTotal),
        helper: "Volume cumulé",
        icon: <FaWeightHanging size={22} />,
        accent: "#f59e0b",
      },
      {
        title: "Livraisons validées",
        value: formatNumber(stats.livraisonsValidees),
        helper: "Sorties confirmées",
        icon: <FaCheckCircle size={22} />,
        accent: "#16a34a",
      },
      {
        title: "Livraisons en attente",
        value: formatNumber(stats.livraisonsAttente),
        helper: "À traiter",
        icon: <FaClock size={22} />,
        accent: "#f59e0b",
      },
    ],
    [stats]
  )

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)

      const [
        producteursRes,
        centresRes,
        achatsCountRes,
        livraisonsValideesRes,
        livraisonsAttenteRes,
        achatsDetailsRes,
        livraisonsDetailsRes,
        centresListRes,
        recentAchatsRes,
      ] = await Promise.all([
        supabase.from("producteurs").select("*", { count: "exact", head: true }),
        supabase.from("centres").select("*", { count: "exact", head: true }),
        supabase.from("achats").select("*", { count: "exact", head: true }),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "VALIDEE"),
        supabase.from("livraisons").select("*", { count: "exact", head: true }).eq("statut", "EN_ATTENTE"),
        supabase.from("achats").select("id, centre_id, poids, created_at, nom_producteur"),
        supabase.from("livraisons").select("centre_id, poids_total, quantite, statut").eq("statut", "VALIDEE"),
        supabase.from("centres").select("id, nom, code").order("nom"),
        supabase.from("achats").select("id, nom_producteur, poids, created_at").order("created_at", { ascending: false }).limit(6),
      ])

      const achatsData = achatsDetailsRes?.data || []
      const livraisonsData = livraisonsDetailsRes?.data || []
      const centresData = centresListRes?.data || []

      const totalAchats = achatsData.reduce((sum, item) => sum + getQuantite(item), 0)
      const totalLivraisons = livraisonsData.reduce((sum, item) => sum + getQuantite(item), 0)
      const stockGlobal = totalAchats - totalLivraisons
      const poidsTotal = achatsData.reduce((sum, item) => sum + toNumber(item.poids), 0)

      setStats({
        producteurs: producteursRes?.count || 0,
        centres: centresRes?.count || 0,
        achats: achatsCountRes?.count || 0,
        livraisonsValidees: livraisonsValideesRes?.count || 0,
        livraisonsAttente: livraisonsAttenteRes?.count || 0,
        stockGlobal,
        poidsTotal,
      })

      const centresCalculated = centresData.slice(0, 10).map((centre) => {
        const totalCentreAchats = achatsData
          .filter((entry) => String(entry.centre_id) === String(centre.id))
          .reduce((sum, entry) => sum + getQuantite(entry), 0)
        const totalCentreLivraisons = livraisonsData
          .filter((entry) => String(entry.centre_id) === String(centre.id))
          .reduce((sum, entry) => sum + getQuantite(entry), 0)

        return {
          id: centre.id,
          nom: centre.nom,
          code: centre.code,
          stock: totalCentreAchats - totalCentreLivraisons,
        }
      })

      setCentresStats(centresCalculated)
      setRecentAchats(recentAchatsRes?.data || [])
    } catch (error) {
      console.error("[DashboardCentral] Error:", error)
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
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loader} />
        <div style={styles.loadingText}>Chargement de l'accueil...</div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <section
        style={{
          ...styles.hero,
          gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.6fr) minmax(320px, 0.9fr)",
        }}
      >
        <div style={styles.heroMain}>
          <div style={styles.heroEyebrow}>Accueil du logiciel</div>
          <h1 style={{ ...styles.heroTitle, fontSize: isMobile ? 28 : 40 }}>
            {settings?.cooperative_name || "SCOOP ASAB-COOP-CA"}
          </h1>
          <p style={styles.heroSubtitle}>{settings?.cooperative_motto || "Union • Discipline • Travail"}</p>
          <p style={styles.heroDescription}>
            Une vue centrale plus moderne pour suivre la coopérative, piloter les opérations
            terrain et visualiser instantanément l'activité globale.
          </p>

          <div style={styles.heroMetricGrid}>
            {heroMetrics.map((item) => (
              <div key={item.label} style={styles.heroMetricCard}>
                <div style={{ ...styles.heroMetricDot, background: item.accent }} />
                <div>
                  <div style={styles.heroMetricLabel}>{item.label}</div>
                  <div style={styles.heroMetricValue}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.heroAside}>
          <div style={styles.heroAsideCard}>
            <div style={styles.heroAsideLabel}>Situation opérationnelle</div>
            <div style={styles.heroAsideValue}>{formatNumber(stats.achats)} pesées</div>
            <div style={styles.heroAsideText}>
              {formatNumber(stats.centres)} centres suivis et {formatNumber(stats.producteurs)} producteurs actifs.
            </div>
          </div>
          <div style={styles.heroAsideCardMuted}>
            <div style={styles.heroAsideLabel}>Stock global</div>
            <div style={styles.heroAsideValue}>{formatWeight(stats.stockGlobal)}</div>
            <div style={styles.heroAsideText}>
              {stats.stockGlobal < 100 ? "Niveau faible à surveiller" : "Niveau stable de stockage"}
            </div>
          </div>
        </div>
      </section>

      <section style={styles.statsGrid}>
        {statCards.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      <section
        style={{
          ...styles.contentGrid,
          gridTemplateColumns: isTablet ? "1fr" : "minmax(0, 1.2fr) minmax(0, 0.8fr)",
        }}
      >
        <Card title="Stock par centre" subtitle="Synthèse des volumes disponibles par centre de collecte.">
          {centresStats.length === 0 ? (
            <div style={styles.emptyState}>Aucun centre enregistré.</div>
          ) : (
            <div style={styles.centreList}>
              {centresStats.map((centre) => (
                <div key={centre.id} style={styles.centreItem}>
                  <div>
                    <div style={styles.centreName}>{centre.nom}</div>
                    <div style={styles.centreCode}>{centre.code || "Centre"}</div>
                  </div>
                  <div style={styles.centreStockWrap}>
                    <FaStore size={16} color={centre.stock < 100 ? "#dc2626" : "#16a34a"} />
                    <strong
                      style={{
                        ...styles.centreStock,
                        color: centre.stock < 100 ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {formatWeight(centre.stock)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Activité récente" subtitle="Dernières pesées enregistrées dans le système.">
          {recentAchats.length === 0 ? (
            <div style={styles.emptyState}>Aucune pesée récente.</div>
          ) : (
            <div style={styles.recentList}>
              {recentAchats.map((achat) => (
                <div key={achat.id} style={styles.recentItem}>
                  <div>
                    <div style={styles.recentProducteur}>{achat.nom_producteur || "Producteur"}</div>
                    <div style={styles.recentDate}>
                      {achat.created_at
                        ? new Date(achat.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </div>
                  </div>
                  <div style={styles.recentWeight}>{formatWeight(achat.poids)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card title="Lecture rapide" subtitle="Indicateurs clés pour suivre la dynamique de la coopérative.">
        <div style={styles.insightGrid}>
          <div style={styles.insightItem}>
            <FaChartLine size={18} color="#2563eb" />
            <span>Le volume total acheté atteint {formatWeight(stats.poidsTotal)}.</span>
          </div>
          <div style={styles.insightItem}>
            <FaCheckCircle size={18} color="#16a34a" />
            <span>{formatNumber(stats.livraisonsValidees)} livraisons ont déjà été validées.</span>
          </div>
          <div style={styles.insightItem}>
            <FaClock size={18} color="#f59e0b" />
            <span>{formatNumber(stats.livraisonsAttente)} livraisons restent en attente de traitement.</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  loadingWrap: {
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "4px solid #e5e7eb",
    borderTopColor: "#7a1f1f",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  hero: {
    display: "grid",
    gap: 20,
    padding: 24,
    borderRadius: 28,
    background:
      "linear-gradient(135deg, rgba(122,31,31,0.08) 0%, rgba(255,255,255,0.96) 36%, rgba(239,246,255,0.92) 100%)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 24px 48px rgba(15, 23, 42, 0.06)",
  },
  heroMain: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7a1f1f",
  },
  heroTitle: {
    margin: 0,
    lineHeight: 1.05,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: "-0.05em",
  },
  heroSubtitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#7a1f1f",
  },
  heroDescription: {
    margin: 0,
    maxWidth: 780,
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 14,
  },
  heroMetricGrid: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  heroMetricCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(226,232,240,0.95)",
  },
  heroMetricDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
  },
  heroMetricLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },
  heroMetricValue: {
    marginTop: 4,
    fontSize: 18,
    color: "#0f172a",
    fontWeight: 800,
  },
  heroAside: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heroAsideCard: {
    padding: "18px 18px 20px",
    borderRadius: 22,
    background: "linear-gradient(135deg, #7a1f1f 0%, #b02a2a 100%)",
    color: "#fff",
    boxShadow: "0 18px 30px rgba(122, 31, 31, 0.22)",
  },
  heroAsideCardMuted: {
    padding: "18px 18px 20px",
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },
  heroAsideLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 800,
    opacity: 0.86,
  },
  heroAsideValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    color: "inherit",
  },
  heroAsideText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 1.6,
    color: "inherit",
    opacity: 0.88,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  statCard: {
    minHeight: 124,
  },
  statInner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  statIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statContent: {
    minWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
  },
  statValue: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.04em",
  },
  statHelper: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
  },
  contentGrid: {
    display: "grid",
    gap: 20,
  },
  centreList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  centreItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#f8fafc",
  },
  centreName: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  centreCode: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  centreStockWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  centreStock: {
    fontSize: 14,
  },
  recentList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  recentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },
  recentProducteur: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  recentDate: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  recentWeight: {
    fontSize: 14,
    fontWeight: 800,
    color: "#7a1f1f",
    flexShrink: 0,
  },
  emptyState: {
    padding: "20px 4px",
    textAlign: "center",
    color: "#64748b",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  insightItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 18px",
    borderRadius: 16,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
    color: "#334155",
    lineHeight: 1.6,
    fontSize: 14,
  },
}
