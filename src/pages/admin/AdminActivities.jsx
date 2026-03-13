import { useEffect, useState, useMemo } from "react"
import { supabase } from "../../supabaseClient"
import {
  FaHistory,
  FaUser,
  FaBuilding,
  FaUserTie,
  FaShoppingCart,
  FaFilePdf,
  FaSearch,
  FaFilter,
  FaDownload,
  FaDesktop,
  FaMobile,
  FaTablet,
  FaGlobe,
} from "react-icons/fa"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../components/ui/Toast"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { exportActivitiesPDF } from "../../utils/exportToPDF"
import { logPDFExported } from "../../utils/activityLogger"

const ACTION_TYPES = {
  all: { label: "Toutes", icon: FaHistory },
  user: { label: "Utilisateurs", icon: FaUser },
  centre: { label: "Centres", icon: FaBuilding },
  producteur: { label: "Producteurs", icon: FaUserTie },
  achat: { label: "Achats", icon: FaShoppingCart },
  system: { label: "Système", icon: FaHistory },
  pdf: { label: "PDF", icon: FaFilePdf },
  settings: { label: "Paramètres", icon: FaFilter },
}

const ACTION_FILTERS = {
  all: { label: "Toutes les actions" },
  login: { label: "Connexions" },
  logout: { label: "Déconnexions" },
  user_created: { label: "Créations utilisateurs" },
  user_updated: { label: "Modifications utilisateurs" },
  user_deleted: { label: "Suppressions utilisateurs" },
  producer_created: { label: "Créations producteurs" },
  producer_updated: { label: "Modifications producteurs" },
  producer_deleted: { label: "Suppressions producteurs" },
  centre_created: { label: "Créations centres" },
  centre_updated: { label: "Modifications centres" },
  centre_deleted: { label: "Suppressions centres" },
  pdf_exported: { label: "Exports PDF" },
}

export default function AdminActivities() {
  const { isAdmin, user: currentUser } = useAuth()
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [targetFilter, setTargetFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [exportingPDF, setExportingPDF] = useState(false)

  // Debug: Log activities state changes
  useEffect(() => {
    console.log("[AdminActivities] 📊 Activities state updated:", {
      count: activities.length,
      sample: activities[0] || null,
      firstActivity: activities[0] ? {
        id: activities[0].id,
        action: activities[0].action,
        target: activities[0].target,
        user_email: activities[0].user_email,
        created_at: activities[0].created_at,
      } : null,
    })
  }, [activities])

  // Debug: Log activities state changes
  useEffect(() => {
    console.log("[AdminActivities] 📊 Activities state updated:", {
      count: activities.length,
      sample: activities[0] || null,
      firstActivity: activities[0] ? {
        id: activities[0].id,
        action: activities[0].action,
        target: activities[0].target,
        user_email: activities[0].user_email,
        created_at: activities[0].created_at,
      } : null,
    })
  }, [activities])

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchData()
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchData()
    }, 30000)
    
    return () => clearInterval(refreshInterval)
  }, [isAdmin])

  async function fetchData() {
    try {
      setLoading(true)
      console.log("[AdminActivities] ===== FETCHING ACTIVITIES =====")

      // Fetch from activites table (includes both new and historical activities)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activites")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000) // Increased limit to include historical data

      console.log("[AdminActivities] Query result:", {
        dataLength: activitiesData?.length || 0,
        error: activitiesError,
        hasData: !!activitiesData,
        errorCode: activitiesError?.code,
        errorMessage: activitiesError?.message,
      })

      if (activitiesError) {
        console.error("[AdminActivities] ❌ Error fetching activities:", activitiesError)
        console.error("[AdminActivities] Error details:", JSON.stringify(activitiesError, null, 2))
        
        // Check if it's an RLS policy issue
        if (
          activitiesError.code === "42501" ||
          activitiesError.message?.includes("permission") ||
          activitiesError.message?.includes("policy") ||
          activitiesError.message?.includes("RLS")
        ) {
          console.error("[AdminActivities] 🔒 RLS Policy issue detected!")
          showToast("Erreur de permissions RLS. Vérifiez les politiques de la table activites.", "error")
        }
        
        // Try to fetch historical data as fallback
        console.warn("[AdminActivities] Falling back to historical data generation")
        try {
          const historicalActivities = await generateHistoricalActivities()
          console.log(`[AdminActivities] Generated ${historicalActivities.length} historical activities`)
          setActivities(historicalActivities)
        } catch (fallbackError) {
          console.error("[AdminActivities] Fallback error:", fallbackError)
          setActivities([])
        }
        return
      }

      // If we have activities from the table, use them
      if (activitiesData && activitiesData.length > 0) {
        console.log(`[AdminActivities] ✅ Loaded ${activitiesData.length} activities from database`)
        console.log("[AdminActivities] Sample activity:", activitiesData[0])
        setActivities(activitiesData)
      } else {
        // If table is empty, generate historical activities as fallback
        console.log("[AdminActivities] ⚠️ No activities in table, generating historical data")
        try {
          const historicalActivities = await generateHistoricalActivities()
          console.log(`[AdminActivities] Generated ${historicalActivities.length} historical activities`)
          setActivities(historicalActivities)
        } catch (fallbackError) {
          console.error("[AdminActivities] Error generating historical activities:", fallbackError)
          setActivities([])
        }
      }
    } catch (error) {
      console.error("[AdminActivities] ❌ Unexpected error:", error)
      console.error("[AdminActivities] Error stack:", error.stack)
      showToast("Erreur lors du chargement des activités", "error")
      setActivities([])
    } finally {
      setLoading(false)
      console.log("[AdminActivities] ===== FETCH COMPLETE =====")
    }
  }

  async function generateHistoricalActivities() {
    const activitiesList = []

    try {
      // Fetch historical users
      const { data: usersData } = await supabase
        .from("utilisateurs")
        .select("id, email, nom, role, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (usersData) {
        usersData.forEach((user) => {
          activitiesList.push({
            id: `historical-user-${user.id}`,
            user_id: user.id, // activites.user_id references auth.users.id (same as utilisateurs.id)
            user_email: user.email || "System",
            action: "user_created",
            target: "user",
            details: `User ${user.nom || user.email || "Unknown"} created with role ${user.role || "UNKNOWN"}`,
            ip_address: null,
            device: null,
            browser: null,
            os: null,
            location: null,
            created_at: user.created_at,
            is_historical: true, // Flag to identify historical activities
          })
        })
      }

      // Fetch historical producers
      const { data: producersData } = await supabase
        .from("producteurs")
        .select("id, nom, code, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (producersData) {
        producersData.forEach((producer) => {
          activitiesList.push({
            id: `historical-producer-${producer.id}`,
            user_id: null,
            user_email: "System",
            action: "producer_created",
            target: "producteur",
            details: `Producer ${producer.nom || "Unknown"}${producer.code ? ` (${producer.code})` : ""} created`,
            ip_address: null,
            device: null,
            browser: null,
            os: null,
            location: null,
            created_at: producer.created_at,
            is_historical: true,
          })
        })
      }

      // Fetch historical centres
      const { data: centresData } = await supabase
        .from("centres")
        .select("id, nom, code, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (centresData) {
        centresData.forEach((centre) => {
          activitiesList.push({
            id: `historical-centre-${centre.id}`,
            user_id: null,
            user_email: "System",
            action: "centre_created",
            target: "centre",
            details: `Centre ${centre.nom || "Unknown"}${centre.code ? ` (${centre.code})` : ""} created`,
            ip_address: null,
            device: null,
            browser: null,
            os: null,
            location: null,
            created_at: centre.created_at,
            is_historical: true,
          })
        })
      }

      // Fetch historical achats
      const { data: achatsData } = await supabase
        .from("achats")
        .select("id, nom_producteur, poids, montant, utilisateur_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200)

      if (achatsData) {
        // Fetch user emails for achats
        const userIds = [...new Set(achatsData.map((a) => a.utilisateur_id).filter(Boolean))]
        const usersMap = {}

        if (userIds.length > 0) {
          const { data: usersForAchats } = await supabase
            .from("utilisateurs")
            .select("id, email")
            .in("id", userIds)

          if (usersForAchats) {
            usersForAchats.forEach((u) => {
              usersMap[u.id] = u.email
            })
          }
        }

        achatsData.forEach((achat) => {
          const userEmail = achat.utilisateur_id ? usersMap[achat.utilisateur_id] || "System" : "System"
          activitiesList.push({
            id: `historical-achat-${achat.id}`,
            user_id: achat.utilisateur_id || null,
            user_email: userEmail,
            action: "achat_created",
            target: "achat",
            details: `Purchase of ${achat.poids || 0}kg for ${achat.nom_producteur || "Unknown"}${
              achat.montant ? ` - ${Number(achat.montant).toLocaleString()} FCFA` : ""
            }`,
            ip_address: null,
            device: null,
            browser: null,
            os: null,
            location: null,
            created_at: achat.created_at,
            is_historical: true,
          })
        })
      }
    } catch (error) {
      console.error("[AdminActivities] Error generating historical activities:", error)
    }

    // Sort by created_at descending
    return activitiesList.sort((a, b) => {
      const dateA = new Date(a.created_at || 0)
      const dateB = new Date(b.created_at || 0)
      return dateB - dateA
    })
  }

  const filteredActivities = useMemo(() => {
    console.log("[AdminActivities] Filtering activities:", {
      totalActivities: activities.length,
      targetFilter,
      actionFilter,
      searchTerm,
    })

    let filtered = activities

    // Filter by target
    if (targetFilter !== "all") {
      const beforeCount = filtered.length
      filtered = filtered.filter((a) => a.target === targetFilter)
      console.log(`[AdminActivities] After target filter (${targetFilter}): ${beforeCount} → ${filtered.length}`)
    }

    // Filter by action
    if (actionFilter !== "all") {
      const beforeCount = filtered.length
      filtered = filtered.filter((a) => a.action === actionFilter)
      console.log(`[AdminActivities] After action filter (${actionFilter}): ${beforeCount} → ${filtered.length}`)
    }

    // Filter by search term
    if (searchTerm) {
      const beforeCount = filtered.length
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.details?.toLowerCase().includes(term) ||
          a.user_email?.toLowerCase().includes(term) ||
          a.action?.toLowerCase().includes(term) ||
          a.ip_address?.toLowerCase().includes(term) ||
          a.browser?.toLowerCase().includes(term) ||
          a.device?.toLowerCase().includes(term),
      )
      console.log(`[AdminActivities] After search filter (${searchTerm}): ${beforeCount} → ${filtered.length}`)
    }

    console.log(`[AdminActivities] ✅ Final filtered count: ${filtered.length}`)
    return filtered
  }, [activities, targetFilter, actionFilter, searchTerm])

  async function handleExportPDF() {
    try {
      setExportingPDF(true)
      await exportActivitiesPDF(filteredActivities)
      
      // Log the PDF export
      await logPDFExported(
        "Activities Audit Log",
        `${filteredActivities.length} activities exported`,
        currentUser?.id || null,
        currentUser?.email || null,
      )
      
      showToast("PDF exporté avec succès", "success")
    } catch (error) {
      console.error("[AdminActivities] PDF export error:", error)
      showToast("Erreur lors de l'export PDF", "error")
    } finally {
      setExportingPDF(false)
    }
  }

  function getDeviceIcon(device) {
    if (!device) return null
    const deviceLower = device.toLowerCase()
    if (deviceLower.includes("mobile")) return <FaMobile />
    if (deviceLower.includes("tablet")) return <FaTablet />
    return <FaDesktop />
  }

  function formatIP(ip) {
    if (!ip) return "—"
    // Truncate long IPv6 addresses
    if (ip.length > 20) return ip.substring(0, 17) + "..."
    return ip
  }

  if (!isAdmin) {
    return (
      <div style={restrictedCard}>
        <FaHistory size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1f2937" }}>
          Accès réservé aux administrateurs
        </h3>
        <p style={{ margin: 0, color: "#6b7280" }}>Votre rôle ne permet pas l'accès à cette page.</p>
      </div>
    )
  }

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div>
          <h2 style={title}>Journal d'Audit</h2>
          <p style={subtitle}>Historique complet de toutes les activités du système</p>
        </div>
        <Button
          variant="primary"
          onClick={handleExportPDF}
          disabled={exportingPDF || filteredActivities.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <FaFilePdf />
          {exportingPDF ? "Export en cours..." : "Exporter PDF"}
        </Button>
      </div>

      {/* Filters and Search */}
      <div style={filtersContainer}>
        <div style={filterRow}>
          <div style={filterGroup}>
            <label style={filterLabel}>Type d'entité</label>
            <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} style={select}>
              {Object.entries(ACTION_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={select}>
              {Object.entries(ACTION_FILTERS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={searchWrapper}>
          <FaSearch style={{ color: "#9ca3af", fontSize: 18 }} />
          <Input
            placeholder="Rechercher par utilisateur, action, IP, device, browser..."
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            style={{ border: "none", background: "transparent", flex: 1 }}
          />
        </div>
      </div>

      {/* Activities Table */}
      <div style={tableCard}>
        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement des activités...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={emptyState}>
            <FaHistory size={48} style={{ color: "#9ca3af", marginBottom: 16 }} />
            <p style={{ margin: 0, color: "#6b7280", marginBottom: 8 }}>
              {searchTerm || targetFilter !== "all" || actionFilter !== "all"
                ? "Aucune activité trouvée avec les filtres sélectionnés"
                : "Aucune activité enregistrée"}
            </p>
            {activities.length > 0 && (
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "12px" }}>
                {activities.length} activité{activities.length > 1 ? "s" : ""} au total, mais filtrée{filteredActivities.length === 0 ? " (aucun résultat)" : ""}
              </p>
            )}
            {activities.length === 0 && (
              <div style={{ marginTop: 16, padding: 16, background: "#f9fafb", borderRadius: 8, maxWidth: "600px", margin: "16px auto 0" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>
                  🔍 Debug Info:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", textAlign: "left" }}>
                  <li>Vérifiez la console pour les logs de débogage</li>
                  <li>Vérifiez que la table "activites" existe dans Supabase</li>
                  <li>Vérifiez les politiques RLS pour la table "activites"</li>
                  <li>Exécutez: database/fix_activites_rls.sql si nécessaire</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Action</th>
                  <th style={th}>Cible</th>
                  <th style={th}>IP</th>
                  <th style={th}>Device</th>
                  <th style={th}>Browser</th>
                  <th style={th}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const deviceIcon = getDeviceIcon(activity.device)

                  return (
                    <tr key={activity.id}>
                      <td style={td}>
                        <div style={dateCell}>
                          {activity.created_at
                            ? new Date(activity.created_at).toLocaleString("fr-FR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </div>
                      </td>
                      <td style={td}>
                        <div style={userCell}>
                          <span style={userText}>{activity.user_email || "Système"}</span>
                          {activity.is_historical && (
                            <span style={historicalBadge} title="Historical activity reconstructed from existing data">
                              Historique
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={td}>
                        <span style={actionBadge}>{getActionLabel(activity.action)}</span>
                      </td>
                      <td style={td}>
                        <span style={targetBadge}>{getTargetLabel(activity.target)}</span>
                      </td>
                      <td style={td}>
                        <span style={ipText}>{formatIP(activity.ip_address)}</span>
                      </td>
                      <td style={td}>
                        <div style={deviceCell}>
                          {deviceIcon}
                          <span style={deviceText}>{activity.device || "—"}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={browserText}>{activity.browser || "—"}</span>
                      </td>
                      <td style={td}>
                        <span style={detailsText} title={activity.details}>
                          {activity.details || "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredActivities.length > 0 && (
        <div style={summaryCard}>
          <div style={summaryItem}>
            <strong>{filteredActivities.length}</strong> activité{filteredActivities.length > 1 ? "s" : ""} affichée
            {filteredActivities.length !== activities.length && ` sur ${activities.length}`}
          </div>
          {activities.some((a) => a.is_historical) && (
            <div style={summaryItem}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                <span style={historicalBadge}>Historique</span> = Activités reconstruites depuis les données existantes
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getActionLabel(action) {
  const labels = {
    login: "Connexion",
    logout: "Déconnexion",
    user_created: "Créé",
    user_updated: "Modifié",
    user_deleted: "Supprimé",
    user_suspended: "Suspendu",
    user_banned: "Banni",
    user_reactivated: "Réactivé",
    producer_created: "Créé",
    producer_updated: "Modifié",
    producer_deleted: "Supprimé",
    centre_created: "Créé",
    centre_updated: "Modifié",
    centre_deleted: "Supprimé",
    achat_created: "Créé",
    pdf_exported: "Exporté",
    settings_updated: "Modifié",
  }
  return labels[action] || action
}

function getTargetLabel(target) {
  const labels = {
    user: "Utilisateur",
    centre: "Centre",
    producteur: "Producteur",
    achat: "Achat",
    system: "Système",
    pdf: "PDF",
    settings: "Paramètres",
  }
  return labels[target] || target
}

// Styles
const container = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 8,
}

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
  letterSpacing: "-0.03em",
}

const subtitle = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  color: "#64748b",
  fontWeight: 500,
}

const filtersContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

const filterRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
}

const filterGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const filterLabel = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
}

const select = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  background: "white",
  color: "#1f2937",
  outline: "none",
  cursor: "pointer",
}

const searchWrapper = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
}

const tableCard = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
}

const tableWrapper = {
  overflowX: "auto",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1200px",
}

const th = {
  textAlign: "left",
  padding: "16px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  position: "sticky",
  top: 0,
  zIndex: 10,
}

const td = {
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
}

const dateCell = {
  color: "#6b7280",
  fontSize: "13px",
  whiteSpace: "nowrap",
}

const userCell = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
}

const userText = {
  color: "#1f2937",
  fontWeight: 500,
}

const historicalBadge = {
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: "4px",
  fontSize: "10px",
  fontWeight: 600,
  background: "#fef3c7",
  color: "#92400e",
  textTransform: "uppercase",
}

const actionBadge = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  background: "#eff6ff",
  color: "#2563eb",
}

const targetBadge = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  background: "#f0fdf4",
  color: "#16a34a",
}

const ipText = {
  color: "#6b7280",
  fontFamily: "monospace",
  fontSize: "12px",
}

const deviceCell = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}

const deviceText = {
  color: "#6b7280",
  fontSize: "13px",
}

const browserText = {
  color: "#6b7280",
  fontSize: "13px",
}

const detailsText = {
  color: "#1f2937",
  fontSize: "13px",
  maxWidth: "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const loadingState = {
  padding: "60px 20px",
  textAlign: "center",
  color: "#6b7280",
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f4f6",
  borderTop: "4px solid #7a1f1f",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 16px",
}

const emptyState = {
  padding: "60px 20px",
  textAlign: "center",
}

const restrictedCard = {
  background: "white",
  borderRadius: "14px",
  boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
  padding: "40px",
  maxWidth: "520px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
}

const summaryCard = {
  background: "white",
  borderRadius: "12px",
  padding: "16px 20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  fontSize: "14px",
  color: "#6b7280",
}

const summaryItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
}
