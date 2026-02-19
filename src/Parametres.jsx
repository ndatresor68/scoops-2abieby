import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

export default function Parametres() {

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchParametres()
  }, [])

  async function fetchParametres() {
    const { data } = await supabase
      .from("parametres")
      .select("*")
      .limit(1)
      .single()

    if (data) setFormData(data)

    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    let response

    if (formData.id) {
      response = await supabase
        .from("parametres")
        .update(formData)
        .eq("id", formData.id)
    } else {
      response = await supabase
        .from("parametres")
        .insert([formData])
    }

    if (!response.error && formData.historique_active) {
      await supabase.from("parametres_logs").insert([{
        parametre_id: formData.id,
        modification: formData,
      }])
    }

    if (response.error) {
      setMessage("❌ Erreur sauvegarde")
    } else {
      setMessage("✅ Paramètres sauvegardés")
    }

    setSaving(false)
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div style={{ maxWidth: 1000 }}>

      <h2 style={{ marginBottom: 30 }}>⚙️ Paramètres Administration</h2>

      {message && (
        <div style={{
          padding: 12,
          background: "#f1f5f9",
          borderRadius: 8,
          marginBottom: 20
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 30 }}>

        {/* ================= INFOS ENTREPRISE ================= */}

        <Section title="🏢 Informations entreprise">

          <Input label="Nom application"
            value={formData.mon_application}
            onChange={(v)=>setFormData({...formData, mon_application:v})}
          />

          <Input label="Adresse"
            value={formData.adresse}
            onChange={(v)=>setFormData({...formData, adresse:v})}
          />

          <Input label="Téléphone"
            value={formData.telephone}
            onChange={(v)=>setFormData({...formData, telephone:v})}
          />

          <Input label="Email"
            value={formData.email}
            onChange={(v)=>setFormData({...formData, email:v})}
          />

        </Section>

        {/* ================= SYSTEME ================= */}

        <Section title="⚙️ Paramètres système">

          <Select label="Thème"
            value={formData.theme}
            options={["clair", "sombre"]}
            onChange={(v)=>setFormData({...formData, theme:v})}
          />

          <Select label="Rôle par défaut"
            value={formData.role_par_defaut}
            options={["admin_principal","superviseur","operateur","lecture_seule"]}
            onChange={(v)=>setFormData({...formData, role_par_defaut:v})}
          />

          <Input label="Devise"
            value={formData.devise}
            onChange={(v)=>setFormData({...formData, devise:v})}
          />

          <Input label="Unité"
            value={formData.unite}
            onChange={(v)=>setFormData({...formData, unite:v})}
          />

          <Input label="Préfixe producteur"
            value={formData.prefix_producteur}
            onChange={(v)=>setFormData({...formData, prefix_producteur:v})}
          />

          <Input label="Numéro départ producteur"
            type="number"
            value={formData.numero_depart_producteur}
            onChange={(v)=>setFormData({...formData, numero_depart_producteur:Number(v)})}
          />

          <Input label="Préfixe centre"
            value={formData.prefixe_centre}
            onChange={(v)=>setFormData({...formData, prefixe_centre:v})}
          />

        </Section>

        {/* ================= STOCK ================= */}

        <Section title="📦 Paramètres stock">

          <Input label="Seuil alerte"
            type="number"
            value={formData.seuil_stock}
            onChange={(v)=>setFormData({...formData, seuil_stock:Number(v)})}
          />

          <Input label="Seuil critique"
            type="number"
            value={formData.seuil_critique}
            onChange={(v)=>setFormData({...formData, seuil_critique:Number(v)})}
          />

          <Toggle label="Activer alertes"
            value={formData.activer_alertes}
            onChange={(v)=>setFormData({...formData, activer_alertes:v})}
          />

        </Section>

        {/* ================= AVANCE ================= */}

        <Section title="🔒 Sécurité & Historique">

          <Toggle label="Activer historique modifications"
            value={formData.historique_active}
            onChange={(v)=>setFormData({...formData, historique_active:v})}
          />

          <Input label="Timeout session (minutes)"
            type="number"
            value={formData.session_timeout}
            onChange={(v)=>setFormData({...formData, session_timeout:Number(v)})}
          />

        </Section>

        <button type="submit" style={saveBtn}>
          {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
        </button>

      </form>

    </div>
  )
}

/* UI COMPONENTS */

function Section({ title, children }) {
  return (
    <div style={{
      background: "white",
      padding: 25,
      borderRadius: 12,
      boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
    }}>
      <h3 style={{ marginBottom: 20 }}>{title}</h3>
      {children}
    </div>
  )
}

function Input({ label, value, onChange, type="text" }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e)=>onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label>{label}</label>
      <select
        value={value || ""}
        onChange={(e)=>onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label>
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e)=>onChange(e.target.checked)}
        /> {label}
      </label>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 6,
  border: "1px solid #ccc",
  marginTop: 5
}

const saveBtn = {
  padding: 15,
  background: "#7a1f1f",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold"
}