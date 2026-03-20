import { useCallback, useEffect, useMemo, useState } from "react"
import { FaBell, FaBriefcase, FaExternalLinkAlt, FaLeaf, FaMapMarkerAlt, FaPlus, FaSyncAlt } from "react-icons/fa"
import Button from "../components/ui/Button"
import { useToast } from "../components/ui/Toast"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../supabaseClient"
import { broadcastNotification } from "../utils/notifications"
import { syncOpportunities } from "../services/opportunitiesFetcher"
import { analyzeOpportunity } from "../services/opportunityAI"

function formatDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function sectorLabel(value) {
  return value === "cafe" ? "Cafe" : "Cacao"
}

export default function Opportunities() {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()

  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [newBadgeCount, setNewBadgeCount] = useState(0)
  const [creatingTestData, setCreatingTestData] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sortMode, setSortMode] = useState("best")

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("appels_offres")
        .select("*")
        .order("date_publication", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      setOpportunities(data || [])
    } catch {
      showToast("Impossible de charger les opportunites.", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  useEffect(() => {
    const channel = supabase
      .channel("appels_offres_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appels_offres",
        },
        (payload) => {
          const nextItem = payload.new
          if (!nextItem?.id) return

          setOpportunities((current) => {
            if (current.some((item) => item.id === nextItem.id)) return current
            return [nextItem, ...current]
          })
          setNewBadgeCount((current) => current + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredOpportunities = useMemo(() => {
    const scopedItems = filter === "all" ? opportunities : opportunities.filter((item) => item.secteur === filter)

    return [...scopedItems].sort((a, b) => {
      if (sortMode === "best") {
        const scoreDiff = (b.score || 0) - (a.score || 0)
        if (scoreDiff !== 0) return scoreDiff
      }
      return new Date(b.date_publication || b.created_at || 0) - new Date(a.date_publication || a.created_at || 0)
    })
  }, [filter, opportunities, sortMode])

  async function handleCreateTestOpportunity() {
    if (!isAdmin || !user?.id) return

    setCreatingTestData(true)
    try {
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      const sector = opportunities.length % 2 === 0 ? "cacao" : "cafe"

      const payload = {
        titre: `Appel d'offre ${sectorLabel(sector)} ${today.toLocaleDateString("fr-FR")}`,
        description:
          "Consultation test pour l'achat, la transformation ou l'exportation de produits agricoles lies a la filiere.",
        source: "Insertion manuelle",
        localisation: "Cote d'Ivoire",
        secteur: sector,
        date_publication: today.toISOString().slice(0, 10),
        date_limite: nextWeek.toISOString().slice(0, 10),
        lien: "https://example.com/opportunite-test",
      }
      const analysis = analyzeOpportunity(payload)

      const { data, error } = await supabase
        .from("appels_offres")
        .insert([
          {
            ...payload,
            score: analysis.score,
            recommendation: analysis.recommendation,
            risk: analysis.risk,
          },
        ])
        .select("*")
        .single()
      if (error) throw error

      setOpportunities((current) => {
        if (!data?.id || current.some((item) => item.id === data.id)) return current
        return [data, ...current]
      })

      await broadcastNotification({
        title: "Nouvelle opportunite disponible",
        message: `${payload.titre} - date limite ${formatDate(payload.date_limite)}`,
        type: "info",
        createdBy: user.id,
      })

      showToast("Opportunite de test ajoutee.", "success")
    } catch {
      showToast("Impossible d'ajouter l'opportunite.", "error")
    } finally {
      setCreatingTestData(false)
    }
  }

  async function handleSyncOpportunities() {
    if (!isAdmin || !user?.id || syncing) return

    setSyncing(true)
    try {
      const result = await syncOpportunities({
        client: supabase,
        createdBy: user.id,
        notify: broadcastNotification,
      })
      await loadOpportunities()

      if (result.inserted > 0) {
        showToast(`${result.inserted} opportunite(s) synchronisee(s).`, "success")
      } else {
        showToast("Aucune nouvelle opportunite a importer.", "info")
      }
    } catch {
      showToast("Synchronisation impossible.", "error")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>Nouveau module</span>
            {newBadgeCount > 0 ? <span style={styles.counterBadge}>{newBadgeCount} nouveau(x)</span> : null}
          </div>
          <h1 style={styles.title}>Opportunites</h1>
          <p style={styles.subtitle}>
            Consultez les appels d'offres lies au cacao et au cafe, avec filtrage et mise a jour temps reel.
          </p>
        </div>

        {isAdmin ? (
          <div style={styles.actionsRow}>
            <Button onClick={handleSyncOpportunities} disabled={syncing}>
              <span style={styles.buttonContent}>
                <FaSyncAlt />
                {syncing ? "Synchronisation..." : "Synchroniser les appels d'offres"}
              </span>
            </Button>
            <Button variant="secondary" onClick={handleCreateTestOpportunity} disabled={creatingTestData}>
              <span style={styles.buttonContent}>
                <FaPlus />
                {creatingTestData ? "Insertion..." : "Ajouter une donnee test"}
              </span>
            </Button>
          </div>
        ) : null}
      </div>

      <div style={styles.filterRow}>
        {[
          { id: "all", label: "Toutes", icon: FaBriefcase },
          { id: "cacao", label: "Cacao", icon: FaLeaf },
          { id: "cafe", label: "Cafe", icon: FaBell },
        ].map((item) => {
          const Icon = item.icon
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id)
                setNewBadgeCount(0)
              }}
              style={{
                ...styles.filterButton,
                ...(active ? styles.filterButtonActive : null),
              }}
            >
              <Icon />
              {item.label}
            </button>
          )
        })}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setSortMode((current) => (current === "best" ? "recent" : "best"))}
            style={{
              ...styles.filterButton,
              ...(sortMode === "best" ? styles.filterButtonActive : null),
            }}
          >
            {sortMode === "best" ? "Meilleures d'abord" : "Plus recentes"}
          </button>
        ) : null}
      </div>

      <div style={styles.list}>
        {loading ? (
          <div style={styles.emptyState}>Chargement des opportunites...</div>
        ) : filteredOpportunities.length ? (
          filteredOpportunities.map((item) => (
            <article key={item.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.headerTags}>
                  <span style={styles.sectorTag}>{sectorLabel(item.secteur)}</span>
                  <span
                    style={{
                      ...styles.scoreTag,
                      ...(item.recommendation === "BUY"
                        ? styles.scoreHigh
                        : item.recommendation === "INTERESTING"
                          ? styles.scoreMedium
                          : styles.scoreLow),
                    }}
                  >
                    {`🔥 ${item.score || 0}%`}
                  </span>
                  <span
                    style={{
                      ...styles.recommendationTag,
                      ...(item.recommendation === "BUY"
                        ? styles.scoreHigh
                        : item.recommendation === "INTERESTING"
                          ? styles.scoreMedium
                          : styles.scoreLow),
                    }}
                  >
                    {item.recommendation || "IGNORE"}
                  </span>
                  <span
                    style={{
                      ...styles.riskTag,
                      ...(item.risk === "LOW"
                        ? styles.scoreHigh
                        : item.risk === "MEDIUM"
                          ? styles.scoreMedium
                          : styles.scoreLow),
                    }}
                  >
                    {`Risk: ${item.risk || "HIGH"}`}
                  </span>
                </div>
                <span style={styles.source}>{item.source || "-"}</span>
              </div>
              <h2 style={styles.cardTitle}>{item.titre}</h2>
              <p style={styles.cardDescription}>{item.description || "Aucune description disponible."}</p>
              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  <FaMapMarkerAlt size={12} />
                  {item.localisation || "-"}
                </span>
                <span>Publication: {formatDate(item.date_publication)}</span>
                <span>Date limite: {formatDate(item.date_limite)}</span>
              </div>
              <div style={styles.cardFooter}>
                <a
                  href={item.lien || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...styles.linkButton,
                    ...(item.lien ? null : styles.linkButtonDisabled),
                  }}
                  onClick={(event) => {
                    if (!item.lien) event.preventDefault()
                  }}
                >
                  Voir <FaExternalLinkAlt size={12} />
                </a>
              </div>
            </article>
          ))
        ) : (
          <div style={styles.emptyState}>Aucun appel d'offre disponible pour ce filtre.</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    padding: "24px 28px",
    borderRadius: 24,
    background: "linear-gradient(135deg, rgba(122,31,31,0.08) 0%, rgba(255,255,255,0.96) 100%)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
  },
  badgeRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  counterBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "#111827",
    color: "#ffffff",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "clamp(24px, 4vw, 34px)",
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#475569",
    lineHeight: 1.6,
    maxWidth: 760,
  },
  buttonContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  actionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  filterButton: {
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "10px 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterButtonActive: {
    background: "#7a1f1f",
    color: "#ffffff",
    borderColor: "#7a1f1f",
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  headerTags: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sectorTag: {
    borderRadius: 999,
    background: "#ecfccb",
    color: "#3f6212",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  scoreTag: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  recommendationTag: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  riskTag: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  scoreHigh: {
    background: "#dcfce7",
    color: "#166534",
  },
  scoreMedium: {
    background: "#ffedd5",
    color: "#c2410c",
  },
  scoreLow: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
  source: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 1.3,
  },
  cardDescription: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.7,
    flex: 1,
  },
  metaRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#475569",
    fontSize: 13,
  },
  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "flex-end",
  },
  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    background: "#111827",
    color: "#ffffff",
    textDecoration: "none",
    padding: "10px 14px",
    fontWeight: 700,
  },
  linkButtonDisabled: {
    background: "#cbd5e1",
    cursor: "not-allowed",
  },
  emptyState: {
    gridColumn: "1 / -1",
    padding: 32,
    background: "#ffffff",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 20,
    color: "#64748b",
    textAlign: "center",
  },
}
