import { useEffect, useState } from "react"
import { FaGear, FaUsersGear } from "react-icons/fa6"
import { supabase } from "./supabaseClient"

const INITIAL_PARAMS = {
  coop_nom: "",
  adresse: "",
  telephone: "",
  devise: "FCFA",
  unite_poids: "Kg",
  fuseau_horaire: "Africa/Abidjan",
  roles_disponibles: "ADMIN,AGENT,CENTRE",
}

export default function Parametres({ onOpenAdminUsers, isAdmin }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [formData, setFormData] = useState(INITIAL_PARAMS)

  useEffect(() => {
    fetchParametres()
  }, [])

  async function fetchParametres() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from("parametres")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") {
      setError(fetchError.message)
    }

    if (data) {
      setFormData((prev) => ({ ...prev, ...data }))
    }

    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    setError("")

    let response

    if (formData.id) {
      response = await supabase.from("parametres").update(formData).eq("id", formData.id)
    } else {
      response = await supabase.from("parametres").insert([formData])
    }

    if (response.error) {
      setError(response.error.message)
    } else {
      setMessage("Parametres enregistres")
    }

    setSaving(false)
  }

  if (loading) return <p>Chargement des parametres...</p>

  return (
    <div style={page}>
      <div style={pageHeader}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <FaGear /> Parametres
        </h2>
      </div>

      {message && <div style={successBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={handleSave} style={formLayout}>
        <Card title="Parametres generaux">
          <Field
            label="Nom de la cooperative"
            value={formData.coop_nom}
            onChange={(v) => setFormData((p) => ({ ...p, coop_nom: v }))}
          />
          <Field
            label="Adresse"
            value={formData.adresse}
            onChange={(v) => setFormData((p) => ({ ...p, adresse: v }))}
          />
          <Field
            label="Telephone"
            value={formData.telephone}
            onChange={(v) => setFormData((p) => ({ ...p, telephone: v }))}
          />
        </Card>

        <Card title="Parametres application">
          <Field
            label="Devise"
            value={formData.devise}
            onChange={(v) => setFormData((p) => ({ ...p, devise: v }))}
          />
          <Field
            label="Unite de poids"
            value={formData.unite_poids}
            onChange={(v) => setFormData((p) => ({ ...p, unite_poids: v }))}
          />
          <Field
            label="Fuseau horaire"
            value={formData.fuseau_horaire}
            onChange={(v) => setFormData((p) => ({ ...p, fuseau_horaire: v }))}
          />
        </Card>

        <Card title="Administration">
          <Field
            label="Roles autorises"
            value={formData.roles_disponibles}
            onChange={(v) => setFormData((p) => ({ ...p, roles_disponibles: v }))}
          />

          <div style={{ marginTop: 14 }}>
            {isAdmin ? (
              <button type="button" style={adminBtn} onClick={onOpenAdminUsers}>
                <FaUsersGear /> Gestion des utilisateurs
              </button>
            ) : (
              <p style={{ margin: 0, color: "#6b7280" }}>
                Section reservee aux administrateurs.
              </p>
            )}
          </div>
        </Card>

        <button type="submit" style={saveBtn}>
          {saving ? "Enregistrement..." : "Enregistrer les parametres"}
        </button>
      </form>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section style={card}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label style={field}>
      <span style={labelStyle}>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} style={input} />
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

const card = {
  background: "white",
  borderRadius: 14,
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
  padding: 18,
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
