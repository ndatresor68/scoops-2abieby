import { useEffect, useState, useMemo } from "react"
import { supabase } from "../../supabaseClient"
import { FaPlus, FaSearch, FaFilter, FaWeightHanging } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { useMediaQuery } from "../../hooks/useMediaQuery"

export default function AdminPesees() {
  const { isAdmin, user } = useAuth()
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  const [pesees, setPesees] = useState([])
  const [centres, setCentres] = useState([])
  const [producteurs, setProducteurs] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCentre, setFilterCentre] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    centre_id: "",
    producteur_id: "",
    poids: "",
    date: new Date().toISOString().split("T")[0],
    agent_id: "",
  })

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchData()
  }, [isAdmin])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Fetch pesees (using achats table as it already has the weight data)
      const { data: peseesData, error: peseesError } = await supabase
        .from("achats")
        .select(`
          *,
          centres:centre_id(nom),
          producteurs:producteur_id(nom, code),
          agents:utilisateur_id(nom, email)
        `)
        .order("date_pesee", { ascending: false })

      if (peseesError) throw peseesError

      // Fetch centres
      const { data: centresData, error: centresError } = await supabase
        .from("centres")
        .select("id, nom")
        .order("nom")

      if (centresError) throw centresError

      // Fetch producteurs
      const { data: producteursData, error: producteursError } = await supabase
        .from("producteurs")
        .select("id, nom, code, centre_id")
        .order("nom")

      if (producteursError) throw producteursError

      // Fetch agents (users with role AGENT)
      const { data: agentsData, error: agentsError } = await supabase
        .from("utilisateurs")
        .select("id, nom, email, centre_id")
        .eq("role", "AGENT")
        .order("nom")

      if (agentsError) throw agentsError

      setPesees(peseesData || [])
      setCentres(centresData || [])
      setProducteurs(producteursData || [])
      setAgents(agentsData || [])
    } catch (error) {
      console.error("[AdminPesees] Error fetching data:", error)
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

  async function handleSave() {
    if (!formData.centre_id || !formData.producteur_id || !formData.poids || !formData.date) {
      showToast("Veuillez remplir tous les champs obligatoires", "error")
      return
    }

    try {
      setSaving(true)

      const producteur = producteursMap[formData.producteur_id]
      const agent = agentsMap[formData.agent_id]

      const payload = {
        centre_id: formData.centre_id,
        producteur_id: formData.producteur_id,
        poids: Number(formData.poids),
        date_pesee: new Date(formData.date).toISOString(),
        utilisateur_id: formData.agent_id || user?.id,
        nom_producteur: producteur?.nom || "",
        code_producteur: producteur?.code || "",
        nom_agent: agent?.nom || agent?.email || user?.nom || "",
        // Required fields for achats table
        prix_unitaire: 0, // Will be updated later if needed
        montant: 0, // Will be updated later if needed
        sacs: 0,
      }

      const { error } = await supabase.from("achats").insert([payload])

      if (error) throw error

      showToast("Pesée enregistrée avec succès", "success")
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error("[AdminPesees] Error saving pesee:", error)
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFormData({
      centre_id: "",
      producteur_id: "",
      poids: "",
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

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h2 style={title}>Gestion des Pesées</h2>
          <p style={subtitle}>Suivi des pesées de cacao par centre</p>
        </div>
        <Button variant="primary" icon={<FaPlus />} onClick={() => setShowModal(true)}>
          Nouvelle pesée
        </Button>
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
                    <th style={th}>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {group.pesees.map((pesee) => (
                    <tr key={pesee.id}>
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
                        {pesee.agents?.nom || pesee.nom_agent || pesee.agents?.email || "-"}
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
        <div style={form}>
          <div>
            <label style={label}>Centre *</label>
            <select
              value={formData.centre_id}
              onChange={(e) => {
                setFormData({ ...formData, centre_id: e.target.value, producteur_id: "", agent_id: "" })
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
              <option value="">Sélectionner un agent (optionnel)</option>
              {filteredAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom || a.email}
                </option>
              ))}
            </select>
          </div>

          <div style={formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
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

const label = {
  display: "block",
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  gap: 16,
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
