import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaPlus, FaSearch, FaEdit, FaCheckCircle, FaClock, FaTruck } from "react-icons/fa"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import { useToast } from "./components/ui/Toast"
import { useAuth } from "./context/AuthContext"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { getLivraisonsQuery, getUserRoleInfo } from "./utils/rolePermissions"

export default function Livraisons() {
  const { showToast } = useToast()
  const { user, displayName } = useAuth()
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLivraison, setEditingLivraison] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const { isCentre, centreId } = getUserRoleInfo(user)

  const [formData, setFormData] = useState({
    poids_total: "",
    nombre_sacs: "",
    statut: "EN_ATTENTE",
    notes: "",
  })

  async function fetchLivraisons() {
    try {
      setLoading(true)
      const query = getLivraisonsQuery(user)
      if (!query) {
        setLivraisons([])
        return
      }

      const { data, error } = await query

      if (error) {
        console.error("[Livraisons] Error loading livraisons:", error)
        showToast("Erreur lors du chargement des livraisons", "error")
        return
      }

      setLivraisons(data || [])
    } catch (error) {
      console.error("[Livraisons] Exception loading livraisons:", error)
      showToast("Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLivraisons()
  }, [user])

  function openForm(livraison = null) {
    if (livraison) {
      setEditingLivraison(livraison)
      setFormData({
        poids_total: livraison.poids_total || "",
        nombre_sacs: livraison.nombre_sacs ? String(livraison.nombre_sacs) : "",
        statut: livraison.statut || "EN_ATTENTE",
        notes: livraison.notes || "",
      })
    } else {
      setEditingLivraison(null)
      setFormData({
        poids_total: "",
        nombre_sacs: "",
        statut: "EN_ATTENTE",
        notes: "",
      })
    }
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.poids_total) {
      showToast("Remplissez le poids total", "error")
      return
    }

    try {
      const payload = {
        centre_id: centreId,
        poids_total: Number(formData.poids_total),
        nombre_sacs: formData.nombre_sacs ? Number(formData.nombre_sacs) : 0,
        statut: formData.statut,
        notes: formData.notes || null,
        utilisateur_id: user?.id || null,
      }

      if (editingLivraison) {
        const { error } = await supabase
          .from("livraisons")
          .update(payload)
          .eq("id", editingLivraison.id)

        if (error) throw error
        showToast("Livraison mise à jour avec succès", "success")
      } else {
        const { error } = await supabase.from("livraisons").insert([payload])

        if (error) throw error
        showToast("Livraison créée avec succès", "success")
      }

      setShowForm(false)
      fetchLivraisons()
    } catch (error) {
      console.error("[Livraisons] Error saving livraison:", error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  async function toggleStatut(livraison) {
    const newStatut = livraison.statut === "EN_ATTENTE" ? "VALIDE" : "EN_ATTENTE"
    
    try {
      const { error } = await supabase
        .from("livraisons")
        .update({ statut: newStatut })
        .eq("id", livraison.id)

      if (error) throw error

      showToast(`Statut changé à ${newStatut}`, "success")
      fetchLivraisons()
    } catch (error) {
      console.error("[Livraisons] Error updating statut:", error)
      showToast("Erreur lors de la mise à jour", "error")
    }
  }

  const filteredLivraisons = livraisons.filter((l) => {
    return (
      String(l.poids_total).includes(searchTerm) ||
      String(l.nombre_sacs).includes(searchTerm) ||
      l.statut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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
          }}>Gestion des Livraisons</h1>
          <p style={subtitle}>Gérez les livraisons de cacao</p>
        </div>
        <Button onClick={() => openForm()} icon={<FaPlus />} style={{
          width: isMobile ? "100%" : "auto",
        }}>
          Nouvelle livraison
        </Button>
      </div>

      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaSearch />}
            placeholder="Rechercher une livraison..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredLivraisons.length} livraison{filteredLivraisons.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredLivraisons.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucune livraison trouvée" : "Aucune livraison enregistrée"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Poids Total (Kg)</th>
                  <th style={th}>Nombre de Sacs</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Notes</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLivraisons.map((l) => (
                  <tr key={l.id}>
                    <td style={td}>
                      {l.date_livraison || l.created_at
                        ? new Date(l.date_livraison || l.created_at).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                    <td style={td}>
                      <strong>{Number(l.poids_total || 0).toLocaleString()} kg</strong>
                    </td>
                    <td style={td}>{l.nombre_sacs || 0}</td>
                    <td style={td}>
                      <span style={{
                        ...statusBadge,
                        background: l.statut === "VALIDE" ? "#ecfdf3" : "#fffbeb",
                        color: l.statut === "VALIDE" ? "#16a34a" : "#f59e0b",
                      }}>
                        {l.statut === "VALIDE" ? (
                          <>
                            <FaCheckCircle style={{ marginRight: 6 }} />
                            Validée
                          </>
                        ) : (
                          <>
                            <FaClock style={{ marginRight: 6 }} />
                            En Attente
                          </>
                        )}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>
                        {l.notes || "-"}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openForm(l)}
                          icon={<FaEdit />}
                          style={{
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant={l.statut === "VALIDE" ? "secondary" : "primary"}
                          onClick={() => toggleStatut(l)}
                          icon={l.statut === "VALIDE" ? <FaClock /> : <FaCheckCircle />}
                          style={{
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          {l.statut === "VALIDE" ? "Mettre en attente" : "Valider"}
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
          setEditingLivraison(null)
        }}
        title={editingLivraison ? "Modifier la livraison" : "Nouvelle livraison"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div style={formGrid}>
            <Input
              label="Poids Total (Kg) *"
              type="number"
              min="0"
              step="0.01"
              value={formData.poids_total}
              onChange={(v) => setFormData({ ...formData, poids_total: v })}
              required
              placeholder="0.00"
            />

            <Input
              label="Nombre de Sacs"
              type="number"
              min="0"
              value={formData.nombre_sacs}
              onChange={(v) => setFormData({ ...formData, nombre_sacs: v })}
              placeholder="0"
            />

            <div style={formGroup}>
              <label style={label}>Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                style={selectInput}
              >
                <option value="EN_ATTENTE">En Attente</option>
                <option value="VALIDE">Validée</option>
              </select>
            </div>

            <div style={formGroup}>
              <label style={label}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={textareaInput}
                rows={4}
                placeholder="Notes additionnelles..."
              />
            </div>
          </div>

          <div style={modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setEditingLivraison(null)
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
              {editingLivraison ? "Mettre à jour" : "Créer"}
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

const statusBadge = {
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
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

const textareaInput = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  outline: "none",
  background: "white",
  fontFamily: "inherit",
  resize: "vertical",
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
