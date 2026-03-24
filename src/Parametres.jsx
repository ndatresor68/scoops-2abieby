import { useEffect, useState } from "react"
import { FaCog, FaUsers, FaStore } from "react-icons/fa"
import { supabase } from "./supabaseClient"
import { useAuth } from "./context/AuthContext"
import { useSettings } from "./context/SettingsContext"
import { getUserRoleInfo } from "./utils/rolePermissions"
import Card from "./components/ui/Card"
import { useToast } from "./components/ui/Toast"

const INITIAL_PARAMS = {
  cooperative_name: "",
  address: "",
  contact_phone: "",
  contact_email: "",
  currency: "FCFA",
  default_language: "fr",
  export_format: "PDF",
  session_timeout_minutes: "30",
  default_user_role: "AGENT",
}

export default function Parametres({ onOpenAdminUsers, isAdmin }) {
  const { user } = useAuth()
  const { settings, loading: settingsLoading, updateSettings, refreshSettings } = useSettings()
  const { showToast } = useToast()
  const { isCentre, centreId } = getUserRoleInfo(user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingCentre, setSavingCentre] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [centreData, setCentreData] = useState(null)

  const [formData, setFormData] = useState(INITIAL_PARAMS)
  const [centreFormData, setCentreFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    ville: "",
  })

  useEffect(() => {
    if (isCentre && centreId) {
      fetchCentreData()
    }
  }, [isCentre, centreId])

  useEffect(() => {
    console.log("[Parametres] Settings context state:", { settings, settingsLoading })
    setFormData({
      cooperative_name: settings?.cooperative_name || INITIAL_PARAMS.cooperative_name,
      address: settings?.address || INITIAL_PARAMS.address,
      contact_phone: settings?.contact_phone || INITIAL_PARAMS.contact_phone,
      contact_email: settings?.contact_email || INITIAL_PARAMS.contact_email,
      currency: settings?.currency || INITIAL_PARAMS.currency,
      default_language: settings?.default_language || INITIAL_PARAMS.default_language,
      export_format: settings?.export_format || INITIAL_PARAMS.export_format,
      session_timeout_minutes: String(
        settings?.session_timeout_minutes ?? INITIAL_PARAMS.session_timeout_minutes
      ),
      default_user_role: settings?.default_user_role || INITIAL_PARAMS.default_user_role,
    })
    setLoading(settingsLoading)
  }, [settings, settingsLoading])

  async function fetchCentreData() {
    if (!centreId) return

    try {
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .eq("id", centreId)
        .single()

      if (error) {
        console.error("[Parametres] Error fetching centre:", error)
        return
      }

      if (data) {
        setCentreData(data)
        setCentreFormData({
          nom: data.nom || "",
          email: data.email || "",
          telephone: data.telephone || "",
          adresse: data.adresse || "",
          ville: data.ville || "",
        })
      }
    } catch (error) {
      console.error("[Parametres] Exception fetching centre:", error)
    }
  }

  async function handleSaveCentre(e) {
    e?.preventDefault?.()
    if (!centreId) return

    setSavingCentre(true)
    try {
      const { error } = await supabase
        .from("centres")
        .update(centreFormData)
        .eq("id", centreId)

      if (error) throw error

      showToast("Informations du centre mises à jour avec succès", "success")
      fetchCentreData()
    } catch (error) {
      console.error("[Parametres] Error updating centre:", error)
      showToast("Erreur lors de la mise à jour", "error")
    } finally {
      setSavingCentre(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const payload = {
        cooperative_name: formData.cooperative_name,
        address: formData.address,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        currency: formData.currency,
        default_language: formData.default_language,
        export_format: formData.export_format,
        session_timeout_minutes: Number(formData.session_timeout_minutes) || 30,
        default_user_role: formData.default_user_role,
      }

      console.log("[Parametres] Saving settings payload:", payload)
      await updateSettings(payload)
      await refreshSettings()
      setMessage("Paramètres enregistrés")
      showToast("Paramètres enregistrés avec succès", "success")
    } catch (saveError) {
      console.error("[Parametres] Save error:", saveError)
      setError(saveError.message || "Erreur lors de l'enregistrement des paramètres")
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Chargement des parametres...</p>

  return (
    <div style={page}>
      <div style={pageHeader}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <FaCog /> Parametres
        </h2>
      </div>

      {message && <div style={successBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={handleSave} style={formLayout}>
        <Card title="Parametres generaux">
          <Field
            label="Nom de la cooperative"
            value={formData.cooperative_name}
            onChange={(v) => setFormData((p) => ({ ...p, cooperative_name: v }))}
          />
          <Field
            label="Adresse"
            value={formData.address}
            onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
          />
          <Field
            label="Telephone"
            value={formData.contact_phone}
            onChange={(v) => setFormData((p) => ({ ...p, contact_phone: v }))}
          />
          <Field
            label="Email de contact"
            type="email"
            value={formData.contact_email}
            onChange={(v) => setFormData((p) => ({ ...p, contact_email: v }))}
          />
        </Card>

        <Card title="Parametres application">
          <Field
            label="Devise"
            value={formData.currency}
            onChange={(v) => setFormData((p) => ({ ...p, currency: v }))}
          />
          <Field
            label="Langue par défaut"
            value={formData.default_language}
            onChange={(v) => setFormData((p) => ({ ...p, default_language: v }))}
          />
          <Field
            label="Format d'export"
            value={formData.export_format}
            onChange={(v) => setFormData((p) => ({ ...p, export_format: v }))}
          />
          <Field
            label="Timeout session (minutes)"
            type="number"
            value={formData.session_timeout_minutes}
            onChange={(v) => setFormData((p) => ({ ...p, session_timeout_minutes: v }))}
          />
        </Card>

        {isCentre && centreData && (
          <Card title="Informations du Centre">
            <div>
              <Field
                label="Nom du centre"
                value={centreFormData.nom}
                onChange={(v) => setCentreFormData((p) => ({ ...p, nom: v }))}
              />
              <Field
                label="Email"
                type="email"
                value={centreFormData.email}
                onChange={(v) => setCentreFormData((p) => ({ ...p, email: v }))}
              />
              <Field
                label="Téléphone"
                value={centreFormData.telephone}
                onChange={(v) => setCentreFormData((p) => ({ ...p, telephone: v }))}
              />
              <Field
                label="Adresse"
                value={centreFormData.adresse}
                onChange={(v) => setCentreFormData((p) => ({ ...p, adresse: v }))}
              />
              <Field
                label="Ville"
                value={centreFormData.ville}
                onChange={(v) => setCentreFormData((p) => ({ ...p, ville: v }))}
              />
              <button type="button" onClick={handleSaveCentre} style={saveBtn} disabled={savingCentre}>
                {savingCentre ? "Enregistrement..." : "Enregistrer les informations du centre"}
              </button>
            </div>
          </Card>
        )}

        {isAdmin && (
          <Card title="Administration">
            <Field
              label="Rôle utilisateur par défaut"
              value={formData.default_user_role}
              onChange={(v) => setFormData((p) => ({ ...p, default_user_role: v }))}
            />

            <div style={{ marginTop: 14 }}>
              <button type="button" style={adminBtn} onClick={onOpenAdminUsers}>
                <FaUsers /> Gestion des utilisateurs
              </button>
            </div>
          </Card>
        )}

        <button type="submit" style={saveBtn}>
          {saving ? "Enregistrement..." : "Enregistrer les parametres"}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={field}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </label>
  )
}

const page = {
  maxWidth: 1050,
}

const pageHeader = {
  marginBottom: 18,
}

const formLayout = {
  display: "grid",
  gap: 16,
}

const field = {
  display: "grid",
  gap: 6,
  marginBottom: 12,
}

const labelStyle = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 600,
}

const input = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
}

const saveBtn = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 700,
  color: "white",
  background: "linear-gradient(90deg, #7a1f1f, #b02a2a)",
  cursor: "pointer",
}

const adminBtn = {
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 10,
  padding: "10px 14px",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 700,
}

const successBox = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#ecfdf3",
  color: "#166534",
}

const errorBox = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
}
