import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaPlus, FaMagnifyingGlass, FaPenToSquare, FaTrash, FaPhone, FaUser } from "react-icons/fa6"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import { useToast } from "./components/ui/Toast"
import { useMediaQuery } from "./hooks/useMediaQuery"

export default function Producteurs() {
  const { showToast } = useToast()
  const [producteurs, setProducteurs] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProducteur, setEditingProducteur] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    sexe: "",
    localite: "",
    statut: "",
    centre_id: "",
  })

  async function fetchProducteurs() {
    setLoading(true)
    try {
      const { data: producteursData, error } = await supabase
        .from("producteurs")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        showToast("Erreur lors du chargement des producteurs", "error")
        setLoading(false)
        return
      }

      setProducteurs(producteursData || [])
    } catch (error) {
      showToast("Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCentres() {
    try {
      const { data, error } = await supabase.from("centres").select("id, nom").order("nom")

      if (error) {
        console.error(error)
        return
      }

      setCentres(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchProducteurs()
    fetchCentres()
  }, [])

  async function generateCode() {
    const { data, error } = await supabase
      .from("producteurs")
      .select("code")
      .not("code", "is", null)

    if (error) {
      console.error(error)
      setGeneratedCode("ASAB-001")
      return
    }

    if (!data || data.length === 0) {
      setGeneratedCode("ASAB-001")
      return
    }

    const numbers = data
      .map((item) => {
        if (!item.code) return null
        const parts = item.code.split("-")
        return parseInt(parts[1])
      })
      .filter((n) => !isNaN(n))

    if (numbers.length === 0) {
      setGeneratedCode("ASAB-001")
      return
    }

    const maxNumber = Math.max(...numbers)
    setGeneratedCode(`ASAB-${String(maxNumber + 1).padStart(3, "0")}`)
  }

  function openForm(producteur = null) {
    if (producteur) {
      setEditingProducteur(producteur)
      setFormData({
        nom: producteur.nom || "",
        telephone: producteur.telephone || "",
        sexe: producteur.sexe || "",
        localite: producteur.localite || "",
        statut: producteur.statut || "",
        centre_id: producteur.centre_id ? String(producteur.centre_id) : "",
      })
      setGeneratedCode(producteur.code || "")
    } else {
      setEditingProducteur(null)
      setFormData({
        nom: "",
        telephone: "",
        sexe: "",
        localite: "",
        statut: "",
        centre_id: "",
      })
      generateCode()
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingProducteur(null)
    setFormData({
      nom: "",
      telephone: "",
      sexe: "",
      localite: "",
      statut: "",
      centre_id: "",
    })
    setGeneratedCode("")
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.nom.trim()) {
      showToast("Le nom est obligatoire", "error")
      return
    }

    if (!formData.telephone.trim()) {
      showToast("Le téléphone est obligatoire", "error")
      return
    }

    try {
      const payload = {
        code: editingProducteur ? editingProducteur.code : generatedCode,
        nom: formData.nom,
        telephone: formData.telephone,
        sexe: formData.sexe || null,
        localite: formData.localite || null,
        statut: formData.statut || null,
        centre_id: formData.centre_id || null,
      }

      if (editingProducteur) {
        const { error } = await supabase.from("producteurs").update(payload).eq("id", editingProducteur.id)
        if (error) throw error
        showToast("Producteur modifié avec succès", "success")
      } else {
        const { error } = await supabase.from("producteurs").insert([payload])
        if (error) throw error
        showToast("Producteur ajouté avec succès", "success")
      }

      closeForm()
      fetchProducteurs()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  async function handleDelete(producteur) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le producteur "${producteur.nom}" ?`)) {
      return
    }

    try {
      const { error } = await supabase.from("producteurs").delete().eq("id", producteur.id)
      if (error) throw error
      showToast("Producteur supprimé avec succès", "success")
      fetchProducteurs()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de la suppression", "error")
    }
  }

  function getCentreNom(centreId) {
    if (!centreId) return "-"
    const centre = centres.find((c) => String(c.id) === String(centreId))
    return centre?.nom || "-"
  }

  const filteredProducteurs = producteurs.filter(
    (producteur) =>
      producteur.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producteur.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCentreNom(producteur.centre_id)?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div style={container}>
      <div style={{
        ...header,
        flexDirection: isMobile ? "column" : "row",
      }}>
        <div>
          <h1 style={{
            ...title,
            fontSize: isMobile ? "24px" : "32px",
          }}>Gestion des Producteurs</h1>
          <p style={subtitle}>Gérez les producteurs de la coopérative</p>
        </div>
        <Button onClick={() => openForm()} icon={<FaPlus />} style={{
          width: isMobile ? "100%" : "auto",
        }}>
          {isMobile ? "Ajouter" : "Ajouter un producteur"}
        </Button>
      </div>

      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaMagnifyingGlass />}
            placeholder="Rechercher un producteur..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredProducteurs.length} producteur{filteredProducteurs.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredProducteurs.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucun producteur trouvé" : "Aucun producteur enregistré"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Nom</th>
                  <th style={th}>Téléphone</th>
                  <th style={th}>Centre</th>
                  <th style={th}>Sexe</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducteurs.map((producteur) => (
                  <tr key={producteur.id}>
                    <td style={td}>
                      <span style={codeBadge}>{producteur.code || "-"}</span>
                    </td>
                    <td style={td}>
                      <strong style={nameText}>{producteur.nom || "-"}</strong>
                    </td>
                    <td style={td}>
                      <div style={phoneCell}>
                        <FaPhone style={{ color: "#6b7280", fontSize: 14 }} />
                        <span>{producteur.telephone || "-"}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={centreBadge}>{getCentreNom(producteur.centre_id)}</span>
                    </td>
                    <td style={td}>{producteur.sexe || "-"}</td>
                    <td style={td}>
                      <span style={statutBadge(producteur.statut)}>{producteur.statut || "-"}</span>
                    </td>
                    <td style={td}>
                      <div style={{
                        ...actionsCell,
                        gap: isMobile ? 12 : 8,
                      }}>
                        <button
                          style={{
                            ...actionBtn,
                            width: isMobile ? 44 : 36,
                            height: isMobile ? 44 : 36,
                            minWidth: isMobile ? 44 : 36,
                          }}
                          onClick={() => openForm(producteur)}
                          title="Modifier"
                        >
                          <FaPenToSquare />
                        </button>
                        <button
                          style={{
                            ...actionBtn,
                            ...deleteBtn,
                            width: isMobile ? 44 : 36,
                            height: isMobile ? 44 : 36,
                            minWidth: isMobile ? 44 : 36,
                          }}
                          onClick={() => handleDelete(producteur)}
                          title="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingProducteur ? "Modifier le producteur" : "Nouveau producteur"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Code"
            value={generatedCode}
            readOnly
            disabled
            style={{ background: "#f9fafb" }}
          />

          <Input
            label="Nom du producteur"
            value={formData.nom}
            onChange={(v) => setFormData({ ...formData, nom: v })}
            required
            placeholder="Ex: Kouassi Jean"
          />

          <Input
            label="Téléphone"
            value={formData.telephone}
            onChange={(v) => setFormData({ ...formData, telephone: v })}
            required
            placeholder="Ex: 0700000000"
            icon={<FaPhone />}
          />

          <div style={formGroup}>
            <label style={label}>Centre associé</label>
            <select
              value={formData.centre_id}
              onChange={(e) => setFormData({ ...formData, centre_id: e.target.value })}
              style={selectInput}
            >
              <option value="">Aucun centre</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={formGroup}>
            <label style={label}>Sexe</label>
            <select
              value={formData.sexe}
              onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
              style={selectInput}
            >
              <option value="">Non spécifié</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>
          </div>

          <Input
            label="Localité"
            value={formData.localite}
            onChange={(v) => setFormData({ ...formData, localite: v })}
            placeholder="Ex: Divo, Côte d'Ivoire"
          />

          <div style={formGroup}>
            <label style={label}>Statut</label>
            <select
              value={formData.statut}
              onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
              style={selectInput}
            >
              <option value="">Non spécifié</option>
              <option value="Membre">Membre</option>
              <option value="Nouveau membre">Nouveau membre</option>
            </select>
          </div>

          <div style={{
            ...modalActions,
            flexDirection: isMobile ? "column" : "row",
          }}>
            <Button type="button" variant="secondary" onClick={closeForm} style={{
              width: isMobile ? "100%" : "auto",
            }}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" style={{
              width: isMobile ? "100%" : "auto",
            }}>
              {editingProducteur ? "Modifier" : "Enregistrer"}
            </Button>
          </div>
        </form>
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
}

const title = {
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

const searchBar = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 24,
  flexWrap: "wrap",
}

const statsBadge = {
  padding: "8px 16px",
  background: "#f3f4f6",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#6b7280",
}

const loadingState = {
  padding: 60,
  textAlign: "center",
  color: "#6b7280",
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #e5e7eb",
  borderTopColor: "#7a1f1f",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  margin: "0 auto 16px",
}

const emptyState = {
  padding: 60,
  textAlign: "center",
}

const emptyText = {
  color: "#6b7280",
  fontSize: "15px",
}

const tableContainer = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "800px",
}

const th = {
  padding: "16px",
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
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#1f2937",
}

const codeBadge = {
  padding: "6px 12px",
  background: "#fef2f2",
  color: "#7a1f1f",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
}

const nameText = {
  color: "#1f2937",
  fontSize: "15px",
}

const phoneCell = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#6b7280",
}

const centreBadge = {
  padding: "6px 12px",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
}

const statutBadge = (statut) => ({
  padding: "6px 12px",
  background: statut === "Membre" ? "#ecfdf3" : "#fffbeb",
  color: statut === "Membre" ? "#16a34a" : "#f59e0b",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
})

const actionsCell = {
  display: "flex",
  gap: 8,
}

const actionBtn = {
  border: "none",
  background: "#f3f4f6",
  color: "#6b7280",
  width: 36,
  height: 36,
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
}

const deleteBtn = {
  background: "#fef2f2",
  color: "#dc2626",
}

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
  flexWrap: "wrap",
}

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 20,
}

const label = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 600,
}

const selectInput = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  outline: "none",
  background: "white",
}
