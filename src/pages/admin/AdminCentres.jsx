import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaFilePdf } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import Table from "../../components/ui/Table"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { useToast } from "../../components/ui/Toast"
import { exportCentresPDF } from "../../utils/exportToPDF"

export default function AdminCentres() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingCentre, setEditingCentre] = useState(null)
  const [deletingCentre, setDeletingCentre] = useState(null)
  const [formData, setFormData] = useState({
    nom: "",
    code: "",
    localite: "",
  })
  const [errors, setErrors] = useState({})
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    fetchCentres()
  }, [])

  async function fetchCentres() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .order("nom")

      if (error) throw error
      setCentres(data || [])
    } catch (error) {
      console.error("[AdminCentres] Error:", error)
      showToast("Erreur lors du chargement des centres", "error")
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingCentre(null)
    setFormData({ nom: "", code: "", localite: "" })
    setErrors({})
    setShowModal(true)
  }

  function openEditModal(centre) {
    setEditingCentre(centre)
    setFormData({
      nom: centre.nom || "",
      code: centre.code || "",
      localite: centre.localite || "",
    })
    setErrors({})
    setShowModal(true)
  }

  function validateForm() {
    const newErrors = {}
    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom est requis"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) {
      showToast("Veuillez corriger les erreurs du formulaire", "error")
      return
    }

    try {
      if (editingCentre) {
        const { error } = await supabase
          .from("centres")
          .update({
            nom: formData.nom.trim(),
            code: formData.code.trim() || null,
            localite: formData.localite.trim() || null,
          })
          .eq("id", editingCentre.id)

        if (error) throw error
        
        // Log activity
        await logCentreUpdated(
          editingCentre.id,
          formData.nom.trim(),
          `Updated: nom, code, localite`,
          user?.id || null,
          user?.email || null,
        )
        
        showToast("Centre modifié avec succès", "success")
      } else {
        const { data: insertedData, error } = await supabase.from("centres").insert([
          {
            nom: formData.nom.trim(),
            code: formData.code.trim() || null,
            localite: formData.localite.trim() || null,
          },
        ]).select()

        if (error) throw error
        
        // Log activity
        if (insertedData && insertedData[0]) {
          await logCentreCreated(
            insertedData[0].id,
            formData.nom.trim(),
            user?.id || null,
            user?.email || null,
          )
        }
        
        showToast("Centre créé avec succès", "success")
      }

      setShowModal(false)
      setFormData({ nom: "", code: "", localite: "" })
      setErrors({})
      fetchCentres()
    } catch (error) {
      console.error("[AdminCentres] Save error:", error)
      showToast(error.message || "Erreur lors de la sauvegarde", "error")
    }
  }

  function openDeleteDialog(centre) {
    setDeletingCentre(centre)
    setShowDeleteDialog(true)
  }

  async function handleDelete() {
    if (!deletingCentre) return

    try {
      const { error } = await supabase.from("centres").delete().eq("id", deletingCentre.id)

      if (error) throw error
      
      // Log activity
      await logCentreDeleted(
        deletingCentre.id,
        deletingCentre.nom || "Unknown",
        user?.id || null,
        user?.email || null,
      )
      
      showToast("Centre supprimé avec succès", "success")
      setShowDeleteDialog(false)
      setDeletingCentre(null)
      fetchCentres()
    } catch (error) {
      console.error("[AdminCentres] Delete error:", error)
      showToast(error.message || "Erreur lors de la suppression", "error")
    }
  }

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>Chargement...</p>
      </div>
    )
  }

  async function handleExportPDF() {
    if (centres.length === 0) {
      showToast("Aucun centre à exporter", "warning")
      return
    }

    setExportingPDF(true)
    try {
      const result = await exportCentresPDF(centres)
      
      // Log activity
      await logPDFExported(
        "Centres",
        `${result.count} centre${result.count > 1 ? "s" : ""} exported`,
        user?.id || null,
        user?.email || null,
      )
      
      showToast(`PDF exporté avec succès (${result.count} centre${result.count > 1 ? "s" : ""})`, "success")
    } catch (error) {
      console.error("[AdminCentres] PDF export error:", error)
      showToast("Erreur lors de l'export PDF: " + (error.message || "Erreur inconnue"), "error")
    } finally {
      setExportingPDF(false)
    }
  }

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (value) => (value ? <span style={codeBadge}>{value}</span> : "-"),
      sortable: true,
    },
    {
      key: "nom",
      label: "Nom",
      sortable: true,
    },
    {
      key: "localite",
      label: "Localité",
      render: (value) => value || "-",
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<FaEdit />}
            onClick={(e) => {
              e.stopPropagation()
              openEditModal(row)
            }}
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<FaTrash />}
            onClick={(e) => {
              e.stopPropagation()
              openDeleteDialog(row)
            }}
          >
            Supprimer
          </Button>
        </div>
      ),
      sortable: false,
    },
  ]

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h2 style={headerTitle}>Gestion des Centres</h2>
          <p style={subtitle}>Gérer les centres de collecte</p>
        </div>
        <div style={headerActions}>
          <Button
            variant="secondary"
            icon={<FaFilePdf />}
            onClick={handleExportPDF}
            disabled={exportingPDF || centres.length === 0}
          >
            {exportingPDF ? "Export..." : "Exporter PDF"}
          </Button>
          <Button onClick={openCreateModal} icon={<FaPlus />}>
            Ajouter un centre
          </Button>
        </div>
      </div>

      <Card>
        <Table
          data={centres}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher un centre..."
          searchFields={["nom", "code", "localite"]}
          sortable
          pagination
          pageSize={10}
          loading={loading}
          emptyMessage="Aucun centre enregistré"
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setErrors({})
        }}
        title={editingCentre ? "Modifier le centre" : "Nouveau centre"}
      >
        <div style={form}>
          <Input
            label="Nom du centre"
            value={formData.nom}
            onChange={(v) => {
              setFormData({ ...formData, nom: v })
              if (errors.nom) setErrors({ ...errors, nom: "" })
            }}
            error={errors.nom}
            required
            placeholder="Ex: Centre de Divo"
          />
          <Input
            label="Code"
            value={formData.code}
            onChange={(v) => setFormData({ ...formData, code: v })}
            placeholder="Ex: DIV-001"
          />
          <Input
            label="Localité"
            value={formData.localite}
            onChange={(v) => setFormData({ ...formData, localite: v })}
            placeholder="Ex: Divo, Côte d'Ivoire"
          />
          <div style={formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setErrors({})
              }}
            >
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingCentre ? "Modifier" : "Créer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeletingCentre(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer le centre"
        message={`Êtes-vous sûr de vouloir supprimer le centre "${deletingCentre?.nom}" ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
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
  gap: 16,
  flexWrap: "wrap",
}

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
}

const headerTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
}

const subtitle = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#6b7280",
}

const table = {
  overflowX: "auto",
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "600px",
}

const th = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
}

const td = {
  padding: "12px 16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
  color: "#111827",
}

const codeBadge = {
  padding: "4px 10px",
  background: "#eff6ff",
  color: "#1e40af",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
}

const actions = {
  display: "flex",
  gap: 8,
}

const editBtn = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: "8px",
  padding: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const deleteBtn = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: "8px",
  padding: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
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
  margin: "8px 0 0 0",
  fontSize: "16px",
  color: "#6b7280",
}

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
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

const loadingText = {
  color: "#6b7280",
  fontSize: "14px",
}
