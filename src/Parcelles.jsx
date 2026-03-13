import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt } from "react-icons/fa"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import { useToast } from "./components/ui/Toast"
import { useAuth } from "./context/AuthContext"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { getParcellesQuery, getProducteursQuery, getUserRoleInfo } from "./utils/rolePermissions"

export default function Parcelles() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [parcelles, setParcelles] = useState([])
  const [producteurs, setProducteurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingParcelle, setEditingParcelle] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const { isCentre, centreId } = getUserRoleInfo(user)

  const [formData, setFormData] = useState({
    producteur_id: "",
    superficie: "",
    localisation: "",
    coordonnees: "",
    type_cacao: "",
    annee_plantation: "",
    statut: "active",
  })

  async function fetchParcelles() {
    try {
      setLoading(true)
      const query = getParcellesQuery(user)
      if (!query) {
        setParcelles([])
        return
      }

      const { data, error } = await query

      if (error) {
        console.error("[Parcelles] Error loading parcelles:", error)
        showToast("Erreur lors du chargement des parcelles", "error")
        return
      }

      setParcelles(data || [])
    } catch (error) {
      console.error("[Parcelles] Exception loading parcelles:", error)
      showToast("Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducteurs() {
    try {
      const query = getProducteursQuery(user)
      const { data, error } = await query

      if (error) {
        console.error("[Parcelles] Error loading producteurs:", error)
        return
      }

      setProducteurs(data || [])
    } catch (error) {
      console.error("[Parcelles] Exception loading producteurs:", error)
    }
  }

  useEffect(() => {
    fetchParcelles()
    fetchProducteurs()
  }, [user])

  function openForm(parcelle = null) {
    if (parcelle) {
      setEditingParcelle(parcelle)
      setFormData({
        producteur_id: parcelle.producteur_id ? String(parcelle.producteur_id) : "",
        superficie: parcelle.superficie || "",
        localisation: parcelle.localisation || "",
        coordonnees: parcelle.coordonnees || "",
        type_cacao: parcelle.type_cacao || "",
        annee_plantation: parcelle.annee_plantation ? String(parcelle.annee_plantation) : "",
        statut: parcelle.statut || "active",
      })
    } else {
      setEditingParcelle(null)
      setFormData({
        producteur_id: "",
        superficie: "",
        localisation: "",
        coordonnees: "",
        type_cacao: "",
        annee_plantation: "",
        statut: "active",
      })
    }
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.producteur_id) {
      showToast("Sélectionnez un producteur", "error")
      return
    }

    if (!formData.superficie) {
      showToast("Remplissez la superficie", "error")
      return
    }

    try {
      const selectedProducteur = producteurs.find((p) => String(p.id) === String(formData.producteur_id))
      const payload = {
        producteur_id: formData.producteur_id,
        centre_id: isCentre ? centreId : (selectedProducteur?.centre_id || null),
        superficie: Number(formData.superficie),
        localisation: formData.localisation || null,
        coordonnees: formData.coordonnees || null,
        type_cacao: formData.type_cacao || null,
        annee_plantation: formData.annee_plantation ? Number(formData.annee_plantation) : null,
        statut: formData.statut || "active",
        created_by: user?.id || null,
      }

      if (editingParcelle) {
        const { error } = await supabase
          .from("parcelles")
          .update(payload)
          .eq("id", editingParcelle.id)

        if (error) throw error
        showToast("Parcelle mise à jour avec succès", "success")
      } else {
        const { error } = await supabase.from("parcelles").insert([payload])

        if (error) throw error
        showToast("Parcelle créée avec succès", "success")
      }

      setShowForm(false)
      fetchParcelles()
    } catch (error) {
      console.error("[Parcelles] Error saving parcelle:", error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  async function handleDelete(id) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette parcelle ?")) {
      return
    }

    try {
      const { error } = await supabase.from("parcelles").delete().eq("id", id)

      if (error) throw error

      showToast("Parcelle supprimée avec succès", "success")
      fetchParcelles()
    } catch (error) {
      console.error("[Parcelles] Error deleting parcelle:", error)
      showToast("Erreur lors de la suppression", "error")
    }
  }

  function getProducteurNom(producteurId) {
    return producteurs.find((p) => String(p.id) === String(producteurId))?.nom || "-"
  }

  const filteredParcelles = parcelles.filter((p) => {
    const producteurNom = getProducteurNom(p.producteur_id)
    return (
      producteurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localisation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type_cacao?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

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
          }}>Gestion des Parcelles</h1>
          <p style={subtitle}>Gérez les parcelles des producteurs</p>
        </div>
        <Button onClick={() => openForm()} icon={<FaPlus />} style={{
          width: isMobile ? "100%" : "auto",
        }}>
          Nouvelle parcelle
        </Button>
      </div>

      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaSearch />}
            placeholder="Rechercher une parcelle..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredParcelles.length} parcelle{filteredParcelles.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredParcelles.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucune parcelle trouvée" : "Aucune parcelle enregistrée"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Producteur</th>
                  <th style={th}>Superficie (ha)</th>
                  <th style={th}>Localisation</th>
                  <th style={th}>Type Cacao</th>
                  <th style={th}>Année</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcelles.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <strong>{getProducteurNom(p.producteur_id)}</strong>
                    </td>
                    <td style={td}>{p.superficie || "-"}</td>
                    <td style={td}>
                      <div style={locationCell}>
                        <FaMapMarkerAlt style={{ color: "#6b7280", fontSize: 12, marginRight: 6 }} />
                        {p.localisation || "-"}
                      </div>
                    </td>
                    <td style={td}>{p.type_cacao || "-"}</td>
                    <td style={td}>{p.annee_plantation || "-"}</td>
                    <td style={td}>
                      <span style={{
                        ...statusBadge,
                        background: p.statut === "active" ? "#ecfdf3" : "#fef2f2",
                        color: p.statut === "active" ? "#16a34a" : "#dc2626",
                      }}>
                        {p.statut || "active"}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openForm(p)}
                          icon={<FaEdit />}
                          style={{
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(p.id)}
                          icon={<FaTrash />}
                          style={{
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          Supprimer
                        </Button>
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
        onClose={() => {
          setShowForm(false)
          setEditingParcelle(null)
        }}
        title={editingParcelle ? "Modifier la parcelle" : "Nouvelle parcelle"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div style={formGrid}>
            <div style={formGroup}>
              <label style={label}>Producteur *</label>
              <select
                value={formData.producteur_id}
                onChange={(e) => setFormData({ ...formData, producteur_id: e.target.value })}
                style={selectInput}
                required
              >
                <option value="">Choisir un producteur</option>
                {producteurs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Superficie (hectares) *"
              type="number"
              min="0"
              step="0.01"
              value={formData.superficie}
              onChange={(v) => setFormData({ ...formData, superficie: v })}
              required
              placeholder="0.00"
            />

            <Input
              label="Localisation"
              value={formData.localisation}
              onChange={(v) => setFormData({ ...formData, localisation: v })}
              placeholder="Ex: Village, Quartier"
            />

            <Input
              label="Coordonnées GPS"
              value={formData.coordonnees}
              onChange={(v) => setFormData({ ...formData, coordonnees: v })}
              placeholder="Ex: 5.123456, -4.123456"
            />

            <Input
              label="Type de cacao"
              value={formData.type_cacao}
              onChange={(v) => setFormData({ ...formData, type_cacao: v })}
              placeholder="Ex: Forastero, Criollo"
            />

            <Input
              label="Année de plantation"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.annee_plantation}
              onChange={(v) => setFormData({ ...formData, annee_plantation: v })}
              placeholder="Ex: 2020"
            />

            <div style={formGroup}>
              <label style={label}>Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                style={selectInput}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setEditingParcelle(null)
              }}
              style={{
                width: isMobile ? "100%" : "auto",
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" style={{
              width: isMobile ? "100%" : "auto",
            }}>
              {editingParcelle ? "Mettre à jour" : "Créer"}
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

const locationCell = {
  display: "flex",
  alignItems: "center",
  color: "#6b7280",
}

const statusBadge = {
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
}

const formGrid = {
  display: "grid",
  gap: 16,
  marginBottom: 20,
}

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
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

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 24,
  paddingTop: 24,
  borderTop: "1px solid #e5e7eb",
  flexWrap: "wrap",
}
