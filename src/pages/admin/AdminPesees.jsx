import { useEffect, useState, useMemo } from "react"
import { supabase } from "../../supabaseClient"
import { FaPlus, FaReceipt, FaSearch, FaWeightHanging, FaBuilding } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import CocoaReceipt from "../../components/CocoaReceipt"
import {
  assertQuotaAvailable,
  buildQuotaMetrics,
  calculateUsedKgFromAchats,
  getActiveCampagne,
  getCentreQuota,
  isDateWithinCampagne,
} from "../../utils/campagnes"

export default function AdminPesees() {
  const { isAdmin, user } = useAuth()
  const { showToast } = useToast()
  
  const [pesees, setPesees] = useState([])
  const [centres, setCentres] = useState([])
  const [producteurs, setProducteurs] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCentre, setFilterCentre] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showReceiptsModal, setShowReceiptsModal] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeCampagne, setActiveCampagne] = useState(null)
  const [selectedCentreQuota, setSelectedCentreQuota] = useState(null)
  const [campagneError, setCampagneError] = useState("")
  
  const [formData, setFormData] = useState({
    centre_id: "",
    producteur_id: "",
    poids: "",
    sacs: "",
    date: new Date().toISOString().split("T")[0],
    agent_id: "",
  })

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    console.log("[AdminPesees] Initializing page")
    fetchData()
  }, [isAdmin])

  useEffect(() => {
    async function fetchSelectedCentreQuota() {
      if (!formData.centre_id || !activeCampagne?.id) {
        setSelectedCentreQuota(null)
        return
      }

      try {
        const quota = await getCentreQuota(formData.centre_id, activeCampagne.id)
        setSelectedCentreQuota(quota)
      } catch (error) {
        console.error("[AdminPesees] Error loading selected centre quota:", error)
        setSelectedCentreQuota(null)
      }
    }

    fetchSelectedCentreQuota()
  }, [formData.centre_id, activeCampagne?.id])

  async function fetchData() {
    try {
      setLoading(true)
      setErrorMessage("")
      console.log("[AdminPesees] Fetching pesees data")

      const [
        { data: peseesData, error: peseesError },
        { data: centresData, error: centresError },
        { data: producteursData, error: producteursError },
        { data: agentsData, error: agentsError },
      ] = await Promise.all([
        supabase
          .from("achats")
          .select("*")
          .order("date_pesee", { ascending: false }),
        supabase.from("centres").select("id, nom").order("nom"),
        supabase.from("producteurs").select("id, nom, code, centre_id").order("nom"),
        supabase.from("utilisateurs").select("id, nom, email, centre_id").eq("role", "AGENT").order("nom"),
      ])

      console.log("[AdminPesees] Data:", {
        pesees: peseesData,
        centres: centresData,
        producteurs: producteursData,
        agents: agentsData,
      })
      console.log("[AdminPesees] Error:", {
        peseesError,
        centresError,
        producteursError,
        agentsError,
      })

      if (peseesError) throw peseesError
      if (centresError) throw centresError
      if (producteursError) throw producteursError
      if (agentsError) throw agentsError

      const centresMap = Object.fromEntries((centresData || []).map((entry) => [String(entry.id), entry]))
      const producteursMap = Object.fromEntries((producteursData || []).map((entry) => [String(entry.id), entry]))
      const agentsMap = Object.fromEntries((agentsData || []).map((entry) => [String(entry.id), entry]))

      const enrichedPesees = (peseesData || []).map((entry) => ({
        ...entry,
        centres: centresMap[String(entry.centre_id)] || null,
        producteurs: producteursMap[String(entry.producteur_id)] || null,
        agents: agentsMap[String(entry.utilisateur_id)] || null,
      }))

      setPesees(enrichedPesees)
      setCentres(centresData || [])
      setProducteurs(producteursData || [])
      setAgents(agentsData || [])
      await loadCampagneContext()
    } catch (error) {
      console.error("[AdminPesees] Error fetching data:", error)
      setErrorMessage(error?.message || "Erreur lors du chargement des données")
      showToast("Erreur lors du chargement des données", "error")
    } finally {
      setLoading(false)
    }
  }

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((c) => [String(c.id), c.nom])),
    [centres]
  )

  const producteursMap = useMemo(
    () => Object.fromEntries(producteurs.map((p) => [String(p.id), p])),
    [producteurs]
  )

  const agentsMap = useMemo(
    () => Object.fromEntries(agents.map((a) => [String(a.id), a])),
    [agents]
  )

  // Filter pesees
  const filteredPesees = useMemo(() => {
    return pesees.filter((pesee) => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (pesee.centres?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pesee.producteurs?.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pesee.producteurs?.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pesee.agents?.nom || pesee.agents?.email || "").toLowerCase().includes(searchTerm.toLowerCase())

      // Centre filter
      const matchesCentre = !filterCentre || String(pesee.centre_id) === String(filterCentre)

      // Date filter
      const matchesDate = !filterDate || 
        (pesee.date_pesee && pesee.date_pesee.startsWith(filterDate)) ||
        (pesee.created_at && pesee.created_at.startsWith(filterDate))

      return matchesSearch && matchesCentre && matchesDate
    })
  }, [pesees, searchTerm, filterCentre, filterDate])

  // Group by centre
  const groupedPesees = useMemo(() => {
    const grouped = {}
    filteredPesees.forEach((pesee) => {
      const centreId = pesee.centre_id || "unknown"
      const centreNom = pesee.centres?.nom || "Non assigné"
      if (!grouped[centreId]) {
        grouped[centreId] = {
          centreId,
          centreNom,
          pesees: [],
          totalPoids: 0,
        }
      }
      grouped[centreId].pesees.push(pesee)
      grouped[centreId].totalPoids += Number(pesee.poids) || 0
    })
    return Object.values(grouped)
  }, [filteredPesees])

  const totalMontant = useMemo(
    () => filteredPesees.reduce((sum, entry) => sum + (Number(entry.montant) || 0), 0),
    [filteredPesees]
  )

  const selectedProducteur = useMemo(
    () => producteursMap[String(formData.producteur_id)] || null,
    [formData.producteur_id, producteursMap]
  )

  const selectedAgent = useMemo(
    () => agentsMap[String(formData.agent_id)] || null,
    [agentsMap, formData.agent_id]
  )

  const formMontant = useMemo(() => {
    const poids = Number(formData.poids || 0)
    const prixUnitaire = Number(activeCampagne?.prix_kg || 0)
    return poids > 0 && prixUnitaire > 0 ? poids * prixUnitaire : 0
  }, [activeCampagne?.prix_kg, formData.poids])

  const selectedCentreQuotaMetrics = useMemo(() => {
    const usedKg = calculateUsedKgFromAchats(pesees, formData.centre_id, activeCampagne)
    return buildQuotaMetrics(activeCampagne, selectedCentreQuota, usedKg)
  }, [activeCampagne, formData.centre_id, pesees, selectedCentreQuota])

  async function loadCampagneContext() {
    try {
      setCampagneError("")
      const campagne = await getActiveCampagne()
      setActiveCampagne(campagne)

      if (!campagne) {
        setCampagneError("Aucune campagne active n'est disponible pour les pesées.")
      }
    } catch (error) {
      console.error("[AdminPesees] Error loading campagne context:", error)
      setActiveCampagne(null)
      setCampagneError(error?.message || "Erreur lors du chargement de la campagne active.")
    }
  }

  async function handleSave(event) {
    event?.preventDefault?.()

    if (!formData.centre_id || !formData.producteur_id || !formData.poids || !formData.date) {
      showToast("Veuillez remplir tous les champs obligatoires de la pesée", "error")
      return
    }

    if (!selectedProducteur) {
      showToast("Le producteur sélectionné est introuvable.", "error")
      return
    }

    if (Number(formData.poids) <= 0) {
      showToast("Le poids doit être supérieur à 0.", "error")
      return
    }

    if (!activeCampagne?.id) {
      showToast("Aucune campagne active n'est disponible.", "error")
      return
    }

    if (!isDateWithinCampagne(formData.date, activeCampagne)) {
      showToast("La date choisie est hors de la campagne active.", "error")
      return
    }

    if (!user?.id && !formData.agent_id) {
      showToast("Aucun agent ou utilisateur valide n'est associé à la pesée.", "error")
      return
    }

    try {
      setSaving(true)
      setErrorMessage("")
      console.log("[AdminPesees] Submitting form", formData)

      assertQuotaAvailable(selectedCentreQuotaMetrics, Number(formData.poids))

      const payload = {
        centre_id: formData.centre_id,
        producteur_id: formData.producteur_id,
        poids: Number(formData.poids),
        sacs: Number(formData.sacs) || 0,
        prix_unitaire: Number(activeCampagne?.prix_kg || 0),
        montant: formMontant,
        date_pesee: new Date(formData.date).toISOString(),
        utilisateur_id: formData.agent_id || user?.id,
        nom_producteur: selectedProducteur?.nom || "",
        code_producteur: selectedProducteur?.code || "",
        nom_agent: selectedAgent?.nom || selectedAgent?.email || user?.nom || user?.email || "",
      }

      console.log("[AdminPesees] Insert payload:", payload)

      const { data: insertedData, error } = await supabase.from("achats").insert([payload]).select().single()
      console.log("[AdminPesees] Insert result:", insertedData)
      console.log("[AdminPesees] Insert error:", error)

      if (error) throw error

      showToast("Pesée enregistrée avec succès", "success")
      setShowModal(false)
      resetForm()

      const enrichedInserted = insertedData
        ? {
            ...insertedData,
            centres: centresMap[String(insertedData.centre_id)] || null,
            producteurs: producteursMap[String(insertedData.producteur_id)] || null,
            agents: agentsMap[String(insertedData.utilisateur_id)] || null,
          }
        : null

      if (enrichedInserted) {
        setPesees((current) => [enrichedInserted, ...current])
      }

      await fetchData()
    } catch (error) {
      console.error("[AdminPesees] Error saving pesee:", error)
      setErrorMessage(error?.message || "Erreur lors de l'enregistrement")
      showToast(error?.message || "Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFormData({
      centre_id: "",
      producteur_id: "",
      poids: "",
      sacs: "",
      date: new Date().toISOString().split("T")[0],
      agent_id: "",
    })
  }

  // Get producteurs filtered by selected centre
  const filteredProducteurs = useMemo(() => {
    if (!formData.centre_id) return producteurs
    return producteurs.filter((p) => String(p.centre_id) === String(formData.centre_id))
  }, [producteurs, formData.centre_id])

  // Get agents filtered by selected centre
  const filteredAgents = useMemo(() => {
    if (!formData.centre_id) return agents
    return agents.filter((a) => String(a.centre_id) === String(formData.centre_id))
  }, [agents, formData.centre_id])

  if (!isAdmin) {
    return (
      <Card>
        <div style={emptyState}>
          <FaWeightHanging size={40} style={{ color: "#cbd5e1", marginBottom: 16 }} />
          <p style={emptyText}>Cette section est réservée aux administrateurs.</p>
        </div>
      </Card>
    )
  }

  if (!Array.isArray(pesees) || !Array.isArray(centres) || !Array.isArray(producteurs) || !Array.isArray(agents)) {
    return (
      <Card>
        <div style={emptyState}>
          <FaWeightHanging size={40} style={{ color: "#cbd5e1", marginBottom: 16 }} />
          <p style={emptyText}>Les données de pesée sont indisponibles pour le moment.</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h2 style={title}>Gestion des Pesées</h2>
          <p style={subtitle}>Suivi des pesées de cacao par centre</p>
        </div>
        <div style={headerActions}>
          <Button
            variant="secondary"
            icon={<FaReceipt />}
            onClick={() => setShowReceiptsModal(true)}
            disabled={filteredPesees.length === 0}
          >
            Voir les reçus
          </Button>
          <Button variant="primary" icon={<FaPlus />} onClick={() => setShowModal(true)}>
            Nouvelle pesée
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div style={filtersContainer}>
          <div style={filterGroup}>
            <Input
              icon={<FaSearch />}
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={setSearchTerm}
              style={{ flex: 1, maxWidth: "300px" }}
            />
          </div>
          <div style={filterGroup}>
            <label style={filterLabel}>Centre</label>
            <select
              value={filterCentre}
              onChange={(e) => setFilterCentre(e.target.value)}
              style={selectInput}
            >
              <option value="">Tous les centres</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div style={filterGroup}>
            <label style={filterLabel}>Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={selectInput}
            />
          </div>
          {(filterCentre || filterDate || searchTerm) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFilterCentre("")
                setFilterDate("")
                setSearchTerm("")
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </Card>

      {errorMessage ? (
        <Card>
          <div style={errorState}>
            <strong>Erreur</strong>
            <span>{errorMessage}</span>
          </div>
        </Card>
      ) : null}

      {/* Statistics */}
      <div style={statsGrid}>
        <Card style={statCard}>
          <div style={statContent}>
            <FaWeightHanging size={24} style={{ color: "#7a1f1f" }} />
            <div>
              <p style={statValue}>{filteredPesees.length}</p>
              <p style={statLabel}>Total Pesées</p>
            </div>
          </div>
        </Card>
        <Card style={statCard}>
          <div style={statContent}>
            <FaWeightHanging size={24} style={{ color: "#10b981" }} />
            <div>
              <p style={statValue}>
                {filteredPesees.reduce((sum, p) => sum + (Number(p.poids) || 0), 0).toLocaleString("fr-FR")} kg
              </p>
              <p style={statLabel}>Poids Total</p>
            </div>
          </div>
        </Card>
        <Card style={statCard}>
          <div style={statContent}>
            <FaBuilding size={24} style={{ color: "#3b82f6" }} />
            <div>
              <p style={statValue}>{groupedPesees.length}</p>
              <p style={statLabel}>Centres</p>
            </div>
          </div>
        </Card>
        <Card style={statCard}>
          <div style={statContent}>
            <FaReceipt size={24} style={{ color: "#7c3aed" }} />
            <div>
              <p style={statValue}>{totalMontant.toLocaleString("fr-FR")} FCFA</p>
              <p style={statLabel}>Montant total pesées</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Grouped List */}
      {loading ? (
        <Card>
          <div style={loadingContainer}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        </Card>
      ) : groupedPesees.length === 0 ? (
        <Card>
          <div style={emptyState}>
            <FaWeightHanging size={48} style={{ color: "#cbd5e1", marginBottom: 16 }} />
            <p style={emptyText}>
              {searchTerm || filterCentre || filterDate
                ? "Aucune pesée trouvée"
                : "Aucune pesée enregistrée"}
            </p>
          </div>
        </Card>
      ) : (
        groupedPesees.map((group) => (
          <Card key={group.centreId} style={{ marginBottom: 24 }}>
            <div style={groupHeader}>
              <div>
                <h3 style={groupTitle}>{group.centreNom}</h3>
                <p style={groupSubtitle}>
                  {group.pesees.length} pesée{group.pesees.length > 1 ? "s" : ""} •{" "}
                  {group.totalPoids.toLocaleString("fr-FR")} kg
                </p>
              </div>
            </div>
            <div style={tableContainer}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Date</th>
                    <th style={th}>Producteur</th>
                    <th style={th}>Poids (kg)</th>
                    <th style={th}>Prix unitaire</th>
                    <th style={th}>Montant</th>
                    <th style={th}>Agent</th>
                    <th style={th}>Reçu</th>
                  </tr>
                </thead>
                <tbody>
                  {group.pesees.map((pesee) => (
                    <tr key={pesee.id} style={tableRow}>
                      <td style={td}>
                        {pesee.date_pesee
                          ? new Date(pesee.date_pesee).toLocaleDateString("fr-FR")
                          : pesee.created_at
                          ? new Date(pesee.created_at).toLocaleDateString("fr-FR")
                          : "-"}
                      </td>
                      <td style={td}>
                        <div>
                          <strong>{pesee.producteurs?.nom || pesee.nom_producteur || "-"}</strong>
                          {pesee.producteurs?.code && (
                            <span style={codeBadge}>{pesee.producteurs.code}</span>
                          )}
                        </div>
                      </td>
                      <td style={td}>
                        <strong style={{ color: "#10b981" }}>
                          {Number(pesee.poids || 0).toLocaleString("fr-FR")} kg
                        </strong>
                      </td>
                      <td style={td}>
                        {Number(pesee.prix_unitaire || 0).toLocaleString("fr-FR")} FCFA
                      </td>
                      <td style={td}>
                        <strong style={{ color: "#7c3aed" }}>
                          {Number(pesee.montant || 0).toLocaleString("fr-FR")} FCFA
                        </strong>
                      </td>
                      <td style={td}>
                        {pesee.agents?.nom || pesee.nom_agent || pesee.agents?.email || "-"}
                      </td>
                      <td style={td}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FaReceipt />}
                          onClick={() => {
                            setSelectedReceipt(pesee)
                            setShowReceiptPreview(true)
                          }}
                        >
                          Reçu
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title="Nouvelle pesée"
        size="md"
      >
        <form onSubmit={handleSave} style={form}>
          <div style={formGrid}>
            <Input
              label="Campagne active"
              value={
                activeCampagne
                  ? `${activeCampagne.nom} (${activeCampagne.type || "CAMPAGNE"})`
                  : "Aucune campagne active"
              }
              readOnly
              disabled
              inputStyle={readOnlyInput}
            />

            <div>
              <label style={label}>Centre *</label>
              <select
                value={formData.centre_id}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    centre_id: e.target.value,
                    producteur_id: "",
                    agent_id: "",
                  })
                }}
                style={selectInput}
                required
              >
                <option value="">Sélectionner un centre</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Producteur *</label>
              <select
                value={formData.producteur_id}
                onChange={(e) => setFormData({ ...formData, producteur_id: e.target.value })}
                style={selectInput}
                required
                disabled={!formData.centre_id}
              >
                <option value="">Sélectionner un producteur</option>
                {filteredProducteurs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Code producteur"
              value={selectedProducteur?.code || ""}
              readOnly
              disabled
              inputStyle={readOnlyInput}
            />

            <Input
              label="Nom du centre"
              value={centresMap[String(formData.centre_id)] || ""}
              readOnly
              disabled
              inputStyle={readOnlyInput}
            />

            <Input
              label="Nombre de sacs"
              type="number"
              min="0"
              value={formData.sacs}
              onChange={(v) => setFormData({ ...formData, sacs: v })}
              placeholder="Ex: 10"
            />

            <Input
              label="Poids (kg) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.poids}
              onChange={(v) => setFormData({ ...formData, poids: v })}
              placeholder="Ex: 25.5"
              required
            />

            <Input
              label="Prix campagne (FCFA / kg)"
              value={Number(activeCampagne?.prix_kg || 0).toLocaleString("fr-FR")}
              readOnly
              disabled
              inputStyle={readOnlyInput}
            />

            <Input
              label="Date *"
              type="date"
              value={formData.date}
              onChange={(v) => setFormData({ ...formData, date: v })}
              required
            />

            <div>
              <label style={label}>Agent</label>
              <select
                value={formData.agent_id}
                onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                style={selectInput}
                disabled={!formData.centre_id}
              >
                <option value="">Utilisateur actuel ({user?.email || "inconnu"})</option>
                {filteredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom || a.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {campagneError ? <div style={campaignAlert}>{campagneError}</div> : null}

          {!campagneError && activeCampagne && formData.centre_id && !selectedCentreQuota ? (
            <div style={campaignAlert}>
              Aucun quota n'est configuré pour ce centre dans la campagne active.
            </div>
          ) : null}

          {activeCampagne && formData.centre_id ? (
            <div style={quotaSummaryGrid}>
              <div style={quotaSummaryItem}>
                <span style={quotaSummaryLabel}>Quota total</span>
                <strong style={quotaSummaryValue}>
                  {selectedCentreQuotaMetrics.quotaKg.toLocaleString("fr-FR")} kg
                </strong>
              </div>
              <div style={quotaSummaryItem}>
                <span style={quotaSummaryLabel}>Déjà utilisé</span>
                <strong style={quotaSummaryValue}>
                  {selectedCentreQuotaMetrics.usedKg.toLocaleString("fr-FR")} kg
                </strong>
              </div>
              <div style={quotaSummaryItem}>
                <span style={quotaSummaryLabel}>Restant</span>
                <strong style={quotaSummaryValue}>
                  {selectedCentreQuotaMetrics.remainingKg.toLocaleString("fr-FR")} kg
                </strong>
              </div>
              <div style={quotaSummaryItem}>
                <span style={quotaSummaryLabel}>Budget quota</span>
                <strong style={quotaSummaryValue}>
                  {selectedCentreQuotaMetrics.totalBudget.toLocaleString("fr-FR")} FCFA
                </strong>
              </div>
            </div>
          ) : null}

          <div style={summaryCard}>
            <div style={summaryRow}>
              <span style={summaryLabel}>Montant total</span>
              <strong style={summaryValue}>{formMontant.toLocaleString("fr-FR")} FCFA</strong>
            </div>
            <div style={summarySubtext}>
              Agent utilisé : {selectedAgent?.nom || selectedAgent?.email || user?.nom || user?.email || "-"}
            </div>
          </div>

          <div style={formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !activeCampagne || !selectedCentreQuota}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showReceiptsModal}
        onClose={() => setShowReceiptsModal(false)}
        title="Reçus de pesée"
        size="lg"
      >
        <div style={receiptsModalContent}>
          {filteredPesees.length === 0 ? (
            <div style={emptyState}>
              <FaReceipt size={40} style={{ color: "#cbd5e1", marginBottom: 16 }} />
              <p style={emptyText}>Aucun reçu disponible.</p>
            </div>
          ) : (
            <div style={tableContainer}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Date</th>
                    <th style={th}>Producteur</th>
                    <th style={th}>Poids</th>
                    <th style={th}>Prix unitaire</th>
                    <th style={th}>Montant</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPesees.map((pesee) => (
                    <tr key={`receipt-${pesee.id}`} style={tableRow}>
                      <td style={td}>
                        {pesee.date_pesee
                          ? new Date(pesee.date_pesee).toLocaleDateString("fr-FR")
                          : pesee.created_at
                            ? new Date(pesee.created_at).toLocaleDateString("fr-FR")
                            : "-"}
                      </td>
                      <td style={td}>{pesee.nom_producteur || pesee.producteurs?.nom || "-"}</td>
                      <td style={td}>{Number(pesee.poids || 0).toLocaleString("fr-FR")} kg</td>
                      <td style={td}>{Number(pesee.prix_unitaire || 0).toLocaleString("fr-FR")} FCFA</td>
                      <td style={td}>{Number(pesee.montant || 0).toLocaleString("fr-FR")} FCFA</td>
                      <td style={td}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FaReceipt />}
                          onClick={() => {
                            setSelectedReceipt(pesee)
                            setShowReceiptPreview(true)
                          }}
                        >
                          Ouvrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showReceiptPreview && !!selectedReceipt}
        onClose={() => {
          setShowReceiptPreview(false)
          setSelectedReceipt(null)
        }}
        title="Reçu de pesée"
        size="xl"
      >
        <CocoaReceipt
          achat={selectedReceipt}
          centreNom={selectedReceipt ? centresMap[String(selectedReceipt.centre_id)] : "-"}
          onClose={() => {
            setShowReceiptPreview(false)
            setSelectedReceipt(null)
          }}
        />
      </Modal>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 8,
}

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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
  flexWrap: "wrap",
  gap: 16,
  alignItems: "flex-end",
}

const filterGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: "150px",
}

const filterLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 600,
}

const selectInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  background: "white",
  color: "#111827",
  outline: "none",
  transition: "all 0.2s ease",
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
}

const statCard = {
  padding: "20px",
}

const statContent = {
  display: "flex",
  alignItems: "center",
  gap: 16,
}

const statValue = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#0f172a",
}

const statLabel = {
  margin: "4px 0 0 0",
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 500,
}

const groupHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  paddingBottom: 16,
  borderBottom: "2px solid #e5e7eb",
}

const groupTitle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 700,
  color: "#0f172a",
}

const groupSubtitle = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#64748b",
}

const tableContainer = {
  overflowX: "auto",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const th = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  background: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

const td = {
  padding: "14px 16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#1f2937",
}

const tableRow = {
  transition: "background 0.2s ease",
}

const codeBadge = {
  display: "inline-block",
  marginLeft: 8,
  padding: "2px 8px",
  borderRadius: "4px",
  background: "#f3f4f6",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 500,
}

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
}

const label = {
  display: "block",
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
}

const readOnlyInput = {
  background: "#f8fafc",
}

const campaignAlert = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontSize: "14px",
  lineHeight: 1.6,
}

const quotaSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
}

const quotaSummaryItem = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const quotaSummaryLabel = {
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const quotaSummaryValue = {
  color: "#0f172a",
  fontSize: "18px",
}

const summaryCard = {
  padding: "14px 16px",
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid rgba(226, 232, 240, 0.9)",
}

const summaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
}

const summaryLabel = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
}

const summaryValue = {
  fontSize: 18,
  fontWeight: 800,
  color: "#7a1f1f",
}

const summarySubtext = {
  marginTop: 8,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.5,
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
}

const receiptsModalContent = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  gap: 16,
}

const errorState = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "4px 2px",
  color: "#b91c1c",
  fontSize: 14,
  lineHeight: 1.5,
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
}

const emptyState = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  textAlign: "center",
}

const emptyText = {
  color: "#94a3b8",
  fontSize: "15px",
  fontWeight: 500,
  margin: 0,
}
