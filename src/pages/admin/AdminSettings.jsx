import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import Card from "../../components/ui/Card"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"

export default function AdminSettings() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    appName: "SCOOPS",
    cooperativeName: "SCOOP ASAB-COOP-CA",
    cooperativeMotto: "Union • Discipline • Travail",
    contactEmail: "",
    contactPhone: "",
    address: "",
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      // In a real app, you'd fetch from a settings table
      // For now, we'll use localStorage or default values
      const saved = localStorage.getItem("scoops_settings")
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      console.error("[AdminSettings] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      // Save to localStorage (in production, save to database)
      localStorage.setItem("scoops_settings", JSON.stringify(settings))
      showToast("Paramètres enregistrés avec succès", "success")
    } catch (error) {
      console.error("[AdminSettings] Save error:", error)
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
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

  return (
    <div style={container}>
      <Card title="Paramètres de l'Application">
        <div style={form}>
          <h3 style={sectionTitle}>Informations Générales</h3>
          <Input
            label="Nom de l'application"
            value={settings.appName}
            onChange={(v) => setSettings({ ...settings, appName: v })}
            placeholder="SCOOPS"
          />
          <Input
            label="Nom de la coopérative"
            value={settings.cooperativeName}
            onChange={(v) => setSettings({ ...settings, cooperativeName: v })}
            placeholder="SCOOP ASAB-COOP-CA"
          />
          <Input
            label="Devise"
            value={settings.cooperativeMotto}
            onChange={(v) => setSettings({ ...settings, cooperativeMotto: v })}
            placeholder="Union • Discipline • Travail"
          />
        </div>
      </Card>

      <Card title="Informations de Contact">
        <div style={form}>
          <Input
            label="Email de contact"
            type="email"
            value={settings.contactEmail}
            onChange={(v) => setSettings({ ...settings, contactEmail: v })}
            placeholder="contact@cooperative.ci"
          />
          <Input
            label="Téléphone"
            value={settings.contactPhone}
            onChange={(v) => setSettings({ ...settings, contactPhone: v })}
            placeholder="+225 XX XX XX XX XX"
          />
          <Input
            label="Adresse"
            value={settings.address}
            onChange={(v) => setSettings({ ...settings, address: v })}
            placeholder="Adresse complète de la coopérative"
          />
        </div>
      </Card>

      <div style={actions}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  )
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
}

const sectionTitle = {
  margin: "0 0 16px 0",
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
}

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 8,
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
