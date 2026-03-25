import { useEffect, useMemo, useState } from "react"
import { FaArchive, FaCalendarAlt, FaChartLine, FaFlag, FaPlus, FaWeightHanging } from "react-icons/fa"
import { supabase } from "../../supabaseClient"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import { AdminPage, AdminPanel } from "../../components/ui/AdminPage"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import {
  buildQuotaMetrics,
  calculateUsedKgFromAchats,
} from "../../utils/campagnes"

const TABS = {
  active: "active",
  create: "create",
  archives: "archives",
}

const INITIAL_FORM = {
  nom: "",
  type: "PRINCIPALE",
  date_debut: "",
  date_fin: "",
  prix_kg: "",
}

const INITIAL_QUOTA_FORM = {
  centre_id: "",
  quota_tonnes: "",
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`
}

function formatWeight(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} kg`
}

function formatDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toDateOnly(value) {
  if (!value) return ""
  return String(value).slice(0, 10)
}

function isCampaignArchived(campagne) {
  const today = new Date().toISOString().slice(0, 10)
  return campagne?.statut !== "ACTIVE" || toDateOnly(campagne?.date_fin) < today
}

function ProgressBar({ percentage = 0 }) {
  const width = Math.max(0, Math.min(100, Number(percentage) || 0))
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${width}%` }} />
    </div>
  )
}

export default function Campagnes() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS.active)
  const [campaigns, setCampaigns] = useState([])
  const [centres, setCentres] = useState([])
  const [quotas, setQuotas] = useState([])
  const [achats, setAchats] = useState([])
  const [errorMessage, setErrorMessage] = useState("")
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [savingQuota, setSavingQuota] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [archiveDetails, setArchiveDetails] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [quotaForm, setQuotaForm] = useState(INITIAL_QUOTA_FORM)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setErrorMessage("")

      const [campaignsRes, centresRes, quotasRes, achatsRes] = await Promise.all([
        supabase.from("campagnes").select("*").order("date_debut", { ascending: false }),
        supabase.from("centres").select("id, nom, code").order("nom"),
        supabase.from("campagne_centres").select("*").order("created_at", { ascending: false }),
        supabase.from("achats").select("id, centre_id, poids, date_pesee, created_at"),
      ])

      if (campaignsRes.error) throw campaignsRes.error
      if (centresRes.error) throw centresRes.error
      if (quotasRes.error) throw quotasRes.error
      if (achatsRes.error) throw achatsRes.error

      setCampaigns(campaignsRes.data || [])
      setCentres(centresRes.data || [])
      setQuotas(quotasRes.data || [])
      setAchats(achatsRes.data || [])
    } catch (error) {
      console.error("[Campagnes] Error fetching data:", error)
      setErrorMessage(error?.message || "Erreur lors du chargement des campagnes")
      showToast("Erreur lors du chargement des campagnes", "error")
    } finally {
      setLoading(false)
    }
  }

  const activeCampaign = useMemo(() => {
    const explicitActive = campaigns.find((entry) => entry.statut === "ACTIVE")
    return explicitActive || null
  }, [campaigns])

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((centre) => [String(centre.id), centre])),
    [centres]
  )

  const activeCampaignRows = useMemo(() => {
    if (!activeCampaign) {
      return centres.map((centre) => ({
        centre,
        metrics: buildQuotaMetrics(null, null, 0),
        quota: null,
      }))
    }

    return centres.map((centre) => {
      const quota = quotas.find(
        (entry) =>
          String(entry.campagne_id) === String(activeCampaign.id) && String(entry.centre_id) === String(centre.id)
      )
      const usedKg = calculateUsedKgFromAchats(achats, centre.id, activeCampaign)
      return {
        centre,
        quota,
        metrics: buildQuotaMetrics(activeCampaign, quota, usedKg),
      }
    })
  }, [activeCampaign, achats, centres, quotas])

  const activeStats = useMemo(() => {
    if (!activeCampaign) {
      return [
        { label: "Campagne active", value: "0", helper: "Aucune", icon: <FaFlag />, accent: "#7a1f1f" },
        { label: "Prix / kg", value: formatCurrency(0), helper: "Automatique", icon: <FaChartLine />, accent: "#2563eb" },
        { label: "Centres attribués", value: "0", helper: "Quotas", icon: <FaWeightHanging />, accent: "#16a34a" },
        { label: "Volume utilisé", value: formatWeight(0), helper: "Campagne", icon: <FaArchive />, accent: "#f59e0b" },
      ]
    }

    const centresAssigned = activeCampaignRows.filter((row) => row.quota).length
    const totalUsed = activeCampaignRows.reduce((sum, row) => sum + (Number(row.metrics.usedKg) || 0), 0)

    return [
      {
        label: "Campagne active",
        value: activeCampaign.nom || "-",
        helper: activeCampaign.type || "CAMPAGNE",
        icon: <FaFlag />,
        accent: "#7a1f1f",
      },
      {
        label: "Prix / kg",
        value: formatCurrency(activeCampaign.prix_kg),
        helper: `${formatDate(activeCampaign.date_debut)} - ${formatDate(activeCampaign.date_fin)}`,
        icon: <FaChartLine />,
        accent: "#2563eb",
      },
      {
        label: "Centres attribués",
        value: String(centresAssigned),
        helper: `${centres.length} centres suivis`,
        icon: <FaWeightHanging />,
        accent: "#16a34a",
      },
      {
        label: "Volume utilisé",
        value: formatWeight(totalUsed),
        helper: "Poids cumulé campagne",
        icon: <FaArchive />,
        accent: "#f59e0b",
      },
    ]
  }, [activeCampaign, activeCampaignRows, centres.length])

  const archives = useMemo(
    () => campaigns.filter((campagne) => isCampaignArchived(campagne)),
    [campaigns]
  )

  const archiveRows = useMemo(
    () =>
      archives.map((campagne) => {
        const totalVolume = achats.reduce((sum, achat) => {
          const entryDate = toDateOnly(achat?.date_pesee || achat?.created_at)
          if (!entryDate) return sum
          if (entryDate < toDateOnly(campagne.date_debut) || entryDate > toDateOnly(campagne.date_fin)) {
            return sum
          }
          return sum + (Number(achat?.poids) || 0)
        }, 0)

        return {
          ...campagne,
          totalVolume,
        }
      }),
    [achats, archives]
  )

  const archiveDetailRows = useMemo(() => {
    if (!archiveDetails) return []

    return centres.map((centre) => {
      const quota = quotas.find(
        (entry) =>
          String(entry.campagne_id) === String(archiveDetails.id) && String(entry.centre_id) === String(centre.id)
      )
      const usedKg = calculateUsedKgFromAchats(achats, centre.id, archiveDetails)
      return {
        centre,
        quota,
        metrics: buildQuotaMetrics(archiveDetails, quota, usedKg),
      }
    })
  }, [achats, archiveDetails, centres, quotas])

  async function handleCreateCampaign(event) {
    event?.preventDefault?.()

    if (!formData.nom.trim() || !formData.date_debut || !formData.date_fin || !formData.prix_kg) {
      showToast("Veuillez remplir tous les champs de la campagne", "error")
      return
    }

    if (toDateOnly(formData.date_fin) < toDateOnly(formData.date_debut)) {
      showToast("La date de fin doit être postérieure à la date de début", "error")
      return
    }

    try {
      setSavingCampaign(true)

      const payload = {
        nom: formData.nom.trim(),
        type: formData.type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        prix_kg: Number(formData.prix_kg),
        statut: "ACTIVE",
      }

      const { data: insertedCampaign, error: insertError } = await supabase
        .from("campagnes")
        .insert([payload])
        .select()
        .single()

      if (insertError) throw insertError

      const { error: archiveError } = await supabase
        .from("campagnes")
        .update({ statut: "ARCHIVEE" })
        .eq("statut", "ACTIVE")
        .neq("id", insertedCampaign.id)

      if (archiveError) {
        console.error("[Campagnes] Error archiving previous active campaigns:", archiveError)
      }

      setFormData(INITIAL_FORM)
      setActiveTab(TABS.active)
      showToast("Campagne créée avec succès", "success")
      await fetchData()
    } catch (error) {
      console.error("[Campagnes] Error creating campaign:", error)
      showToast(error?.message || "Erreur lors de la création de la campagne", "error")
    } finally {
      setSavingCampaign(false)
    }
  }

  function openQuotaModal(centreId = "", quotaTonnes = "") {
    setQuotaForm({
      centre_id: centreId,
      quota_tonnes: quotaTonnes ? String(quotaTonnes) : "",
    })
    setShowQuotaModal(true)
  }

  async function handleSaveQuota(event) {
    event?.preventDefault?.()

    if (!activeCampaign?.id) {
      showToast("Aucune campagne active disponible", "error")
      return
    }

    if (!quotaForm.centre_id || !quotaForm.quota_tonnes) {
      showToast("Sélectionnez un centre et renseignez un quota", "error")
      return
    }

    try {
      setSavingQuota(true)

      const existingQuota = quotas.find(
        (entry) =>
          String(entry.campagne_id) === String(activeCampaign.id) &&
          String(entry.centre_id) === String(quotaForm.centre_id)
      )

      if (existingQuota) {
        const { error } = await supabase
          .from("campagne_centres")
          .update({ quota_tonnes: Number(quotaForm.quota_tonnes) })
          .eq("id", existingQuota.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("campagne_centres").insert([
          {
            campagne_id: activeCampaign.id,
            centre_id: quotaForm.centre_id,
            quota_tonnes: Number(quotaForm.quota_tonnes),
          },
        ])

        if (error) throw error
      }

      setShowQuotaModal(false)
      setQuotaForm(INITIAL_QUOTA_FORM)
      showToast("Quota enregistré avec succès", "success")
      await fetchData()
    } catch (error) {
      console.error("[Campagnes] Error saving quota:", error)
      showToast(error?.message || "Erreur lors de l'enregistrement du quota", "error")
    } finally {
      setSavingQuota(false)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPage
        title="Campagnes"
        subtitle="Accès réservé aux administrateurs."
      >
        <AdminPanel title="Accès restreint">
          <p style={styles.emptyText}>Cette page n'est accessible qu'aux administrateurs.</p>
        </AdminPanel>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      title="Campagnes"
      subtitle="Pilotez la campagne active, attribuez les quotas par centre et suivez les performances globales."
      actions={
        <>
          <Button variant="secondary" icon={<FaArchive />} onClick={() => setActiveTab(TABS.archives)}>
            Archives
          </Button>
          <Button icon={<FaPlus />} onClick={() => setActiveTab(TABS.create)}>
            Nouvelle campagne
          </Button>
        </>
      }
      stats={activeStats}
    >
      <div style={styles.pageStack}>
        <div style={styles.tabs}>
          {[
            { id: TABS.active, label: "Campagne active" },
            { id: TABS.create, label: "Créer campagne" },
            { id: TABS.archives, label: "Archives" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : null),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <AdminPanel title="Erreur">
            <div style={styles.errorBanner}>{errorMessage}</div>
          </AdminPanel>
        ) : null}

        {loading ? (
          <AdminPanel title="Chargement">
            <div style={styles.emptyState}>Chargement des campagnes...</div>
          </AdminPanel>
        ) : null}

        {!loading && activeTab === TABS.active ? (
          <div style={styles.contentStack}>
            <AdminPanel
              title={activeCampaign ? activeCampaign.nom : "Aucune campagne active"}
              subtitle={
                activeCampaign
                  ? `${activeCampaign.type || "CAMPAGNE"} · ${formatDate(activeCampaign.date_debut)} au ${formatDate(activeCampaign.date_fin)}`
                  : "Créez une campagne pour activer le système de quotas et de budget automatique."
              }
              actions={
                activeCampaign ? (
                  <Button variant="secondary" icon={<FaPlus />} onClick={() => openQuotaModal()}>
                    Attribuer quota
                  </Button>
                ) : null
              }
            >
              <div style={styles.heroGrid}>
                <div style={styles.heroCard}>
                  <span style={styles.heroLabel}>Prix campagne</span>
                  <strong style={styles.heroValue}>
                    {activeCampaign ? formatCurrency(activeCampaign.prix_kg) : formatCurrency(0)}
                  </strong>
                </div>
                <div style={styles.heroCard}>
                  <span style={styles.heroLabel}>Période</span>
                  <strong style={styles.heroValueSmall}>
                    {activeCampaign
                      ? `${formatDate(activeCampaign.date_debut)} - ${formatDate(activeCampaign.date_fin)}`
                      : "-"}
                  </strong>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel
              title="Suivi des quotas par centre"
              subtitle="Le budget centre est calculé automatiquement à partir du quota attribué et du prix campagne."
            >
              {centres.length === 0 ? (
                <div style={styles.emptyState}>Aucun centre disponible.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Centre</th>
                        <th style={styles.th}>Quota tonnes</th>
                        <th style={styles.th}>Quota kg</th>
                        <th style={styles.th}>Utilisé</th>
                        <th style={styles.th}>Restant</th>
                        <th style={styles.th}>Progression</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCampaignRows.map((row) => (
                        <tr key={row.centre.id} style={styles.row}>
                          <td style={styles.td}>
                            <div style={styles.primaryText}>{row.centre.nom}</div>
                            <div style={styles.secondaryText}>{row.centre.code || "-"}</div>
                          </td>
                          <td style={styles.td}>{Number(row.quota?.quota_tonnes || 0).toLocaleString("fr-FR")}</td>
                          <td style={styles.td}>{formatWeight(row.metrics.quotaKg)}</td>
                          <td style={styles.td}>{formatWeight(row.metrics.usedKg)}</td>
                          <td style={styles.td}>{formatWeight(row.metrics.remainingKg)}</td>
                          <td style={styles.td}>
                            <div style={styles.progressCell}>
                              <ProgressBar percentage={row.metrics.usagePercentage} />
                              <span style={styles.progressLabel}>{row.metrics.usagePercentage.toFixed(1)} %</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<FaPlus />}
                              onClick={() => openQuotaModal(row.centre.id, row.quota?.quota_tonnes)}
                              disabled={!activeCampaign}
                            >
                              Attribuer quota
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminPanel>
          </div>
        ) : null}

        {!loading && activeTab === TABS.create ? (
          <AdminPanel
            title="Créer une campagne"
            subtitle="Une nouvelle campagne active devient la référence de prix par kg pour toutes les pesées."
          >
            <form onSubmit={handleCreateCampaign} style={styles.form}>
              <div style={styles.formGrid}>
                <Input
                  label="Nom"
                  value={formData.nom}
                  onChange={(value) => setFormData((current) => ({ ...current, nom: value }))}
                  placeholder="Ex: Campagne principale 2026"
                  required
                />
                <div style={styles.selectField}>
                  <label style={styles.label}>Type</label>
                  <select
                    value={formData.type}
                    onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}
                    style={styles.select}
                  >
                    <option value="PRINCIPALE">PRINCIPALE</option>
                    <option value="INTERMEDIAIRE">INTERMEDIAIRE</option>
                  </select>
                </div>
                <Input
                  label="Date début"
                  type="date"
                  value={formData.date_debut}
                  onChange={(value) => setFormData((current) => ({ ...current, date_debut: value }))}
                  required
                />
                <Input
                  label="Date fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(value) => setFormData((current) => ({ ...current, date_fin: value }))}
                  required
                />
                <Input
                  label="Prix / kg"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.prix_kg}
                  onChange={(value) => setFormData((current) => ({ ...current, prix_kg: value }))}
                  placeholder="Ex: 1500"
                  required
                />
              </div>
              <div style={styles.formActions}>
                <Button type="submit" icon={<FaPlus />} disabled={savingCampaign}>
                  {savingCampaign ? "Création..." : "Créer campagne"}
                </Button>
              </div>
            </form>
          </AdminPanel>
        ) : null}

        {!loading && activeTab === TABS.archives ? (
          <AdminPanel
            title="Archives des campagnes"
            subtitle="Consultez les campagnes terminées ou archivées et leur volume total traité."
          >
            {archiveRows.length === 0 ? (
              <div style={styles.emptyState}>Aucune campagne archivée pour le moment.</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nom</th>
                      <th style={styles.th}>Période</th>
                      <th style={styles.th}>Prix</th>
                      <th style={styles.th}>Volume total</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveRows.map((campagne) => (
                      <tr key={campagne.id} style={styles.row}>
                        <td style={styles.td}>
                          <div style={styles.primaryText}>{campagne.nom}</div>
                          <div style={styles.secondaryText}>{campagne.type || "-"}</div>
                        </td>
                        <td style={styles.td}>
                          {formatDate(campagne.date_debut)} - {formatDate(campagne.date_fin)}
                        </td>
                        <td style={styles.td}>{formatCurrency(campagne.prix_kg)}</td>
                        <td style={styles.td}>{formatWeight(campagne.totalVolume)}</td>
                        <td style={styles.td}>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<FaCalendarAlt />}
                            onClick={() => setArchiveDetails(campagne)}
                          >
                            Voir détails
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
        ) : null}
      </div>

      <Modal
        isOpen={showQuotaModal}
        onClose={() => {
          setShowQuotaModal(false)
          setQuotaForm(INITIAL_QUOTA_FORM)
        }}
        title="Attribuer quota"
        size="md"
      >
        <form onSubmit={handleSaveQuota} style={styles.form}>
          <div style={styles.formGridSingle}>
            <div style={styles.selectField}>
              <label style={styles.label}>Centre</label>
              <select
                value={quotaForm.centre_id}
                onChange={(event) => setQuotaForm((current) => ({ ...current, centre_id: event.target.value }))}
                style={styles.select}
                required
              >
                <option value="">Sélectionner un centre</option>
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.nom} {centre.code ? `(${centre.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Quota (tonnes)"
              type="number"
              min="0"
              step="0.01"
              value={quotaForm.quota_tonnes}
              onChange={(value) => setQuotaForm((current) => ({ ...current, quota_tonnes: value }))}
              placeholder="Ex: 120"
              required
            />
          </div>
          <div style={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowQuotaModal(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={savingQuota}>
              {savingQuota ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!archiveDetails}
        onClose={() => setArchiveDetails(null)}
        title={archiveDetails ? archiveDetails.nom : "Détails campagne"}
        size="lg"
      >
        {archiveDetails ? (
          <div style={styles.contentStack}>
            <div style={styles.detailTop}>
              <div style={styles.detailMetric}>
                <span style={styles.heroLabel}>Période</span>
                <strong style={styles.heroValueSmall}>
                  {formatDate(archiveDetails.date_debut)} - {formatDate(archiveDetails.date_fin)}
                </strong>
              </div>
              <div style={styles.detailMetric}>
                <span style={styles.heroLabel}>Prix</span>
                <strong style={styles.heroValue}>{formatCurrency(archiveDetails.prix_kg)}</strong>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Centre</th>
                    <th style={styles.th}>Quota kg</th>
                    <th style={styles.th}>Utilisé</th>
                    <th style={styles.th}>Restant</th>
                    <th style={styles.th}>Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {archiveDetailRows
                    .filter((row) => row.quota)
                    .map((row) => (
                      <tr key={`${archiveDetails.id}-${row.centre.id}`} style={styles.row}>
                        <td style={styles.td}>{centresMap[String(row.centre.id)]?.nom || row.centre.nom}</td>
                        <td style={styles.td}>{formatWeight(row.metrics.quotaKg)}</td>
                        <td style={styles.td}>{formatWeight(row.metrics.usedKg)}</td>
                        <td style={styles.td}>{formatWeight(row.metrics.remainingKg)}</td>
                        <td style={styles.td}>
                          <div style={styles.progressCell}>
                            <ProgressBar percentage={row.metrics.usagePercentage} />
                            <span style={styles.progressLabel}>{row.metrics.usagePercentage.toFixed(1)} %</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  )
}

const styles = {
  pageStack: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
  },
  contentStack: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
  },
  tabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-surface)",
    color: "var(--admin-text-soft)",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
  tabButtonActive: {
    background: "var(--admin-sidebar-active-bg)",
    color: "var(--admin-sidebar-active-text)",
    borderColor: "var(--admin-border)",
  },
  errorBanner: {
    padding: "14px 16px",
    borderRadius: 14,
    background: "#fff7ed",
    border: "1px solid #fdba74",
    color: "#9a3412",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  heroCard: {
    padding: "18px 20px",
    borderRadius: 18,
    background: "var(--admin-card-muted-bg)",
    border: "1px solid var(--admin-border)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  heroLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
    color: "var(--admin-text-muted)",
  },
  heroValue: {
    fontSize: 28,
    color: "var(--admin-text)",
  },
  heroValueSmall: {
    fontSize: 18,
    color: "var(--admin-text)",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid var(--admin-border)",
    borderRadius: 18,
  },
  table: {
    width: "100%",
    minWidth: 880,
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 16px",
    textAlign: "left",
    background: "var(--admin-card-muted-bg)",
    color: "var(--admin-text-muted)",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid var(--admin-border)",
  },
  td: {
    padding: "16px",
    borderBottom: "1px solid var(--admin-border-soft)",
    color: "var(--admin-text)",
    fontSize: 14,
    verticalAlign: "middle",
  },
  row: {
    background: "transparent",
  },
  primaryText: {
    fontWeight: 700,
    color: "var(--admin-text)",
  },
  secondaryText: {
    fontSize: 12,
    color: "var(--admin-text-muted)",
    marginTop: 4,
  },
  progressCell: {
    minWidth: 180,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb 0%, #16a34a 100%)",
  },
  progressLabel: {
    minWidth: 54,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--admin-text-soft)",
  },
  emptyState: {
    padding: "32px 12px",
    textAlign: "center",
    color: "var(--admin-text-soft)",
  },
  emptyText: {
    margin: 0,
    color: "var(--admin-text-soft)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  formGridSingle: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  selectField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  select: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 16,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    fontSize: 14,
    minHeight: 48,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  detailTop: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  detailMetric: {
    padding: "16px 18px",
    borderRadius: 16,
    border: "1px solid var(--admin-border)",
    background: "var(--admin-card-muted-bg)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
}
