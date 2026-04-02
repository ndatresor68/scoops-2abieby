import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../supabaseClient"
import {
  FaBuilding,
  FaChartLine,
  FaExclamationTriangle,
  FaIdBadge,
  FaMoneyBillWave,
  FaPlus,
  FaUserFriends,
  FaUserTie,
  FaUsers,
  FaWeightHanging,
} from "react-icons/fa"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import Card from "../../components/ui/Card"
import { AdminPage, AdminPanel, AdminQuickActions } from "../../components/ui/AdminPage"
import { buildEmployeAlerts, buildEmployesPerCentre } from "../../modules/employes/employes.utils"

function navigateAdmin(section) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin:navigate", { detail: { section } }))
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fr-FR")
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`
}

function formatWeight(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} kg`
}

function formatDate(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getEntryDate(entry) {
  const value = entry?.date_pesee || entry?.created_at
  return value ? new Date(value) : null
}

function sumBy(items, accessor) {
  return items.reduce((total, item) => total + (Number(accessor(item)) || 0), 0)
}

function MetricCard({ item }) {
  return (
    <Card padding="18px" style={styles.metricCard}>
      <div style={styles.metricInner}>
        <div
          style={{
            ...styles.metricIcon,
            background: `${item.accent || "#0f172a"}14`,
            color: item.accent || "#0f172a",
          }}
        >
          {item.icon}
        </div>
        <div style={styles.metricCopy}>
          <div style={styles.metricValue} title={item.value}>
            {item.value}
          </div>
          <div style={styles.metricLabel}>{item.label}</div>
          {item.helper ? (
            <div style={styles.metricHelper} title={item.helper}>
              {item.helper}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function StatSection({ title, subtitle, items, columns = 3 }) {
  return (
    <AdminPanel title={title} subtitle={subtitle}>
      <div
        style={{
          ...styles.metricGrid,
          gridTemplateColumns:
            columns === 4
              ? "repeat(auto-fit, minmax(210px, 1fr))"
              : "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {items.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>
    </AdminPanel>
  )
}

export default function AdminStats() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    totalAgents: 0,
    activeAgents: 0,
    bestAgentName: "-",
    bestAgentVolume: 0,
    totalCentres: 0,
    mostActiveCentreName: "-",
    mostActiveCentreCount: 0,
    totalEmployes: 0,
    activeEmployes: 0,
    inactiveEmployes: 0,
    totalSalaires: 0,
    totalProduction: 0,
    averageProduction: 0,
    bestProducerName: "-",
    bestProducerVolume: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    bestEarningName: "-",
    bestEarningValue: 0,
  })
  const [monthlySeries, setMonthlySeries] = useState([])
  const [poidsParCentre, setPoidsParCentre] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [employesParCentre, setEmployesParCentre] = useState([])
  const [employeAlerts, setEmployeAlerts] = useState([])

  useEffect(() => {
    fetchStats()
    const refreshInterval = setInterval(fetchStats, 30000)
    return () => clearInterval(refreshInterval)
  }, [])

  async function runDashboardQuery(label, query) {
    try {
      const result = await query
      console.log(`[AdminStats] ${label} data:`, result?.data)
      console.log(`[AdminStats] ${label} error:`, result?.error)
      return result || { data: null, error: null }
    } catch (error) {
      console.error(`[AdminStats] ${label} exception:`, error)
      return { data: null, error }
    }
  }

  async function fetchStats() {
    try {
      setLoading(true)
      setErrorMessage("")

      const [usersRes, centresRes, achatsRes, notificationsResRaw, employesResRaw] = await Promise.all([
        runDashboardQuery(
          "utilisateurs",
          supabase.from("utilisateurs").select("id, nom, email, role, status, created_at")
        ),
        runDashboardQuery("centres", supabase.from("centres").select("id, nom")),
        runDashboardQuery(
          "achats",
          supabase.from("achats").select("poids, montant, centre_id, utilisateur_id, nom_agent, date_pesee, created_at")
        ),
        runDashboardQuery(
          "notifications",
          supabase
            .from("notifications")
            .select("id, title, message, created_at")
            .not("admin_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(6)
        ),
        runDashboardQuery("employes", supabase.from("employes").select("id, centre_id, salaire, statut, statut_paiement")),
      ])

      let notificationsRes = notificationsResRaw
      if (notificationsRes?.error?.message?.includes("admin_id")) {
        notificationsRes = await runDashboardQuery(
          "notifications:fallback",
          supabase.from("notifications").select("id, title, message, created_at").order("created_at", { ascending: false }).limit(6)
        )
      }

      let employesRes = employesResRaw
      if (
        employesRes?.error?.message?.includes("statut_paiement") ||
        employesRes?.error?.message?.includes("Could not find the")
      ) {
        employesRes = await runDashboardQuery(
          "employes:fallback",
          supabase.from("employes").select("id, centre_id, salaire, statut")
        )
      }

      const usersData = (usersRes?.data || []).map((entry) => ({
        ...entry,
        status: entry.status || "active",
      }))
      const agentsData = usersData.filter((entry) => entry.role === "AGENT")
      const centresData = centresRes?.data || []
      const achatsData = achatsRes?.data || []
      const notificationsData = notificationsRes?.data || []
      const employesData = employesRes?.data || []

      const criticalErrors = [usersRes?.error, centresRes?.error, achatsRes?.error].filter(Boolean)
      if (criticalErrors.length) {
        setErrorMessage("Certaines données administrateur sont indisponibles pour le moment. Les indicateurs affichent les résultats récupérés.")
      }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const centreNameById = Object.fromEntries(
        centresData.map((centre) => [String(centre.id), centre.nom || `Centre ${centre.id}`])
      )

      const agentNameById = Object.fromEntries(
        agentsData.map((agent) => [String(agent.id), agent.nom || agent.email || "Agent"])
      )

      const centrePerformanceMap = achatsData.reduce((accumulator, entry) => {
        const key = String(entry.centre_id || "unknown")
        const current = accumulator[key] || {
          name: centreNameById[key] || "Centre non attribué",
          volume: 0,
          transactions: 0,
        }

        current.volume += Number(entry.poids) || 0
        current.transactions += 1
        accumulator[key] = current
        return accumulator
      }, {})

      const agentPerformanceMap = achatsData.reduce((accumulator, entry) => {
        const key = String(entry.utilisateur_id || entry.nom_agent || "unknown")
        const current = accumulator[key] || {
          name: agentNameById[String(entry.utilisateur_id)] || entry.nom_agent || "Agent non attribué",
          volume: 0,
          revenue: 0,
        }

        current.volume += Number(entry.poids) || 0
        current.revenue += Number(entry.montant) || 0
        accumulator[key] = current
        return accumulator
      }, {})

      const centreByVolume = Object.values(centrePerformanceMap).sort((a, b) => b.volume - a.volume)
      const centreByActivity = [...centreByVolume].sort((a, b) => b.transactions - a.transactions)
      const agentByVolume = Object.values(agentPerformanceMap).sort((a, b) => b.volume - a.volume)
      const agentByRevenue = [...agentByVolume].sort((a, b) => b.revenue - a.revenue)

      const totalProduction = sumBy(achatsData, (entry) => entry.poids)
      const totalRevenue = sumBy(achatsData, (entry) => entry.montant)
      const monthlyRevenue = sumBy(
        achatsData.filter((entry) => {
          const date = getEntryDate(entry)
          return date && date >= startOfMonth
        }),
        (entry) => entry.montant
      )

      const averageProduction = agentsData.length ? totalProduction / agentsData.length : 0

      const nextMonthlySeries = []
      for (let index = 5; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
        const monthItems = achatsData.filter((entry) => {
          const currentDate = getEntryDate(entry)
          return (
            currentDate &&
            currentDate.getFullYear() === date.getFullYear() &&
            currentDate.getMonth() === date.getMonth()
          )
        })

        nextMonthlySeries.push({
          mois: date.toLocaleDateString("fr-FR", { month: "short" }),
          poids: Math.round(sumBy(monthItems, (entry) => entry.poids) * 100) / 100,
        })
      }

      const nextPoidsParCentre = centreByVolume.slice(0, 6).map((entry) => ({
        centre: entry.name,
        poids: Math.round(entry.volume * 100) / 100,
      }))
      const nextEmployesParCentre = buildEmployesPerCentre(employesData, centresData).slice(0, 6)
      const nextEmployeAlerts = buildEmployeAlerts(employesData)

      const recentUsers = usersData
        .filter((entry) => entry.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4)

      const mergedActivity = [
        ...recentUsers.map((entry) => ({
          id: `user-${entry.id}`,
          kind: "user",
          title: entry.nom || entry.email,
          description: `Nouveau compte ${entry.role || "utilisateur"}`,
          created_at: entry.created_at,
        })),
        ...notificationsData.map((entry) => ({
          id: `notification-${entry.id}`,
          kind: "notification",
          title: entry.title || "Notification",
          description: entry.message || "Notification administrateur",
          created_at: entry.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8)

      setStats({
        totalUsers: usersData.length,
        activeUsers: usersData.filter((entry) => entry.status === "active").length,
        bannedUsers: usersData.filter((entry) => entry.status === "banned").length,
        totalAgents: agentsData.length,
        activeAgents: agentsData.filter((entry) => (entry.status || "active") === "active").length,
        bestAgentName: agentByVolume[0]?.name || "-",
        bestAgentVolume: Math.round((agentByVolume[0]?.volume || 0) * 100) / 100,
        totalCentres: centresData.length,
        mostActiveCentreName: centreByActivity[0]?.name || "-",
        mostActiveCentreCount: centreByActivity[0]?.transactions || 0,
        totalEmployes: employesData.length,
        activeEmployes: employesData.filter((entry) => String(entry.statut || "").trim().toUpperCase() === "ACTIF").length,
        inactiveEmployes: employesData.filter((entry) => String(entry.statut || "").trim().toUpperCase() !== "ACTIF").length,
        totalSalaires: Math.round(sumBy(employesData, (entry) => entry.salaire) * 100) / 100,
        totalProduction: Math.round(totalProduction * 100) / 100,
        averageProduction: Math.round(averageProduction * 100) / 100,
        bestProducerName: agentByVolume[0]?.name || "-",
        bestProducerVolume: Math.round((agentByVolume[0]?.volume || 0) * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        bestEarningName: agentByRevenue[0]?.name || "-",
        bestEarningValue: Math.round((agentByRevenue[0]?.revenue || 0) * 100) / 100,
      })

      setMonthlySeries(nextMonthlySeries)
      setPoidsParCentre(nextPoidsParCentre)
      setRecentActivity(mergedActivity)
      setEmployesParCentre(nextEmployesParCentre)
      setEmployeAlerts(nextEmployeAlerts)
    } catch (error) {
      console.error("[AdminStats] Unexpected error:", error)
      setErrorMessage("Impossible de charger complètement le dashboard administrateur.")
    } finally {
      setLoading(false)
    }
  }

  const userStats = useMemo(
    () => [
      {
        label: "Total users",
        value: formatNumber(stats.totalUsers),
        helper: "Comptes",
        icon: <FaUsers />,
        accent: "#2563eb",
      },
      {
        label: "Active users",
        value: formatNumber(stats.activeUsers),
        helper: "En ligne",
        icon: <FaUsers />,
        accent: "#0f766e",
      },
      {
        label: "Banned users",
        value: formatNumber(stats.bannedUsers),
        helper: "Restreints",
        icon: <FaUsers />,
        accent: "#dc2626",
      },
    ],
    [stats]
  )

  const agentStats = useMemo(
    () => [
      {
        label: "Total agents",
        value: formatNumber(stats.totalAgents),
        helper: "Terrain",
        icon: <FaUserFriends />,
        accent: "#7c3aed",
      },
      {
        label: "Active agents",
        value: formatNumber(stats.activeAgents),
        helper: "Disponibles",
        icon: <FaUserFriends />,
        accent: "#9333ea",
      },
      {
        label: "Best agent",
        value: stats.bestAgentName,
        helper: formatWeight(stats.bestAgentVolume),
        icon: <FaUserFriends />,
        accent: "#8b5cf6",
      },
    ],
    [stats]
  )

  const centreStats = useMemo(
    () => [
      {
        label: "Total centres",
        value: formatNumber(stats.totalCentres),
        helper: "Réseau",
        icon: <FaBuilding />,
        accent: "#059669",
      },
      {
        label: "Most active centre",
        value: stats.mostActiveCentreName,
        helper: `${formatNumber(stats.mostActiveCentreCount)} transactions`,
        icon: <FaBuilding />,
        accent: "#0284c7",
      },
    ],
    [stats]
  )

  const employeStats = useMemo(
    () => [
      {
        label: "Total employees",
        value: formatNumber(stats.totalEmployes),
        helper: "Effectif",
        icon: <FaIdBadge />,
        accent: "#2563eb",
      },
      {
        label: "Active employees",
        value: formatNumber(stats.activeEmployes),
        helper: "En poste",
        icon: <FaIdBadge />,
        accent: "#059669",
      },
      {
        label: "Inactive employees",
        value: formatNumber(stats.inactiveEmployes),
        helper: "Suspendus / inactifs",
        icon: <FaIdBadge />,
        accent: "#dc2626",
      },
      {
        label: "Monthly personnel cost",
        value: formatCurrency(stats.totalSalaires),
        helper: "Coût total mensuel",
        icon: <FaMoneyBillWave />,
        accent: "#7c3aed",
      },
    ],
    [stats]
  )

  const productionStats = useMemo(
    () => [
      {
        label: "Total production",
        value: formatWeight(stats.totalProduction),
        helper: "Volume global",
        icon: <FaWeightHanging />,
        accent: "#2563eb",
      },
      {
        label: "Average production",
        value: formatWeight(stats.averageProduction),
        helper: "Par agent",
        icon: <FaChartLine />,
        accent: "#7c3aed",
      },
      {
        label: "Best producer",
        value: stats.bestProducerName,
        helper: formatWeight(stats.bestProducerVolume),
        icon: <FaUserTie />,
        accent: "#ea580c",
      },
      {
        label: "Montant total pesées",
        value: formatCurrency(stats.totalRevenue),
        helper: "Montant cumulé",
        icon: <FaMoneyBillWave />,
        accent: "#7c3aed",
      },
    ],
    [stats]
  )

  const financialStats = useMemo(
    () => [
      {
        label: "Total revenue",
        value: formatCurrency(stats.totalRevenue),
        helper: "Cumul",
        icon: <FaMoneyBillWave />,
        accent: "#059669",
      },
      {
        label: "Monthly revenue",
        value: formatCurrency(stats.monthlyRevenue),
        helper: "Mois en cours",
        icon: <FaChartLine />,
        accent: "#dc2626",
      },
      {
        label: "Best earning",
        value: stats.bestEarningName,
        helper: formatCurrency(stats.bestEarningValue),
        icon: <FaMoneyBillWave />,
        accent: "#16a34a",
      },
    ],
    [stats]
  )

  const quickActions = [
    {
      label: "Ajouter un utilisateur",
      description: "Créer un nouveau compte administré.",
      icon: <FaPlus />,
      accent: "#2563eb",
      onClick: () => navigateAdmin("users"),
    },
    {
      label: "Ajouter un agent",
      description: "Créer ou gérer un agent terrain.",
      icon: <FaUserFriends />,
      accent: "#7c3aed",
      onClick: () => navigateAdmin("agents"),
    },
    {
      label: "Gérer les centres",
      description: "Accéder à l'organisation des centres.",
      icon: <FaBuilding />,
      accent: "#059669",
      onClick: () => navigateAdmin("centres"),
    },
    {
      label: "Gérer le personnel",
      description: "Ajouter et suivre les employés.",
      icon: <FaIdBadge />,
      accent: "#7c3aed",
      onClick: () => navigateAdmin("employes"),
    },
  ]

  return (
    <AdminPage
      title="Dashboard"
      subtitle="Vue dense et structurée des indicateurs métiers essentiels sans surcharge visuelle."
      aside={<AdminQuickActions title="Quick actions" items={quickActions} />}
    >
      <div style={styles.dashboardStack}>
        {errorMessage ? <div style={styles.errorBanner}>{errorMessage}</div> : null}

        <StatSection title="Users" subtitle="Population et statuts des comptes." items={userStats} />
        <StatSection title="Agents" subtitle="Effectif actif et meilleur agent." items={agentStats} />
        <StatSection title="Centres" subtitle="Couverture et activité des centres." items={centreStats} />
        <StatSection title="Personnel" subtitle="Effectif, actifs et masse salariale." items={employeStats} />

        <AdminPanel title="Personnel insights" subtitle="Répartition des employés et alertes de paiement.">
          <div style={styles.personnelGrid}>
            <div style={styles.chartBlock}>
              <div style={styles.chartTitleRow}>
                <span style={{ ...styles.chartIcon, background: "rgba(124, 58, 237, 0.14)", color: "#7c3aed" }}>
                  <FaIdBadge size={14} />
                </span>
                <div>
                  <div style={styles.chartTitle}>Employés par centre</div>
                  <div style={styles.chartSubtitle}>Centres les plus dotés en personnel</div>
                </div>
              </div>
              {loading ? (
                <div style={styles.loading}>Chargement des centres...</div>
              ) : employesParCentre.length === 0 ? (
                <div style={styles.empty}>Aucune donnée personnel</div>
              ) : (
                <div style={styles.personnelCentreList}>
                  {employesParCentre.map((entry) => (
                    <div key={entry.centre} style={styles.personnelCentreRow}>
                      <div>
                        <div style={styles.personnelCentreName}>{entry.centre}</div>
                        <div style={styles.personnelCentreMeta}>{formatCurrency(entry.totalSalary)} / mois</div>
                      </div>
                      <div style={styles.personnelCentreCount}>{entry.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.chartBlock}>
              <div style={styles.chartTitleRow}>
                <span style={{ ...styles.chartIcon, background: "rgba(220, 38, 38, 0.14)", color: "#dc2626" }}>
                  <FaExclamationTriangle size={14} />
                </span>
                <div>
                  <div style={styles.chartTitle}>Alertes RH</div>
                  <div style={styles.chartSubtitle}>Paiements et situations à surveiller</div>
                </div>
              </div>
              {loading ? (
                <div style={styles.loading}>Chargement des alertes...</div>
              ) : employeAlerts.length === 0 ? (
                <div style={styles.empty}>Aucune alerte RH actuellement</div>
              ) : (
                <div style={styles.alertList}>
                  {employeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        ...styles.alertCard,
                        ...(alert.tone === "danger"
                          ? styles.alertDanger
                          : alert.tone === "warning"
                            ? styles.alertWarning
                            : styles.alertInfo),
                      }}
                    >
                      <div style={styles.alertTitle}>{alert.title}</div>
                      <div style={styles.alertDescription}>{alert.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminPanel>

        <StatSection title="Production" subtitle="Volumes globaux et meilleure performance." items={productionStats} />
        <StatSection title="Financial" subtitle="Revenus globaux, mensuels et top performer." items={financialStats} />

        <AdminPanel title="Analytics" subtitle="Évolution des volumes et activité des centres.">
          {loading ? (
            <div style={styles.loading}>Chargement des analytics...</div>
          ) : (
            <div style={styles.analyticsGrid}>
              <div style={styles.chartBlock}>
                <div style={styles.chartTitleRow}>
                  <span style={styles.chartIcon}>
                    <FaChartLine size={14} />
                  </span>
                  <div>
                    <div style={styles.chartTitle}>Production mensuelle</div>
                    <div style={styles.chartSubtitle}>Volume collecté sur les six derniers mois</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={236}>
                  <LineChart data={monthlySeries}>
                    <CartesianGrid stroke="var(--admin-border-soft)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mois" stroke="var(--admin-text-muted)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--admin-text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={styles.tooltip} />
                    <Line type="monotone" dataKey="poids" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartBlock}>
                <div style={styles.chartTitleRow}>
                  <span style={{ ...styles.chartIcon, background: "rgba(153, 27, 27, 0.14)", color: "#991b1b" }}>
                    <FaWeightHanging size={14} />
                  </span>
                  <div>
                    <div style={styles.chartTitle}>Top centres</div>
                    <div style={styles.chartSubtitle}>Comparaison des centres par volume</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={236}>
                  <BarChart data={poidsParCentre}>
                    <CartesianGrid stroke="var(--admin-border-soft)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="centre" stroke="var(--admin-text-muted)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--admin-text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={styles.tooltip} />
                    <Bar dataKey="poids" fill="#991b1b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="Activité récente" subtitle="Dernières créations de comptes et communications administrateur.">
          <div style={styles.activityList}>
            {loading ? (
              <div style={styles.loading}>Chargement des activités...</div>
            ) : recentActivity.length === 0 ? (
              <div style={styles.empty}>Aucune activité récente</div>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} style={styles.activityItem}>
                  <div style={styles.activityBadge}>{item.kind === "notification" ? <FaChartLine size={12} /> : <FaUsers size={12} />}</div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityTitle}>{item.title}</div>
                    <div style={styles.activityDescription}>{item.description}</div>
                  </div>
                  <div style={styles.activityDate}>{formatDate(item.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      </div>
    </AdminPage>
  )
}

const styles = {
  dashboardStack: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  errorBanner: {
    padding: "12px 14px",
    borderRadius: 16,
    background: "rgba(254, 242, 242, 0.95)",
    border: "1px solid rgba(252, 165, 165, 0.8)",
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: 600,
  },
  metricGrid: {
    display: "grid",
    gap: 16,
    alignItems: "stretch",
  },
  metricCard: {
    minHeight: 168,
    borderRadius: 20,
    boxShadow: "var(--admin-shadow-card)",
  },
  metricInner: {
    minHeight: 132,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 10,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricCopy: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  metricValue: {
    maxWidth: "100%",
    fontSize: "clamp(20px, 2.4vw, 25px)",
    lineHeight: 1.12,
    fontWeight: 800,
    color: "var(--admin-text)",
    letterSpacing: "-0.04em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metricLabel: {
    maxWidth: "100%",
    fontSize: 13,
    lineHeight: 1.3,
    fontWeight: 700,
    color: "var(--admin-text-soft)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metricHelper: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 1.35,
    color: "var(--admin-text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  personnelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  chartBlock: {
    border: "1px solid var(--admin-border)",
    borderRadius: 20,
    padding: 14,
    background: "var(--admin-card-muted-bg)",
  },
  chartTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    minWidth: 0,
  },
  chartIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "rgba(37, 99, 235, 0.14)",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  chartSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "var(--admin-text-soft)",
  },
  tooltip: {
    background: "var(--admin-surface)",
    border: "1px solid var(--admin-border)",
    borderRadius: 14,
    boxShadow: "var(--admin-shadow-soft)",
  },
  personnelCentreList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  personnelCentreRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid var(--admin-border)",
    borderRadius: 16,
    padding: 12,
    background: "var(--admin-surface)",
  },
  personnelCentreName: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  personnelCentreMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--admin-text-soft)",
  },
  personnelCentreCount: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(124, 58, 237, 0.14)",
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: 800,
    flexShrink: 0,
  },
  alertList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  alertCard: {
    borderRadius: 16,
    padding: "14px 16px",
    border: "1px solid transparent",
  },
  alertDanger: {
    background: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.22)",
  },
  alertWarning: {
    background: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.22)",
  },
  alertInfo: {
    background: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.22)",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--admin-text)",
  },
  alertDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--admin-text-soft)",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  activityItem: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    border: "1px solid var(--admin-border)",
    borderRadius: 18,
    padding: 12,
    background: "var(--admin-surface)",
  },
  activityBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "rgba(37, 99, 235, 0.14)",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    minWidth: 0,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--admin-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  activityDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "var(--admin-text-soft)",
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  activityDate: {
    fontSize: 12,
    color: "var(--admin-text-muted)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  loading: {
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--admin-text-soft)",
    fontSize: 14,
  },
  empty: {
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--admin-text-muted)",
    fontSize: 14,
  },
}
