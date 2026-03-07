import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { FaPlus, FaMagnifyingGlass, FaPenToSquare, FaTrash, FaPhone, FaLocationDot } from "react-icons/fa6"
import Card from "./components/ui/Card"
import Button from "./components/ui/Button"
import Input from "./components/ui/Input"
import Modal from "./components/ui/Modal"
import { useToast } from "./components/ui/Toast"
import { useMediaQuery } from "./hooks/useMediaQuery"

export default function Centres() {
  const { showToast } = useToast()
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCentre, setEditingCentre] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const [formData, setFormData] = useState({
    nom: "",
    localite: "",
    type: "MAGASIN",
    telephone: "",
  })

  async function fetchCentres() {
    setLoading(true)
    try {
      const { data: centresData, error } = await supabase
        .from("centres")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        showToast("Erreur lors du chargement des centres", "error")
        setLoading(false)
        return
      }

      const centresAvecNombre = await Promise.all(
        centresData.map(async (centre) => {
          const { count } = await supabase
            .from("producteurs")
            .select("*", { count: "exact", head: true })
            .eq("centre_id", centre.id)

          return {
            ...centre,
            totalProducteurs: count || 0,
          }
        }),
      )

      setCentres(centresAvecNombre)
    } catch (error) {
      showToast("Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCentres()
  }, [])

  async function generateCode() {
    const { count, error } = await supabase
      .from("centres")
      .select("*", { count: "exact", head: true })
      .eq("type", "MAGASIN")

    if (error) {
      console.error(error)
      setGeneratedCode("")
      return
    }

    const numero = (count || 0) + 1
    setGeneratedCode(`ASAB-M${String(numero).padStart(3, "0")}`)
  }

  function openForm(centre = null) {
    if (centre) {
      setEditingCentre(centre)
      setFormData({
        nom: centre.nom || "",
        localite: centre.localisation || "",
        type: centre.type || "MAGASIN",
        telephone: centre.telephone?.replace("+225", "") || "",
      })
      setGeneratedCode(centre.code || "")
    } else {
      setEditingCentre(null)
      setFormData({
        nom: "",
        localite: "",
        type: "MAGASIN",
        telephone: "",
      })
      generateCode()
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingCentre(null)
    setFormData({
      nom: "",
      localite: "",
      type: "MAGASIN",
      telephone: "",
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
        code: editingCentre ? editingCentre.code : generatedCode,
        nom: formData.nom,
        localisation: formData.localite || null,
        type: "MAGASIN",
        telephone: "+225" + formData.telephone,
      }

      if (editingCentre) {
        const { error } = await supabase.from("centres").update(payload).eq("id", editingCentre.id)
        if (error) throw error
        showToast("Centre modifié avec succès", "success")
      } else {
        const { error } = await supabase.from("centres").insert([payload])
        if (error) throw error
        showToast("Centre ajouté avec succès", "success")
      }

      closeForm()
      fetchCentres()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de l'enregistrement", "error")
    }
  }

  async function handleDelete(centre) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le centre "${centre.nom}" ?`)) {
      return
    }

    try {
      const { error } = await supabase.from("centres").delete().eq("id", centre.id)
      if (error) throw error
      showToast("Centre supprimé avec succès", "success")
      fetchCentres()
    } catch (error) {
      console.error(error)
      showToast("Erreur lors de la suppression", "error")
    }
  }

  const filteredCentres = centres.filter(
    (centre) =>
      centre.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      centre.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      centre.localisation?.toLowerCase().includes(searchTerm.toLowerCase()),
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
          }}>Gestion des Centres</h1>
          <p style={subtitle}>Gérez les centres de collecte de la coopérative</p>
        </div>
        <Button onClick={() => openForm()} icon={<FaPlus />} style={{
          width: isMobile ? "100%" : "auto",
        }}>
          {isMobile ? "Ajouter" : "Ajouter un centre"}
        </Button>
      </div>

      <Card>
        <div style={searchBar}>
          <Input
            icon={<FaMagnifyingGlass />}
            placeholder="Rechercher un centre..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, maxWidth: "400px" }}
          />
          <div style={statsBadge}>
            {filteredCentres.length} centre{filteredCentres.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredCentres.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyText}>
              {searchTerm ? "Aucun centre trouvé" : "Aucun centre enregistré"}
            </p>
          </div>
        ) : (
          <div style={tableContainer}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Nom</th>
                  <th style={th}>Localisation</th>
                  <th style={th}>Téléphone</th>
                  <th style={th}>Producteurs</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCentres.map((centre) => (
                  <tr key={centre.id}>
                    <td style={td}>
                      <span style={codeBadge}>{centre.code}</span>
                    </td>
                    <td style={td}>
                      <strong style={nameText}>{centre.nom}</strong>
                    </td>
                    <td style={td}>
                      <div style={locationCell}>
                        <FaLocationDot style={{ color: "#6b7280", fontSize: 14 }} />
                        <span>{centre.localisation || "Non défini"}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <div style={phoneCell}>
                        <FaPhone style={{ color: "#6b7280", fontSize: 14 }} />
                        <span>{centre.telephone || "Non défini"}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={producteursBadge}>{centre.totalProducteurs}</span>
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
                          onClick={() => openForm(centre)}
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
                          onClick={() => handleDelete(centre)}
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
        title={editingCentre ? "Modifier le centre" : "Nouveau centre"}
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
            label="Nom du centre"
            value={formData.nom}
            onChange={(v) => setFormData({ ...formData, nom: v })}
            required
            placeholder="Ex: Centre de Divo"
          />

          <Input
            label="Localisation"
            value={formData.localite}
            onChange={(v) => setFormData({ ...formData, localite: v })}
            placeholder="Ex: Divo, Côte d'Ivoire"
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>+225</span>
            <Input
              label="Téléphone"
              value={formData.telephone}
              onChange={(v) => setFormData({ ...formData, telephone: v })}
              required
              placeholder="0700000000"
              style={{ flex: 1 }}
            />
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
              {editingCentre ? "Modifier" : "Enregistrer"}
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

const locationCell = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#6b7280",
}

const phoneCell = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#6b7280",
}

const producteursBadge = {
  padding: "6px 12px",
  background: "#eff6ff",
  color: "#2563eb",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 600,
  display: "inline-block",
}

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
