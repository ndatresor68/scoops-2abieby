import { useEffect, useState, useMemo } from "react"
import { supabase } from "../../supabaseClient"
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUserShield,
  FaBan,
  FaCheckCircle,
  FaUserSlash,
  FaFilePdf,
  FaFileExcel,
  FaSearch,
  FaUserCheck,
} from "react-icons/fa"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../components/ui/Toast"
import Button from "../../components/ui/Button"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Input from "../../components/ui/Input"
import { exportUsersPDF } from "../../utils/exportToPDF"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import {
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logUserSuspended,
  logUserBanned,
  logUserReactivated,
} from "../../utils/activityLogger"
import { useSettings, useExportFormat, usePasswordPolicy } from "../../context/SettingsContext"
import { validatePassword } from "../../utils/passwordValidator"

const INITIAL_FORM = {
  nom: "",
  email: "",
  password: "",
  role: "AGENT",
  centre_id: "",
}

const STATUSES = {
  active: { label: "Actif", color: "#16a34a", bg: "#ecfdf3", border: "#86efac" },
  suspended: { label: "Suspendu", color: "#f59e0b", bg: "#fffbeb", border: "#fde047" },
  banned: { label: "Banni", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
}

const ROLES = ["ADMIN", "AGENT", "SUPERVISOR", "CENTRE"]

export default function AdminUsers() {
  const { isAdmin, user: currentUser } = useAuth()
  const { showToast } = useToast()
  const { settings } = useSettings()
  const exportFormat = useExportFormat()
  const passwordPolicy = usePasswordPolicy()
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  // Debug: Log when component mounts
  useEffect(() => {
    console.log("[AdminUsers] Component mounted, isAdmin:", isAdmin)
  }, [isAdmin])
  
  // Dynamic grid columns based on screen size
  const statsGridStyle = isMobile 
    ? { ...statsContainer, gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }
    : statsContainer

  const [users, setUsers] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)

  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [actionUser, setActionUser] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [exportingPDF, setExportingPDF] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [preview, setPreview] = useState("")

  useEffect(() => {
    console.log("[AdminUsers] useEffect triggered, isAdmin:", isAdmin)
    if (!isAdmin) {
      console.log("[AdminUsers] Not admin, skipping fetch")
      setLoading(false)
      return
    }
    console.log("[AdminUsers] Fetching data...")
    fetchData()
  }, [isAdmin])

  const centresMap = useMemo(
    () => Object.fromEntries(centres.map((c) => [String(c.id), c.nom])),
    [centres],
  )

  // Statistics
  const stats = useMemo(() => {
    const total = users.length
    // Handle cases where status column might not exist
    const active = users.filter((u) => {
      if (!u.hasOwnProperty("status")) return true // If status doesn't exist, consider active
      return u.status === "active" || !u.status
    }).length
    const suspended = users.filter((u) => u.status === "suspended").length
    const banned = users.filter((u) => u.status === "banned").length
    return { total, active, suspended, banned }
  }, [users])

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const term = searchTerm.toLowerCase()
    return users.filter(
      (u) =>
        u.nom?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term),
    )
  }, [users, searchTerm])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Use select("*") to get all available columns and avoid 400 errors
      const [{ data: usersData, error: usersError }, { data: centresData, error: centresError }] = await Promise.all([
        supabase
          .from("utilisateurs")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("centres").select("id,nom").order("nom"),
      ])

      if (usersError) {
        console.error("[AdminUsers] Error fetching users:", usersError)
        throw new Error(`Erreur lors du chargement des utilisateurs: ${usersError.message}`)
      }

      if (centresError) {
        console.warn("[AdminUsers] Error fetching centres:", centresError)
        // Centres error is not critical, continue with empty array
      }

      // Ensure users have default status if column doesn't exist
      const normalizedUsers = (usersData || []).map((user) => ({
        ...user,
        status: user.status || "active", // Default to active if status column doesn't exist
      }))

      setUsers(normalizedUsers)
      setCentres(centresData || [])
    } catch (error) {
      console.error("[AdminUsers] Error:", error)
      showToast("Erreur lors du chargement des utilisateurs", "error")
    } finally {
      setLoading(false)
    }
  }

  function normalizeRole(value) {
    const nextRole = String(value || "AGENT").trim().toUpperCase()
    return ROLES.includes(nextRole) ? nextRole : "AGENT"
  }

  function validateForm() {
    const newErrors = {}
    if (!form.nom.trim()) newErrors.nom = "Le nom est requis"
    if (!form.email.trim()) newErrors.email = "L'email est requis"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email invalide"
    }
    if (!editingUser && !form.password.trim()) {
      newErrors.password = "Le mot de passe est requis"
    }
    
    // Validate password against policy if provided
    if (form.password && passwordPolicy.enabled) {
      const validation = validatePassword(form.password, passwordPolicy)
      if (!validation.valid) {
        newErrors.password = validation.errors.join(", ")
      }
    } else if (form.password && form.password.length < 6) {
      // Fallback to basic validation if policy is disabled
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function resetModal() {
    setForm(INITIAL_FORM)
    setEditingUser(null)
    setErrors({})
    setPhotoFile(null)
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview)
    setPreview("")
    setShowModal(false)
  }

  function openCreateModal() {
    resetModal()
    setShowModal(true)
  }

  function openEditModal(target) {
    setEditingUser(target)
    setForm({
      nom: target.nom || "",
      email: target.email || "",
      password: "",
      role: normalizeRole(target.role),
      centre_id: target.centre_id ? String(target.centre_id) : "",
    })
    setPreview(target.avatar_url || "")
    setShowModal(true)
  }

  async function uploadAvatar(file, userId) {
    const extension = file.name.split(".").pop() || "jpg"
    const path = `users/${userId}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSaveUser() {
    if (!validateForm()) {
      showToast("Veuillez corriger les erreurs du formulaire", "error")
      return
    }

    setSaving(true)
    try {
      let avatarUrl = editingUser?.avatar_url || ""
      const role = normalizeRole(form.role)

      if (editingUser) {
        // Update existing user
        if (photoFile) {
          avatarUrl = await uploadAvatar(photoFile, editingUser.id)
        }

        const { error: updateError } = await supabase
          .from("utilisateurs")
          .update({
            nom: form.nom,
            email: form.email,
            role,
            centre_id: form.centre_id || null,
            avatar_url: avatarUrl || null,
          })
          .eq("id", editingUser.id)

        if (updateError) throw updateError

        // Log activity
        await logUserUpdated(currentUser?.id || null, form.nom, "Informations mises à jour")

        showToast("Utilisateur modifié avec succès", "success")
      } else {
        // Create new user
        if (!form.password) {
          throw new Error("Mot de passe requis pour créer un utilisateur")
        }

        // Create user in Supabase Auth using signUp (NOT admin.createUser - requires service_role)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.nom,
              role,
            },
          },
        })

        if (authError) {
          console.error("[AdminUsers] Auth signUp error:", authError)
          throw new Error(
            authError.message || "Erreur lors de la création du compte utilisateur. Vérifiez que l'email n'existe pas déjà.",
          )
        }

        const newAuthUser = authData?.user
        if (!newAuthUser?.id) {
          throw new Error("Création du compte impossible - aucun utilisateur retourné")
        }

        if (photoFile) {
          avatarUrl = await uploadAvatar(photoFile, newAuthUser.id)
        }

        // Insert into utilisateurs table
        // id is the PRIMARY KEY and must match auth.users.id
        // Build payload without status first, then add it if column exists
        const insertPayload = {
          id: newAuthUser.id, // id matches auth.users.id
          nom: form.nom,
          email: form.email,
          role,
          centre_id: form.centre_id || null,
          avatar_url: avatarUrl || null,
        }

        // Try to insert with status, but handle gracefully if column doesn't exist
        let insertedData
        let insertError
        
        const { data: dataWithStatus, error: errorWithStatus } = await supabase
          .from("utilisateurs")
          .insert([{ ...insertPayload, status: "active" }])
          .select()

        if (errorWithStatus && errorWithStatus.message?.includes("status")) {
          // If status column doesn't exist, try again without it
          console.warn("[AdminUsers] Status column doesn't exist, retrying without status")
          const { data: dataWithoutStatus, error: errorWithoutStatus } = await supabase
            .from("utilisateurs")
            .insert([insertPayload])
            .select()
          
          if (errorWithoutStatus) {
            console.error("[AdminUsers] Insert error:", errorWithoutStatus)
            throw new Error(`Erreur lors de la création du profil: ${errorWithoutStatus.message}`)
          }
          
          insertedData = dataWithoutStatus
        } else if (errorWithStatus) {
          console.error("[AdminUsers] Insert error:", errorWithStatus)
          throw new Error(`Erreur lors de la création du profil: ${errorWithStatus.message}`)
        } else {
          insertedData = dataWithStatus
        }

        console.log("[AdminUsers] User created successfully:", insertedData?.[0])
        
        // Log activity
        await logUserCreated(
          newAuthUser.id,
          form.nom,
          role,
          currentUser?.id || null,
          currentUser?.email || null,
        )
        
        showToast("Utilisateur créé avec succès", "success")
      }

      resetModal()
      await fetchData()
    } catch (error) {
      console.error("[AdminUsers] Save error:", error)
      showToast(error.message || "Erreur lors de la sauvegarde", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspendUser() {
    if (!actionUser) return

    setSaving(true)
    try {
      // Try to update status, but handle gracefully if column doesn't exist
      const { error, data } = await supabase
        .from("utilisateurs")
        .update({ status: "suspended" })
        .eq("id", actionUser.id)
        .select()

      if (error) {
        // If status column doesn't exist, log warning but continue
        if (error.message?.includes("column") && error.message?.includes("status")) {
          console.warn("[AdminUsers] Status column doesn't exist, skipping status update")
          showToast(`Utilisateur ${actionUser.nom} - Note: colonne status non disponible`, "warning")
        } else {
          throw error
        }
      }

      // Log activity
      await logUserSuspended(
        actionUser.id,
        actionUser.nom,
        currentUser?.id || null,
        currentUser?.email || null,
      )

      if (!error || !error.message?.includes("status")) {
        showToast(`Utilisateur ${actionUser.nom} suspendu`, "success")
      }
      setShowSuspendDialog(false)
      setActionUser(null)
      await fetchData()
    } catch (error) {
      console.error("[AdminUsers] Suspend error:", error)
      showToast(error.message || "Erreur lors de la suspension", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleBanUser() {
    if (!actionUser) return

    setSaving(true)
    try {
      // Try to update status, but handle gracefully if column doesn't exist
      const { error, data } = await supabase
        .from("utilisateurs")
        .update({ status: "banned" })
        .eq("id", actionUser.id)
        .select()

      if (error) {
        // If status column doesn't exist, log warning but continue
        if (error.message?.includes("column") && error.message?.includes("status")) {
          console.warn("[AdminUsers] Status column doesn't exist, skipping status update")
          showToast(`Utilisateur ${actionUser.nom} - Note: colonne status non disponible`, "warning")
        } else {
          throw error
        }
      }

      // Log activity
      await logUserBanned(
        actionUser.id,
        actionUser.nom,
        currentUser?.id || null,
        currentUser?.email || null,
      )

      if (!error || !error.message?.includes("status")) {
        showToast(`Utilisateur ${actionUser.nom} banni`, "success")
      }
      setShowBanDialog(false)
      setActionUser(null)
      await fetchData()
    } catch (error) {
      console.error("[AdminUsers] Ban error:", error)
      showToast(error.message || "Erreur lors du bannissement", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivateUser() {
    if (!actionUser) return

    setSaving(true)
    try {
      // Try to update status, but handle gracefully if column doesn't exist
      const { error, data } = await supabase
        .from("utilisateurs")
        .update({ status: "active" })
        .eq("id", actionUser.id)
        .select()

      if (error) {
        // If status column doesn't exist, log warning but continue
        if (error.message?.includes("column") && error.message?.includes("status")) {
          console.warn("[AdminUsers] Status column doesn't exist, skipping status update")
          showToast(`Utilisateur ${actionUser.nom} - Note: colonne status non disponible`, "warning")
        } else {
          throw error
        }
      }

      // Log activity
      await logUserReactivated(
        actionUser.id,
        actionUser.nom,
        currentUser?.id || null,
        currentUser?.email || null,
      )

      if (!error || !error.message?.includes("status")) {
        showToast(`Utilisateur ${actionUser.nom} réactivé`, "success")
      }
      setShowReactivateDialog(false)
      setActionUser(null)
      await fetchData()
    } catch (error) {
      console.error("[AdminUsers] Reactivate error:", error)
      showToast(error.message || "Erreur lors de la réactivation", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return

    setSaving(true)
    try {
      // Delete from utilisateurs table
      // Note: Cannot delete from auth.users from frontend - requires service_role
      // The auth user will remain but won't be able to login without a profile
      const { error: deleteTableError } = await supabase
        .from("utilisateurs")
        .delete()
        .eq("id", deletingUser.id)
        .select()

      if (deleteTableError) {
        console.error("[AdminUsers] Delete error:", deleteTableError)
        throw deleteTableError
      }

      console.log("[AdminUsers] User deleted from utilisateurs table")
      console.warn("[AdminUsers] Note: Auth user still exists. To fully delete, use server-side function with service_role key.")

      // Log activity
      await logUserDeleted(
        deletingUser.id,
        deletingUser.nom || deletingUser.email,
        currentUser?.id || null,
        currentUser?.email || null,
      )

      showToast("Utilisateur supprimé avec succès", "success")
      setShowDeleteDialog(false)
      setDeletingUser(null)
      await fetchData()
    } catch (error) {
      console.error("[AdminUsers] Delete error:", error)
      showToast(error.message || "Erreur lors de la suppression", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleExportPDF() {
    if (users.length === 0) {
      showToast("Aucun utilisateur à exporter", "warning")
      return
    }

    setExportingPDF(true)
    try {
      let result
      
      if (exportFormat === "EXCEL") {
        // Export to Excel
        result = await exportUsersToExcel(users, centres)
        
        // Log activity
        await logPDFExported(
          "Utilisateurs",
          `${result.count} utilisateur${result.count > 1 ? "s" : ""} exported to Excel`,
          currentUser?.id || null,
          currentUser?.email || null,
        )
        
        showToast(`Excel exporté avec succès (${result.count} utilisateur${result.count > 1 ? "s" : ""})`, "success")
      } else {
        // Export to PDF (default)
        result = await exportUsersPDF(users, centres)
        
        // Log activity
        await logPDFExported(
          "Utilisateurs",
          `${result.count} utilisateur${result.count > 1 ? "s" : ""} exported to PDF`,
          currentUser?.id || null,
          currentUser?.email || null,
        )
        
        showToast(`PDF exporté avec succès (${result.count} utilisateur${result.count > 1 ? "s" : ""})`, "success")
      }
    } catch (error) {
      console.error("[AdminUsers] PDF export error:", error)
      showToast("Erreur lors de l'export PDF: " + (error.message || "Erreur inconnue"), "error")
    } finally {
      setExportingPDF(false)
    }
  }

  function getStatusBadge(status) {
    const statusData = STATUSES[status] || STATUSES.active
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          background: statusData.bg,
          color: statusData.color,
          border: `1px solid ${statusData.border}`,
        }}
      >
        {statusData.label}
      </span>
    )
  }

  function canModifyUser(targetUser) {
    // Prevent self-modification of critical actions
    if (currentUser?.id === targetUser.id) {
      return false
    }
    // Prevent modifying other admins
    if (targetUser.role === "ADMIN" && currentUser?.role !== "ADMIN") {
      return false
    }
    return true
  }

  if (!isAdmin) {
    return (
      <div style={restrictedCard}>
        <FaUserShield size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1f2937" }}>
          Accès réservé aux administrateurs
        </h3>
        <p style={{ margin: 0, color: "#6b7280" }}>Votre rôle ne permet pas la gestion des utilisateurs.</p>
      </div>
    )
  }

  return (
    <div style={container}>
      {/* Statistics Cards */}
      <div style={statsGridStyle}>
        <div style={statCard}>
          <div style={statIcon} style={{ background: "#eff6ff", color: "#2563eb" }}>
            <FaUserShield />
          </div>
          <div>
            <div style={statValue}>{stats.total}</div>
            <div style={statLabel}>Total utilisateurs</div>
          </div>
        </div>
        <div style={statCard}>
          <div style={statIcon} style={{ background: "#ecfdf3", color: "#16a34a" }}>
            <FaCheckCircle />
          </div>
          <div>
            <div style={statValue}>{stats.active}</div>
            <div style={statLabel}>Actifs</div>
          </div>
        </div>
        <div style={statCard}>
          <div style={statIcon} style={{ background: "#fffbeb", color: "#f59e0b" }}>
            <FaUserSlash />
          </div>
          <div>
            <div style={statValue}>{stats.suspended}</div>
            <div style={statLabel}>Suspendus</div>
          </div>
        </div>
        <div style={statCard}>
          <div style={statIcon} style={{ background: "#fef2f2", color: "#dc2626" }}>
            <FaBan />
          </div>
          <div>
            <div style={statValue}>{stats.banned}</div>
            <div style={statLabel}>Bannis</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={header}>
        <div>
          <h2 style={title}>Gestion des Utilisateurs</h2>
          <p style={subtitle}>Gérez les utilisateurs, leurs rôles et leurs statuts</p>
        </div>
        <div style={headerActions}>
          <Button variant="secondary" icon={<FaFilePdf />} onClick={handleExportPDF} disabled={exportingPDF}>
            {exportingPDF ? "Export..." : "Exporter PDF"}
          </Button>
          <Button variant="primary" icon={<FaPlus />} onClick={openCreateModal}>
            Créer un utilisateur
          </Button>
        </div>
      </div>

      {/* Search */}
      <div style={searchContainer}>
        <div style={searchWrapper}>
          <FaSearch style={{ color: "#9ca3af", fontSize: 18 }} />
          <Input
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            style={{ border: "none", background: "transparent", flex: 1 }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={tableCard}>
        {loading ? (
          <div style={loadingState}>
            <div style={spinner}></div>
            <p>Chargement...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={emptyState}>
            <FaUserShield size={48} style={{ color: "#9ca3af", marginBottom: 16 }} />
            <p style={{ margin: 0, color: "#6b7280" }}>
              {searchTerm ? "Aucun utilisateur trouvé" : "Aucun utilisateur enregistré"}
            </p>
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Avatar</th>
                <th style={th}>Nom</th>
                <th style={th}>Email</th>
                <th style={th}>Rôle</th>
                <th style={th}>Statut</th>
                <th style={th}>Centre</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.nom} style={avatar} />
                    ) : (
                      <div style={avatarFallback}>{(u.nom || "U").slice(0, 1).toUpperCase()}</div>
                    )}
                  </td>
                  <td style={td}>
                    <strong style={nameText}>{u.nom}</strong>
                  </td>
                  <td style={td}>
                    <span style={emailText}>{u.email}</span>
                  </td>
                  <td style={td}>
                    <span style={roleBadge}>{u.role}</span>
                  </td>
                  <td style={td}>{getStatusBadge(u.status || "active")}</td>
                  <td style={td}>
                    <span style={centreText}>{centresMap[String(u.centre_id)] || "-"}</span>
                  </td>
                  <td style={td}>
                    <div style={actions}>
                      <button
                        type="button"
                        style={{
                          ...actionBtn,
                          opacity: !canModifyUser(u) ? 0.5 : 1,
                          cursor: !canModifyUser(u) ? "not-allowed" : "pointer",
                        }}
                        onClick={() => {
                          if (canModifyUser(u)) openEditModal(u)
                        }}
                        title="Modifier"
                        disabled={!canModifyUser(u)}
                      >
                        <FaEdit />
                      </button>
                      {u.status === "active" || !u.status ? (
                        <button
                          type="button"
                          style={{
                            ...actionBtn,
                            ...suspendBtn,
                            opacity: !canModifyUser(u) ? 0.5 : 1,
                            cursor: !canModifyUser(u) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (canModifyUser(u)) {
                              setActionUser(u)
                              setShowSuspendDialog(true)
                            }
                          }}
                          title="Suspendre"
                          disabled={!canModifyUser(u)}
                        >
                          <FaUserSlash />
                        </button>
                      ) : u.status === "suspended" ? (
                        <button
                          type="button"
                          style={{
                            ...actionBtn,
                            ...reactivateBtn,
                            opacity: !canModifyUser(u) ? 0.5 : 1,
                            cursor: !canModifyUser(u) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (canModifyUser(u)) {
                              setActionUser(u)
                              setShowReactivateDialog(true)
                            }
                          }}
                          title="Réactiver"
                          disabled={!canModifyUser(u)}
                        >
                          <FaUserCheck />
                        </button>
                      ) : null}
                      {u.status !== "banned" && (
                        <button
                          type="button"
                          style={{
                            ...actionBtn,
                            ...banBtn,
                            opacity: !canModifyUser(u) ? 0.5 : 1,
                            cursor: !canModifyUser(u) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (canModifyUser(u)) {
                              setActionUser(u)
                              setShowBanDialog(true)
                            }
                          }}
                          title="Bannir"
                          disabled={!canModifyUser(u)}
                        >
                          <FaBan />
                        </button>
                      )}
                      <button
                        type="button"
                        style={{
                          ...actionBtn,
                          ...deleteBtn,
                          opacity: !canModifyUser(u) ? 0.5 : 1,
                          cursor: !canModifyUser(u) ? "not-allowed" : "pointer",
                        }}
                        onClick={() => {
                          if (canModifyUser(u)) {
                            setDeletingUser(u)
                            setShowDeleteDialog(true)
                          }
                        }}
                        title="Supprimer"
                        disabled={!canModifyUser(u)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={resetModal} title={editingUser ? "Modifier utilisateur" : "Nouvel utilisateur"}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveUser()
          }}
          style={modalContent}
        >
          <div style={formGroup}>
            <Input
              label="Nom *"
              value={form.nom}
              onChange={(value) => setForm({ ...form, nom: value })}
              placeholder="Nom complet"
              required
              error={errors.nom}
              disabled={saving}
            />
          </div>

          <div style={formGroup}>
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              placeholder="email@example.com"
              required
              error={errors.email}
              disabled={saving}
            />
          </div>

          {!editingUser && (
            <div style={formGroup}>
              <Input
                label="Mot de passe *"
                type="password"
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                placeholder="Minimum 6 caractères"
                required
                error={errors.password}
                disabled={saving}
              />
            </div>
          )}

          <div style={formGroup}>
            <label style={label}>Rôle *</label>
            <select
              value={form.role}
              onChange={(e) => {
                const newRole = normalizeRole(e.target.value)
                setForm({ ...form, role: newRole })
              }}
              style={select}
              disabled={saving}
              required
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div style={formGroup}>
            <label style={label}>Centre associé</label>
            <select
              value={form.centre_id}
              onChange={(e) => setForm({ ...form, centre_id: e.target.value })}
              style={select}
              disabled={saving}
            >
              <option value="">Aucun</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={formGroup}>
            <label style={label}>Photo de profil</label>
            <div style={photoUpload}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById("avatar-input")?.click()}
                style={{ marginBottom: 12 }}
                disabled={saving}
              >
                Choisir une photo
              </Button>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setPhotoFile(file)
                  if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview)
                  setPreview(URL.createObjectURL(file))
                }}
                disabled={saving}
              />
              {preview && <img src={preview} alt="preview" style={previewImg} />}
            </div>
          </div>

          <div style={modalFooter}>
            <Button type="button" variant="secondary" onClick={resetModal} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeletingUser(null)
        }}
        onConfirm={handleDeleteUser}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer ${deletingUser?.nom || deletingUser?.email} ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        loading={saving}
      />

      {/* Suspend Dialog */}
      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => {
          setShowSuspendDialog(false)
          setActionUser(null)
        }}
        onConfirm={handleSuspendUser}
        title="Suspendre l'utilisateur"
        message={`Suspendre ${actionUser?.nom || actionUser?.email} ? L'utilisateur ne pourra plus se connecter.`}
        type="warning"
        confirmText="Suspendre"
        loading={saving}
      />

      {/* Ban Dialog */}
      <ConfirmDialog
        isOpen={showBanDialog}
        onClose={() => {
          setShowBanDialog(false)
          setActionUser(null)
        }}
        onConfirm={handleBanUser}
        title="Bannir l'utilisateur"
        message={`Bannir définitivement ${actionUser?.nom || actionUser?.email} ? Cette action est irréversible.`}
        type="danger"
        confirmText="Bannir"
        loading={saving}
      />

      {/* Reactivate Dialog */}
      <ConfirmDialog
        isOpen={showReactivateDialog}
        onClose={() => {
          setShowReactivateDialog(false)
          setActionUser(null)
        }}
        onConfirm={handleReactivateUser}
        title="Réactiver l'utilisateur"
        message={`Réactiver ${actionUser?.nom || actionUser?.email} ? L'utilisateur pourra à nouveau se connecter.`}
        type="info"
        confirmText="Réactiver"
        loading={saving}
      />
    </div>
  )
}

// Styles
const container = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
}

const statsContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
}

const statCard = {
  background: "white",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  border: "1px solid rgba(0,0,0,0.04)",
  display: "flex",
  alignItems: "center",
  gap: 16,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
}

const statIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
}

const statValue = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#1f2937",
  lineHeight: 1.2,
}

const statLabel = {
  fontSize: "13px",
  color: "#6b7280",
  marginTop: 4,
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
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

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
}

const searchContainer = {
  background: "white",
  borderRadius: "16px",
  padding: "16px 20px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  border: "1px solid rgba(0,0,0,0.04)",
}

const searchWrapper = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const tableCard = {
  background: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  border: "1px solid rgba(0,0,0,0.04)",
  overflow: "hidden",
}

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const th = {
  textAlign: "left",
  padding: "16px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
}

const td = {
  padding: "16px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
}

const avatar = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  objectFit: "cover",
}

const avatarFallback = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f5d6d6",
  color: "#7a1f1f",
  fontWeight: 700,
  fontSize: "16px",
}

const nameText = {
  color: "#1f2937",
  fontWeight: 600,
}

const emailText = {
  color: "#6b7280",
}

const roleBadge = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  background: "#eff6ff",
  color: "#2563eb",
}

const centreText = {
  color: "#6b7280",
}

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
}

const actionBtn = {
  border: "none",
  background: "#f3f4f6",
  borderRadius: "8px",
  padding: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  color: "#6b7280",
  transition: "all 0.2s ease",
  minWidth: "32px",
  minHeight: "32px",
}

// Add hover effects
const actionBtnHover = {
  background: "#e5e7eb",
  transform: "translateY(-1px)",
}

const suspendBtn = {
  background: "#fffbeb",
  color: "#f59e0b",
}

const banBtn = {
  background: "#fef2f2",
  color: "#dc2626",
}

const reactivateBtn = {
  background: "#ecfdf3",
  color: "#16a34a",
}

const deleteBtn = {
  background: "#fef2f2",
  color: "#dc2626",
}

const loadingState = {
  padding: "60px 20px",
  textAlign: "center",
  color: "#6b7280",
}

const spinner = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f4f6",
  borderTop: "4px solid #7a1f1f",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 16px",
}

const emptyState = {
  padding: "60px 20px",
  textAlign: "center",
}

const restrictedCard = {
  background: "white",
  borderRadius: "14px",
  boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
  padding: "40px",
  maxWidth: "520px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
}

const modalContent = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const formGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const label = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
}

const errorText = {
  fontSize: "12px",
  color: "#dc2626",
}

const select = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  background: "white",
  color: "#1f2937",
}

const photoUpload = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const previewImg = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #e5e7eb",
}

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  paddingTop: "20px",
  borderTop: "1px solid #f3f4f6",
}
