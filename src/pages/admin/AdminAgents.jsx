import { useEffect, useState, useMemo } from "react"
import { supabase } from "../../supabaseClient"
import { FaPlus, FaEdit, FaTrash, FaUserFriends, FaBuilding, FaFilePdf } from "react-icons/fa"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Table from "../../components/ui/Table"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Input from "../../components/ui/Input"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { exportAgentsPDF } from "../../utils/exportToPDF"
import { logPDFExported } from "../../utils/activityLogger"

const INITIAL_FORM = {
  nom: "",
  email: "",
  password: "",
  centre_id: "",
}

export default function AdminAgents() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [agents, setAgents] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [deletingAgent, setDeletingAgent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    fetchData()
  }, [isAdmin])

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((c) => [String(c.id), c.nom])),
    [centres],
  )

  async function fetchData() {
    try {
      setLoading(true)
      const [{ data: agentsData, error: agentsError }, { data: centresData, error: centresError }] = await Promise.all([
        supabase
          .from("utilisateurs")
          .select("*")
          .eq("role", "AGENT")
          .order("created_at", { ascending: false }),
        supabase.from("centres").select("id,nom").order("nom"),
      ])

      if (agentsError) {
        console.error("[AdminAgents] Error fetching agents:", agentsError)
        throw new Error(`Erreur lors du chargement des agents: ${agentsError.message}`)
      }

      if (centresError) {
        console.warn("[AdminAgents] Error fetching centres:", centresError)
        // Centres error is not critical, continue with empty array
      }

      setAgents(agentsData || [])
      setCentres(centresData || [])
    } catch (error) {
      console.error("[AdminAgents] Error:", error)
      showToast("Erreur lors du chargement des agents", "error")
    } finally {
      setLoading(false)
    }
  }

  function validateForm() {
    const newErrors = {}
    if (!form.nom.trim()) newErrors.nom = "Le nom est requis"
    if (!form.email.trim()) newErrors.email = "L'email est requis"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email invalide"
    }
    if (!editingAgent && !form.password.trim()) {
      newErrors.password = "Le mot de passe est requis"
    }
    if (!form.centre_id) newErrors.centre_id = "Le centre est requis"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function resetModal() {
    setForm(INITIAL_FORM)
    setEditingAgent(null)
    setErrors({})
    setShowModal(false)
  }

  function openCreateModal() {
    resetModal()
    setShowModal(true)
  }

  function openEditModal(agent) {
    setEditingAgent(agent)
    setForm({
      nom: agent.nom || "",
      email: agent.email || "",
      password: "",
      centre_id: agent.centre_id ? String(agent.centre_id) : "",
    })
    setErrors({})
    setShowModal(true)
  }

  function openDeleteDialog(agent) {
    setDeletingAgent(agent)
    setShowDeleteDialog(true)
  }

  async function handleSave() {
    if (!validateForm()) {
      showToast("Veuillez corriger les erreurs du formulaire", "error")
      return
    }

    setSaving(true)
    try {
      if (editingAgent) {
        // Update existing agent
        const { error } = await supabase
          .from("utilisateurs")
          .update({
            nom: form.nom.trim(),
            email: form.email.trim(),
            centre_id: form.centre_id || null,
          })
          .eq("id", editingAgent.id)

        if (error) throw error
        showToast("Agent modifié avec succès", "success")
      } else {
        // Create new agent using signUp (NOT admin.createUser - requires service_role)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.nom.trim(),
              role: "AGENT",
            },
          },
        })

        if (authError) {
          console.error("[AdminAgents] Auth signUp error:", authError)
          throw new Error(
            authError.message || "Erreur lors de la création du compte. Vérifiez que l'email n'existe pas déjà.",
          )
        }

        const newAuthUser = authData?.user
        if (!newAuthUser?.id) {
          throw new Error("Création du compte impossible - aucun utilisateur retourné")
        }

        // Build payload without status first
        const insertPayload = {
          user_id: newAuthUser.id,
          nom: form.nom.trim(),
          email: form.email.trim(),
          role: "AGENT",
          centre_id: form.centre_id || null,
        }

        // Try to insert with status, but handle gracefully if column doesn't exist
        let insertedData
        
        const { data: dataWithStatus, error: errorWithStatus } = await supabase
          .from("utilisateurs")
          .insert([{ ...insertPayload, status: "active" }])
          .select()

        if (errorWithStatus && errorWithStatus.message?.includes("status")) {
          // If status column doesn't exist, try again without it
          console.warn("[AdminAgents] Status column doesn't exist, retrying without status")
          const { data: dataWithoutStatus, error: errorWithoutStatus } = await supabase
            .from("utilisateurs")
            .insert([insertPayload])
            .select()
          
          if (errorWithoutStatus) {
            console.error("[AdminAgents] Insert error:", errorWithoutStatus)
            throw errorWithoutStatus
          }
          
          insertedData = dataWithoutStatus
        } else if (errorWithStatus) {
          console.error("[AdminAgents] Insert error:", errorWithStatus)
          throw errorWithStatus
        } else {
          insertedData = dataWithStatus
        }

        console.log("[AdminAgents] Agent created successfully:", insertedData?.[0])
        showToast("Agent créé avec succès", "success")
      }

      resetModal()
      await fetchData()
    } catch (error) {
      console.error("[AdminAgents] Save error:", error)
      showToast(error.message || "Erreur lors de la sauvegarde", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingAgent) return

    try {
      const { error: deleteError } = await supabase
        .from("utilisateurs")
        .delete()
        .eq("id", deletingAgent.id)
        .select()

      if (deleteError) {
        console.error("[AdminAgents] Delete error:", deleteError)
        throw deleteError
      }

      console.log("[AdminAgents] Agent deleted from utilisateurs table")
      console.warn("[AdminAgents] Note: Auth user still exists. To fully delete, use server-side function with service_role key.")

      showToast("Agent supprimé avec succès", "success")
      setShowDeleteDialog(false)
      setDeletingAgent(null)
      await fetchData()
    } catch (error) {
      console.error("[AdminAgents] Delete error:", error)
      showToast(error.message || "Erreur lors de la suppression", "error")
    }
  }

  const columns = [
    {
      key: "nom",
      label: "Nom",
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "centre_id",
      label: "Centre",
      render: (value) => centresMap[String(value)] || "-",
      sortable: true,
    },
    {
      key: "created_at",
      label: "Créé le",
      render: (value) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-"),
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

  if (!isAdmin) {
    return (
      <Card>
        <div style={restrictedContainer}>
          <FaUserFriends size={48} style={{ color: "#dc2626" }} />
          <h3>Accès réservé aux administrateurs</h3>
          <p>Votre rôle ne permet pas la gestion des agents.</p>
        </div>
      </Card>
    )
  }

  async function handleExportPDF() {
    if (agents.length === 0) {
      showToast("Aucun agent à exporter", "warning")
      return
    }

    setExportingPDF(true)
    try {
      const result = await exportAgentsPDF(agents, centres)
      
      // Log activity
      await logPDFExported(
        "Agents",
        `${result.count} agent${result.count > 1 ? "s" : ""} exported`,
        user?.id || null,
        user?.email || null,
      )
      
      showToast(`PDF exporté avec succès (${result.count} agent${result.count > 1 ? "s" : ""})`, "success")
    } catch (error) {
      console.error("[AdminAgents] PDF export error:", error)
      showToast("Erreur lors de l'export PDF: " + (error.message || "Erreur inconnue"), "error")
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div style={container}>
      <div style={header}>
        <div>
          <h2 style={title}>Gestion des Agents</h2>
          <p style={subtitle}>Gérer les agents assignés aux centres</p>
        </div>
        <div style={headerActions}>
          <Button
            variant="secondary"
            icon={<FaFilePdf />}
            onClick={handleExportPDF}
            disabled={exportingPDF || agents.length === 0}
          >
            {exportingPDF ? "Export..." : "Exporter PDF"}
          </Button>
          <Button variant="primary" icon={<FaPlus />} onClick={openCreateModal}>
            Ajouter un agent
          </Button>
        </div>
      </div>

      <Card>
        <Table
          data={agents}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher un agent..."
          searchFields={["nom", "email"]}
          sortable
          pagination
          pageSize={10}
          loading={loading}
          emptyMessage="Aucun agent enregistré"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetModal}
        title={editingAgent ? "Modifier l'agent" : "Nouvel agent"}
        size="md"
      >
        <div style={form}>
          <Input
            label="Nom complet"
            value={form.nom}
            onChange={(v) => {
              setForm({ ...form, nom: v })
              if (errors.nom) setErrors({ ...errors, nom: "" })
            }}
            error={errors.nom}
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => {
              setForm({ ...form, email: v })
              if (errors.email) setErrors({ ...errors, email: "" })
            }}
            error={errors.email}
            required
          />

          {!editingAgent && (
            <Input
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={(v) => {
                setForm({ ...form, password: v })
                if (errors.password) setErrors({ ...errors, password: "" })
              }}
              error={errors.password}
              required
            />
          )}

          <div>
            <label style={selectLabel}>
              Centre assigné <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={form.centre_id}
              onChange={(e) => {
                setForm({ ...form, centre_id: e.target.value })
                if (errors.centre_id) setErrors({ ...errors, centre_id: "" })
              }}
              style={{
                ...select,
                ...(errors.centre_id ? { borderColor: "#dc2626" } : {}),
              }}
            >
              <option value="">Sélectionner un centre</option>
              {centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.nom}
                </option>
              ))}
            </select>
            {errors.centre_id && <span style={errorText}>{errors.centre_id}</span>}
          </div>

          <div style={formActions}>
            <Button variant="secondary" onClick={resetModal} disabled={saving}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : editingAgent ? "Modifier" : "Créer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeletingAgent(null)
        }}
        onConfirm={handleDelete}
        title="Supprimer l'agent"
        message={`Êtes-vous sûr de vouloir supprimer l'agent "${deletingAgent?.nom || deletingAgent?.email}" ? Cette action est irréversible.`}
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
  gap: 32,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 20,
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

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const selectLabel = {
  display: "block",
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
}

const select = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  background: "white",
  color: "#111827",
  outline: "none",
  transition: "all 0.2s ease",
  minHeight: "44px",
}

const errorText = {
  fontSize: "12px",
  color: "#dc2626",
  marginTop: "4px",
  display: "block",
}

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
}

const restrictedContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
  textAlign: "center",
  gap: 16,
}
