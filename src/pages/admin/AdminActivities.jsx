import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FaDownload, FaHistory, FaSearch, FaShieldAlt, FaUserSecret } from "react-icons/fa"
import { AdminPage, AdminPanel } from "../../components/ui/AdminPage"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../supabaseClient"
import { exportActivityAuditReportPDF } from "../../utils/exportToPDF"
import { logPDFExported } from "../../utils/activityLogger"

function formatDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminActivities() {
  const { isAdmin, user: currentUser } = useAuth()
  const { showToast } = useToast()
  const hasFetchedRef = useRef(false)

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [analysis, setAnalysis] = useState(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      showToast("Impossible de charger les logs d'activité", "error")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchLogs()
  }, [fetchLogs, isAdmin])

  const userOptions = useMemo(() => {
    const map = new Map()
    logs.forEach((log) => {
      if (log.user_id || log.user_name) {
        map.set(log.user_id || log.user_name, {
          id: log.user_id || log.user_name,
          name: log.user_name || "Utilisateur",
        })
      }
    })
    return [...map.values()]
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedUser !== "all" && (log.user_id || log.user_name) !== selectedUser) {
        return false
      }

      if (dateFrom && new Date(log.created_at) < new Date(`${dateFrom}T00:00:00`)) {
        return false
      }

      if (dateTo && new Date(log.created_at) > new Date(`${dateTo}T23:59:59`)) {
        return false
      }

      if (!searchTerm.trim()) return true
      const term = searchTerm.trim().toLowerCase()
      return [log.user_name, log.action, log.details, log.page]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [dateFrom, dateTo, logs, searchTerm, selectedUser])

  const stats = useMemo(
    () => [
      {
        label: "Total logs",
        value: logs.length.toLocaleString("fr-FR"),
        icon: <FaHistory />,
        accent: "#2563eb",
        helper: "Audit trail",
      },
      {
        label: "Logs filtrés",
        value: filteredLogs.length.toLocaleString("fr-FR"),
        icon: <FaSearch />,
        accent: "#7c3aed",
        helper: "Résultats",
      },
      {
        label: "Utilisateurs actifs",
        value: new Set(logs.map((log) => log.user_id || log.user_name).filter(Boolean)).size.toLocaleString("fr-FR"),
        icon: <FaShieldAlt />,
        accent: "#059669",
        helper: "Présents dans les logs",
      },
      {
        label: "Anomalies IA",
        value: String(analysis?.anomalies?.length || 0),
        icon: <FaUserSecret />,
        accent: "#dc2626",
        helper: "Détectées",
      },
    ],
    [analysis, filteredLogs.length, logs],
  )

  async function handleAnalyze() {
    if (filteredLogs.length === 0) {
      showToast("Aucun log à analyser", "warning")
      return
    }

    try {
      setAnalyzing(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      const response = await fetch("/api/analyze-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          logs: filteredLogs.slice(0, 200),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.reply || "Analyse impossible")
      }

      setAnalysis({
        summary: data.summary || "Aucun résumé disponible.",
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        anomalies: Array.isArray(data.anomalies) ? data.anomalies : [],
      })
      showToast("Analyse IA générée", "success")
    } catch (error) {
      showToast(error.message || "Impossible d'analyser les logs", "error")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDownloadReport() {
    if (filteredLogs.length === 0) {
      showToast("Aucun log à exporter", "warning")
      return
    }

    try {
      setExporting(true)
      await exportActivityAuditReportPDF({
        logs: filteredLogs,
        analysis,
        filename: "activity-monitoring-report",
      })
      await logPDFExported(
        "Activity Monitoring Report",
        `${filteredLogs.length} logs exported`,
        currentUser?.id || null,
        currentUser?.email || null,
      )
      showToast("Rapport téléchargé avec succès", "success")
    } catch (error) {
      showToast("Erreur lors de la génération du rapport", "error")
    } finally {
      setExporting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div style={styles.restrictedCard}>
        <FaShieldAlt size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h3 style={styles.restrictedTitle}>Accès réservé aux administrateurs</h3>
        <p style={styles.restrictedText}>Cette page d'audit n'est accessible qu'aux administrateurs.</p>
      </div>
    )
  }

  return (
    <AdminPage
      title="Activity Monitoring"
      subtitle="Surveillez l'activité globale, détectez les actions sensibles et exportez un rapport administrateur complet."
      stats={stats}
      actions={
        <>
          <Button variant="secondary" onClick={handleAnalyze} disabled={analyzing || filteredLogs.length === 0}>
            {analyzing ? "Analyse..." : "Analyser avec IA"}
          </Button>
          <Button icon={<FaDownload />} onClick={handleDownloadReport} disabled={exporting || filteredLogs.length === 0}>
            {exporting ? "Téléchargement..." : "Download Report"}
          </Button>
        </>
      }
    >
      <AdminPanel title="Filtres d'audit" subtitle="Filtrez par utilisateur, date et recherche libre.">
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Utilisateur</label>
            <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} style={styles.select}>
              <option value="all">Tous les utilisateurs</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Date début</label>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={styles.input} />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Date fin</label>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={styles.input} />
          </div>
        </div>
        <div style={styles.searchBox}>
          <Input
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher par action, utilisateur, page ou détail..."
          />
        </div>
      </AdminPanel>

      <AdminPanel title="AI Monitoring" subtitle="Résumé automatique, anomalies et actions critiques détectées.">
        {analysis ? (
          <div style={styles.analysisGrid}>
            <div style={styles.analysisBlock}>
              <div style={styles.analysisTitle}>Résumé</div>
              <div style={styles.analysisText}>{analysis.summary}</div>
            </div>
            <div style={styles.analysisBlock}>
              <div style={styles.analysisTitle}>Highlights</div>
              {analysis.highlights.length ? (
                <div style={styles.list}>
                  {analysis.highlights.map((item) => (
                    <div key={item} style={styles.listItem}>
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.analysisText}>Aucun highlight détecté.</div>
              )}
            </div>
            <div style={styles.analysisBlock}>
              <div style={styles.analysisTitle}>Anomalies</div>
              {analysis.anomalies.length ? (
                <div style={styles.list}>
                  {analysis.anomalies.map((item, index) => (
                    <div key={`${item.title || "anomaly"}-${index}`} style={styles.listItem}>
                      <strong>{item.title || "Alerte"}</strong>: {item.reason || "-"}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.analysisText}>Aucune anomalie majeure détectée.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.analysisEmpty}>Lancez une analyse IA pour détecter les comportements sensibles.</div>
        )}
      </AdminPanel>

      <AdminPanel title="Audit Timeline" subtitle="Historique complet des actions enregistrées dans la nouvelle table d'audit.">
        <div style={styles.tableShell}>
          {loading ? (
            <div style={styles.loadingState}>Chargement des logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={styles.emptyState}>Aucun log trouvé avec les filtres actuels.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Utilisateur</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Page</th>
                    <th style={styles.th}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={styles.td}>{formatDate(log.created_at)}</td>
                      <td style={styles.td}>{log.user_name || "-"}</td>
                      <td style={styles.td}>
                        <span style={styles.actionBadge}>{log.action}</span>
                      </td>
                      <td style={styles.td}>{log.page || "-"}</td>
                      <td style={styles.td}>
                        <span style={styles.details}>{log.details || "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminPage>
  )
}

const styles = {
  restrictedCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 40,
    maxWidth: 520,
    margin: "0 auto",
    textAlign: "center",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  restrictedTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  },
  restrictedText: {
    margin: "10px 0 0",
    color: "#64748b",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
  },
  select: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "0 12px",
    background: "#ffffff",
    color: "#0f172a",
  },
  input: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "0 12px",
    background: "#ffffff",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  searchBox: {
    marginTop: 16,
  },
  analysisGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  analysisBlock: {
    borderRadius: 16,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#fbfdff",
    padding: 16,
  },
  analysisTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#475569",
  },
  analysisEmpty: {
    padding: 20,
    borderRadius: 16,
    border: "1px dashed rgba(203, 213, 225, 0.95)",
    color: "#64748b",
    textAlign: "center",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#334155",
  },
  tableShell: {
    minHeight: 220,
  },
  loadingState: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
  },
  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 780,
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    borderBottom: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#f8fafc",
  },
  td: {
    padding: "14px 16px",
    fontSize: 13,
    color: "#0f172a",
    borderBottom: "1px solid rgba(241, 245, 249, 0.95)",
    verticalAlign: "top",
  },
  actionBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
  },
  details: {
    display: "inline-block",
    maxWidth: 340,
    whiteSpace: "normal",
    wordBreak: "break-word",
    color: "#475569",
  },
}
