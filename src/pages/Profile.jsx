import { useEffect, useMemo, useRef, useState } from "react"
import { FaCamera, FaSave, FaEdit, FaMobileAlt, FaShieldAlt } from "react-icons/fa"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { listUserSessions, revokeOtherSessions } from "../services/deviceSessionService"

function getInitialForm(user) {
  // ALWAYS use user data (which includes merged profile data from utilisateurs table)
  return {
    nom: user?.nom || user?.email?.split("@")[0] || "",
    email: user?.email || "",
    // Role is ALWAYS from user.role (merged from utilisateurs table)
    role: user?.role || "",
    photo: user?.avatar_url || "",
  }
}

export default function Profile({ initialEditMode = false }) {
  const { user, role, refreshUser, deviceId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(initialEditMode)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState(getInitialForm(user))
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [sessions, setSessions] = useState([])
  const [revokingSessions, setRevokingSessions] = useState(false)

  const fileInputRef = useRef(null)

  // Update edit mode when prop changes
  useEffect(() => {
    setIsEditing(initialEditMode)
  }, [initialEditMode])

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  const avatarToShow = useMemo(() => previewUrl || form.photo || "", [previewUrl, form.photo])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function fetchProfile() {
    setLoading(true)
    setError("")

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) {
      setError("Impossible de charger le profil utilisateur")
      setLoading(false)
      return
    }

    const authUser = authData.user
    
    // Use user from AuthContext (which has merged profile data including role and nom)
    // If not available, use authUser directly
    const userWithProfile = user || authUser

    // ALWAYS use data from user (which includes merged profile data from utilisateurs table)
    const nextForm = getInitialForm(userWithProfile)

    setForm(nextForm)
    if (authUser?.id) {
      try {
        const sessionRows = await listUserSessions(authUser.id)
        setSessions(sessionRows)
      } catch {
        setSessions([])
      }
    }
    setLoading(false)
  }

  async function handleRevokeOtherSessions() {
    if (!user?.id) return

    setRevokingSessions(true)
    setError("")
    setMessage("")

    try {
      const result = await revokeOtherSessions(user.id)
      setMessage(
        result.count > 0
          ? `${result.count} autre(s) session(s) fermée(s)`
          : "Aucune autre session active à fermer",
      )
      const sessionRows = await listUserSessions(user.id)
      setSessions(sessionRows)
    } catch (err) {
      setError(err.message || "Impossible de fermer les autres sessions")
    } finally {
      setRevokingSessions(false)
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileSelect(event) {
    const selected = event.target.files?.[0]
    if (!selected) return

    setFile(selected)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(selected))
    setMessage("")
    setError("")
  }

  async function uploadProfilePhoto(targetFile) {
    const extension = targetFile.name.split(".").pop() || "jpg"
    const path = `${user.id}/avatar-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, targetFile, { upsert: true })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path)
    return publicUrlData.publicUrl
  }

  async function saveToUtilisateurs(payload) {
    const primaryAttempt = await supabase
      .from("utilisateurs")
      .upsert([
        {
          id: user.id,
          nom: payload.nom,
          email: payload.email,
          role: payload.role || null,
          avatar_url: payload.photo || null,
          photo_profil: payload.photo || null,
          updated_at: new Date().toISOString(),
        },
      ])

    if (!primaryAttempt.error) return

    await supabase
      .from("utilisateurs")
      .upsert([
        {
          id: user.id, // id is PRIMARY KEY and matches auth.users.id
          nom: payload.nom,
          email: payload.email,
          role: payload.role || null,
          avatar_url: payload.photo || null,
          photo_profil: payload.photo || null,
          updated_at: new Date().toISOString(),
        },
      ])
  }

  async function handleSave() {
    if (!user) return

    setSaving(true)
    setMessage("")
    setError("")

    try {
      let finalPhotoUrl = form.photo

      if (file) {
        setUploading(true)
        finalPhotoUrl = await uploadProfilePhoto(file)
        setUploading(false)
      }

      const metadataPayload = {
        full_name: form.nom,
        role: form.role || null,
        avatar_url: finalPhotoUrl || null,
      }

      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: metadataPayload,
      })

      if (updateAuthError) {
        throw new Error(updateAuthError.message)
      }

      await saveToUtilisateurs({ ...form, photo: finalPhotoUrl })

      setForm((prev) => ({ ...prev, photo: finalPhotoUrl }))
      setFile(null)
      setPreviewUrl("")
      setIsEditing(false)
      setMessage("Profil mis a jour")
      await refreshUser()
    } catch (err) {
      setError(err.message || "Erreur lors de la mise a jour du profil")
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (loading) {
    return <div style={stateBox}>Chargement du profil...</div>
  }

  return (
    <section style={wrapper}>
      <div style={profileCard}>
        <div style={avatarSection}>
          <div style={avatarContainer}>
            {avatarToShow ? (
              <img src={avatarToShow} alt="Avatar" style={avatarImage} />
            ) : (
              <div style={avatarPlaceholder}>{(form.nom || "U").slice(0, 1).toUpperCase()}</div>
            )}
          </div>

          <button style={secondaryBtn} onClick={() => fileInputRef.current?.click()}>
            <FaCamera /> Changer photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {uploading && <small style={{ color: "#6b7280" }}>Upload en cours...</small>}
        </div>

        <div style={contentSection}>
          <h2 style={title}>Profil Utilisateur</h2>

          {message && <div style={successBox}>{message}</div>}
          {error && <div style={errorBox}>{error}</div>}

          <div style={grid}>
            <Field
              label="Nom"
              value={form.nom}
              disabled={!isEditing}
              onChange={(v) => handleChange("nom", v)}
            />
            <Field
              label="Email"
              value={form.email}
              disabled
              onChange={(v) => handleChange("email", v)}
            />
            <Field
              label="Role"
              value={form.role}
              disabled={!isEditing}
              onChange={(v) => handleChange("role", v)}
              placeholder="Ex: administrateur"
            />
          </div>

          <div style={securityPanel}>
            <div style={securityHeader}>
              <FaShieldAlt />
              <span>Sécurité de session</span>
            </div>
            <div style={sessionCard}>
              <div style={sessionLine}>
                <FaMobileAlt />
                <span>Appareil actuel</span>
              </div>
              <code style={sessionCode}>{deviceId || "indisponible"}</code>
            </div>
            <div style={sessionsList}>
              {sessions.map((session) => (
                <div key={session.id || session.device_id} style={sessionItem}>
                  <div>
                    <strong>{session.current_device ? "Cet appareil" : "Autre appareil"}</strong>
                    <div style={sessionMeta}>
                      {session.status || "active"} · Dernière activité:{" "}
                      {session.last_active ? new Date(session.last_active).toLocaleString("fr-FR") : "-"}
                    </div>
                  </div>
                  <span style={sessionBadge(session.current_device)}>
                    {session.current_device ? "Courant" : session.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
              ))}
            </div>
            <div style={securityActions}>
              <button style={dangerBtn} onClick={handleRevokeOtherSessions} disabled={revokingSessions}>
                {revokingSessions ? "Fermeture..." : "Fermer les autres sessions"}
              </button>
            </div>
          </div>

          <div style={actions}>
            <button style={secondaryBtn} onClick={() => setIsEditing((v) => !v)}>
              <FaEdit /> {isEditing ? "Annuler" : "Modifier profil"}
            </button>

            <button style={primaryBtn} onClick={handleSave} disabled={saving}>
              <FaSave /> {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, disabled, placeholder }) {
  return (
    <label style={fieldWrapper}>
      <span style={fieldLabel}>{label}</span>
      <input
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...fieldInput, ...(disabled ? fieldInputDisabled : {}) }}
      />
    </label>
  )
}

const wrapper = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  padding: "16px 8px",
}

const profileCard = {
  width: "100%",
  maxWidth: 980,
  borderRadius: 20,
  background: "#ffffff",
  boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
  padding: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 26,
}

const avatarSection = {
  background: "linear-gradient(180deg, #fafafa 0%, #f6f7fb 100%)",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
}

const avatarContainer = {
  width: 160,
  height: 160,
  borderRadius: "50%",
  overflow: "hidden",
  border: "5px solid #ffffff",
  boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
}

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

const avatarPlaceholder = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontSize: 56,
  fontWeight: 700,
  color: "#7a1f1f",
  background: "linear-gradient(135deg, #fce7e7 0%, #f8d7d7 100%)",
}

const contentSection = {
  display: "flex",
  flexDirection: "column",
}

const title = {
  marginTop: 0,
  marginBottom: 18,
  color: "#1f2937",
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
}

const fieldWrapper = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const fieldLabel = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 600,
}

const fieldInput = {
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  outline: "none",
}

const fieldInputDisabled = {
  background: "#f8fafc",
  color: "#6b7280",
}

const actions = {
  marginTop: 18,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
}

const securityPanel = {
  marginTop: 22,
  display: "grid",
  gap: 12,
  padding: 18,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
}

const securityHeader = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
  color: "#0f172a",
}

const sessionCard = {
  display: "grid",
  gap: 8,
}

const sessionLine = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#334155",
  fontWeight: 600,
}

const sessionCode = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "#e2e8f0",
  color: "#0f172a",
  fontSize: 12,
  overflowX: "auto",
}

const sessionsList = {
  display: "grid",
  gap: 10,
}

const sessionItem = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #e5e7eb",
}

const sessionMeta = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
}

const sessionBadge = (current) => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: current ? "rgba(59,130,246,0.12)" : "rgba(148,163,184,0.14)",
  color: current ? "#1d4ed8" : "#475569",
})

const securityActions = {
  display: "flex",
  justifyContent: "flex-start",
}

const dangerBtn = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
  color: "white",
  cursor: "pointer",
}

const primaryBtn = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
  color: "white",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
}

const secondaryBtn = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 16px",
  background: "white",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
}

const successBox = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#ecfdf3",
  color: "#166534",
  border: "1px solid #86efac",
}

const errorBox = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fca5a5",
}

const stateBox = {
  background: "white",
  borderRadius: 14,
  boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
  padding: 20,
}
