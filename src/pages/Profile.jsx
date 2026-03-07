import { useEffect, useMemo, useRef, useState } from "react"
import { FaCamera, FaFloppyDisk, FaPenToSquare } from "react-icons/fa6"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

function getInitialForm(user) {
  const metadata = user?.user_metadata || {}
  const appMeta = user?.app_metadata || {}

  return {
    nom:
      metadata.full_name ||
      metadata.name ||
      metadata.nom ||
      user?.email?.split("@")[0] ||
      "",
    email: user?.email || "",
    role: metadata.role || appMeta.role || "",
    photo:
      metadata.avatar_url ||
      metadata.photo_url ||
      metadata.photo_profil ||
      "",
  }
}

export default function Profile() {
  const { user, refreshUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [form, setForm] = useState(getInitialForm(user))
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProfile()
  }, [user?.id])

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
    let nextForm = getInitialForm(authUser)

    const { data: rowData } = await supabase
      .from("utilisateurs")
      .select("nom,email,role,avatar_url,photo_profil")
      .eq("id", authUser.id)
      .maybeSingle()

    if (rowData) {
      nextForm = {
        ...nextForm,
        nom: rowData.nom || nextForm.nom,
        email: rowData.email || nextForm.email,
        role: rowData.role || nextForm.role,
        photo: rowData.avatar_url || rowData.photo_profil || nextForm.photo,
      }
    }

    setForm(nextForm)
    setLoading(false)
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
          user_id: user.id,
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

          <div style={actions}>
            <button style={secondaryBtn} onClick={() => setIsEditing((v) => !v)}>
              <FaPenToSquare /> {isEditing ? "Annuler" : "Modifier profil"}
            </button>

            <button style={primaryBtn} onClick={handleSave} disabled={saving}>
              <FaFloppyDisk /> {saving ? "Enregistrement..." : "Enregistrer"}
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
