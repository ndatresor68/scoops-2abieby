import { useEffect, useState } from "react"
import { supabase } from "../../supabaseClient"
import {
  FaCog,
  FaUsers,
  FaDatabase,
  FaShieldAlt,
  FaSave,
  FaUndo,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaLanguage,
  FaDollarSign,
  FaBell,
  FaCloudUploadAlt,
  FaHistory,
  FaClock,
  FaLock,
  FaUserPlus,
  FaUserShield,
  FaKey,
  FaBan,
  FaFileExport,
  FaFilePdf,
  FaTrash,
  FaImage,
} from "react-icons/fa"
import Card from "../../components/ui/Card"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import { useSettings } from "../../context/SettingsContext"
import ImageUpload from "../../components/ImageUpload"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { logActivity } from "../../utils/activityLogger"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { setLanguage } from "../../utils/i18n"

const SECTIONS = {
  general: { id: "general", label: "Général", icon: FaBuilding },
  system: { id: "system", label: "Système", icon: FaCog },
  users: { id: "users", label: "Utilisateurs", icon: FaUsers },
  data: { id: "data", label: "Données", icon: FaDatabase },
}

const DEFAULT_SETTINGS = {
  // General Settings
  cooperative_name: "SCOOP ASAB-COOP-CA",
  cooperative_motto: "Union • Discipline • Travail",
  logo_url: "",
  address: "",
  contact_phone: "",
  contact_email: "",
  default_language: "fr",
  currency: "FCFA",
  
  // System Settings
  notifications_enabled: true,
  automatic_backups: true,
  activity_logging: true,
  session_timeout_minutes: 30,
  security_two_factor: false,
  security_password_min_length: 8,
  
  // User Management Settings
  allow_user_registration: false,
  default_user_role: "AGENT",
  password_policy_enabled: true,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_special_chars: false,
  account_suspension_after_failed_logins: 5,
  account_suspension_duration_hours: 24,
  
  // Data Settings
  export_format: "PDF",
  pdf_export_layout: "landscape",
  data_retention_days: 365,
  auto_export_enabled: false,
  auto_export_frequency: "monthly",
}

export default function AdminSettings() {
  const { showToast } = useToast()
  const { isAdmin, user } = useAuth()
  const { settings: globalSettings, updateSettings: updateGlobalSettings, refreshSettings } = useSettings()
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState("general")
  const [settings, setSettings] = useState(globalSettings || DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState(globalSettings || DEFAULT_SETTINGS)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")

  // Sync with global settings when they change
  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings)
      setOriginalSettings(globalSettings)
      if (globalSettings.logo_url) {
        setLogoPreview(globalSettings.logo_url)
      }
      setLoading(false)
    }
  }, [globalSettings])

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    if (!globalSettings || Object.keys(globalSettings).length === 0) {
      fetchSettings()
    }
  }, [isAdmin, globalSettings])

  async function fetchSettings() {
    try {
      setLoading(true)
      console.log("[AdminSettings] Fetching settings from database...")

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        console.error("[AdminSettings] Error fetching settings:", error)
        showToast("Erreur lors du chargement des paramètres", "error")
        // Use default settings if table doesn't exist
        setSettings(DEFAULT_SETTINGS)
        setOriginalSettings(DEFAULT_SETTINGS)
        return
      }

      if (data) {
        console.log("[AdminSettings] Settings loaded:", data)
        const mergedSettings = { ...DEFAULT_SETTINGS, ...data }
        setSettings(mergedSettings)
        setOriginalSettings(mergedSettings)
        if (data.logo_url) {
          setLogoPreview(data.logo_url)
        }
      } else {
        console.log("[AdminSettings] No settings found, using defaults")
        setSettings(DEFAULT_SETTINGS)
        setOriginalSettings(DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error("[AdminSettings] Exception:", error)
      showToast("Erreur lors du chargement des paramètres", "error")
      setSettings(DEFAULT_SETTINGS)
      setOriginalSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  async function uploadLogo(file) {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `settings/${fileName}`

      // Try to upload to a settings bucket, fallback to public if it doesn't exist
      let bucketName = "settings"
      let uploadError = null
      
      // Try settings bucket first
      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true })
      
      uploadError = uploadResult.error
      
      // If settings bucket doesn't exist, try public bucket
      if (uploadError && uploadError.message?.includes("Bucket not found")) {
        bucketName = "public"
        uploadResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: true })
        uploadError = uploadResult.error
      }
      
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error("[AdminSettings] Logo upload error:", error)
      throw new Error("Erreur lors de l'upload du logo")
    }
  }

  async function handleSave() {
    if (!isAdmin) {
      showToast("Accès réservé aux administrateurs", "error")
      return
    }

    try {
      setSaving(true)
      console.log("[AdminSettings] Saving settings...")

      let logoUrl = settings.logo_url

      // Upload logo if new file selected
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
        console.log("[AdminSettings] Logo uploaded:", logoUrl)
      }

      const settingsToSave = {
        ...settings,
        logo_url: logoUrl,
        updated_by: user?.id || null,
      }

      // Check if settings exist
      const { data: existingData } = await supabase
        .from("settings")
        .select("id")
        .limit(1)
        .maybeSingle()

      let result
      if (existingData?.id) {
        // Update existing settings
        result = await supabase
          .from("settings")
          .update(settingsToSave)
          .eq("id", existingData.id)
          .select()
      } else {
        // Insert new settings
        result = await supabase
          .from("settings")
          .insert([settingsToSave])
          .select()
      }

      if (result.error) {
        console.error("[AdminSettings] Save error:", result.error)
        throw new Error(result.error.message || "Erreur lors de l'enregistrement")
      }

      // Update global settings context immediately
      await updateGlobalSettings(settingsToSave)
      
      // Refresh settings from database
      await refreshSettings()

      // Log activity (only if logging is enabled)
      const { useActivityLogging } = await import("../../context/SettingsContext")
      // Note: We'll check this in the logActivity function itself
      await logActivity(
        "settings_updated",
        "settings",
        "Paramètres de l'application modifiés",
        user?.id || null,
        user?.email || null,
      )

      // Apply language change immediately if language was updated
      if (settingsToSave.default_language && settingsToSave.default_language !== originalSettings.default_language) {
        setLanguage(settingsToSave.default_language)
      }

      setOriginalSettings({ ...settingsToSave })
      setLogoFile(null)
      showToast("Paramètres enregistrés avec succès", "success")
      console.log("[AdminSettings] Settings saved successfully")
    } catch (error) {
      console.error("[AdminSettings] Save exception:", error)
      showToast(error.message || "Erreur lors de l'enregistrement", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!isAdmin) {
      showToast("Accès réservé aux administrateurs", "error")
      return
    }

    try {
      setSaving(true)
      console.log("[AdminSettings] Resetting to default settings...")

      const { data: existingData } = await supabase
        .from("settings")
        .select("id")
        .limit(1)
        .maybeSingle()

      const resetSettings = {
        ...DEFAULT_SETTINGS,
        updated_by: user?.id || null,
      }

      let result
      if (existingData?.id) {
        result = await supabase
          .from("settings")
          .update(resetSettings)
          .eq("id", existingData.id)
          .select()
      } else {
        result = await supabase
          .from("settings")
          .insert([resetSettings])
          .select()
      }

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Log activity
      await logActivity(
        "settings_updated",
        "settings",
        "Paramètres réinitialisés aux valeurs par défaut",
        user?.id || null,
        user?.email || null,
      )

      setSettings(DEFAULT_SETTINGS)
      setOriginalSettings(DEFAULT_SETTINGS)
      setLogoFile(null)
      setLogoPreview("")
      setShowResetDialog(false)
      showToast("Paramètres réinitialisés avec succès", "success")
    } catch (error) {
      console.error("[AdminSettings] Reset error:", error)
      showToast(error.message || "Erreur lors de la réinitialisation", "error")
    } finally {
      setSaving(false)
    }
  }

  function hasChanges() {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings) || logoFile !== null
  }

  if (!isAdmin) {
    return (
      <div style={restrictedContainer}>
        <FaShieldAlt size={48} style={{ color: "#dc2626", marginBottom: 16 }} />
        <h2 style={restrictedTitle}>Accès Restreint</h2>
        <p style={restrictedText}>
          Cette section est réservée aux administrateurs.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>Chargement des paramètres...</p>
      </div>
    )
  }

  const activeSectionData = SECTIONS[activeSection] || SECTIONS.general

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div>
          <h1 style={title}>Paramètres</h1>
          <p style={subtitle}>Gérez les paramètres de l'application</p>
        </div>
        <div style={headerActions}>
          <Button
            variant="secondary"
            icon={<FaUndo />}
            onClick={() => setShowResetDialog(true)}
            disabled={saving}
          >
            Réinitialiser
          </Button>
          <Button
            variant="primary"
            icon={<FaSave />}
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <div style={tabsContainer}>
        {Object.values(SECTIONS).map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              style={{
                ...tab,
                ...(isActive ? activeTab : {}),
              }}
              onClick={() => setActiveSection(section.id)}
            >
              <Icon size={18} />
              <span>{section.label}</span>
            </button>
          )
        })}
      </div>

      {/* Settings Content */}
      <div style={content}>
        {/* General Settings */}
        {activeSection === "general" && (
          <Card title="Paramètres Généraux">
            <div style={section}>
              <div style={sectionHeader}>
                <FaBuilding size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Informations de la Coopérative</h3>
              </div>
              <div style={fieldsGrid}>
                <Input
                  label="Nom de la coopérative"
                  value={settings.cooperative_name}
                  onChange={(v) => setSettings({ ...settings, cooperative_name: v })}
                  icon={<FaBuilding />}
                  required
                />
                <Input
                  label="Devise"
                  value={settings.cooperative_motto}
                  onChange={(v) => setSettings({ ...settings, cooperative_motto: v })}
                  icon={<FaBuilding />}
                />
                <div style={fullWidth}>
                  <ImageUpload
                    label="Logo"
                    value={logoPreview}
                    onChange={(file) => {
                      setLogoFile(file)
                      if (file) {
                        const previewUrl = URL.createObjectURL(file)
                        setLogoPreview(previewUrl)
                      }
                    }}
                  />
                </div>
                <Input
                  label="Adresse"
                  value={settings.address}
                  onChange={(v) => setSettings({ ...settings, address: v })}
                  icon={<FaMapMarkerAlt />}
                />
                <Input
                  label="Téléphone"
                  value={settings.contact_phone}
                  onChange={(v) => setSettings({ ...settings, contact_phone: v })}
                  icon={<FaPhone />}
                  type="tel"
                />
                <Input
                  label="Email"
                  value={settings.contact_email}
                  onChange={(v) => setSettings({ ...settings, contact_email: v })}
                  icon={<FaEnvelope />}
                  type="email"
                />
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaLanguage size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Préférences</h3>
              </div>
              <div style={fieldsGrid}>
                <div style={selectWrapper}>
                  <label style={label}>Langue par défaut</label>
                  <select
                    value={settings.default_language}
                    onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                    style={select}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div style={selectWrapper}>
                  <label style={label}>Devise</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    style={select}
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* System Settings */}
        {activeSection === "system" && (
          <Card title="Paramètres Système">
            <div style={section}>
              <div style={sectionHeader}>
                <FaBell size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Notifications</h3>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, notifications_enabled: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Activer les notifications</span>
                </label>
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaCloudUploadAlt size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Sauvegardes</h3>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.automatic_backups}
                    onChange={(e) =>
                      setSettings({ ...settings, automatic_backups: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Sauvegardes automatiques</span>
                </label>
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaHistory size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Journalisation</h3>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.activity_logging}
                    onChange={(e) =>
                      setSettings({ ...settings, activity_logging: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Journalisation des activités</span>
                </label>
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaClock size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Session</h3>
              </div>
              <div style={fieldsGrid}>
                <Input
                  label="Délai d'expiration de session (minutes)"
                  value={settings.session_timeout_minutes}
                  onChange={(v) =>
                    setSettings({ ...settings, session_timeout_minutes: parseInt(v) || 30 })
                  }
                  type="number"
                  icon={<FaClock />}
                />
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaLock size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Sécurité</h3>
              </div>
              <div style={fieldsGrid}>
                <div style={toggleGroup}>
                  <label style={toggleLabel}>
                    <input
                      type="checkbox"
                      checked={settings.security_two_factor}
                      onChange={(e) =>
                        setSettings({ ...settings, security_two_factor: e.target.checked })
                      }
                      style={checkbox}
                    />
                    <span>Authentification à deux facteurs</span>
                  </label>
                </div>
                <Input
                  label="Longueur minimale du mot de passe"
                  value={settings.security_password_min_length}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      security_password_min_length: parseInt(v) || 8,
                    })
                  }
                  type="number"
                  icon={<FaLock />}
                />
              </div>
            </div>
          </Card>
        )}

        {/* User Management Settings */}
        {activeSection === "users" && (
          <Card title="Gestion des Utilisateurs">
            <div style={section}>
              <div style={sectionHeader}>
                <FaUserPlus size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Inscription</h3>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.allow_user_registration}
                    onChange={(e) =>
                      setSettings({ ...settings, allow_user_registration: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Autoriser l'inscription des utilisateurs</span>
                </label>
              </div>
              <div style={selectWrapper}>
                <label style={label}>Rôle par défaut pour les nouveaux utilisateurs</label>
                <select
                  value={settings.default_user_role}
                  onChange={(e) => setSettings({ ...settings, default_user_role: e.target.value })}
                  style={select}
                >
                  <option value="AGENT">AGENT</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CENTRE">CENTRE</option>
                </select>
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaKey size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Politique de Mot de Passe</h3>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.password_policy_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, password_policy_enabled: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Activer la politique de mot de passe</span>
                </label>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.password_require_uppercase}
                    onChange={(e) =>
                      setSettings({ ...settings, password_require_uppercase: e.target.checked })
                    }
                    style={checkbox}
                    disabled={!settings.password_policy_enabled}
                  />
                  <span>Exiger des majuscules</span>
                </label>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.password_require_lowercase}
                    onChange={(e) =>
                      setSettings({ ...settings, password_require_lowercase: e.target.checked })
                    }
                    style={checkbox}
                    disabled={!settings.password_policy_enabled}
                  />
                  <span>Exiger des minuscules</span>
                </label>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.password_require_numbers}
                    onChange={(e) =>
                      setSettings({ ...settings, password_require_numbers: e.target.checked })
                    }
                    style={checkbox}
                    disabled={!settings.password_policy_enabled}
                  />
                  <span>Exiger des chiffres</span>
                </label>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.password_require_special_chars}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        password_require_special_chars: e.target.checked,
                      })
                    }
                    style={checkbox}
                    disabled={!settings.password_policy_enabled}
                  />
                  <span>Exiger des caractères spéciaux</span>
                </label>
              </div>
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaBan size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Règles de Suspension</h3>
              </div>
              <div style={fieldsGrid}>
                <Input
                  label="Nombre de tentatives de connexion échouées avant suspension"
                  value={settings.account_suspension_after_failed_logins}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      account_suspension_after_failed_logins: parseInt(v) || 5,
                    })
                  }
                  type="number"
                  icon={<FaBan />}
                />
                <Input
                  label="Durée de suspension (heures)"
                  value={settings.account_suspension_duration_hours}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      account_suspension_duration_hours: parseInt(v) || 24,
                    })
                  }
                  type="number"
                  icon={<FaClock />}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Data Settings */}
        {activeSection === "data" && (
          <Card title="Paramètres de Données">
            <div style={section}>
              <div style={sectionHeader}>
                <FaFileExport size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Export</h3>
              </div>
              <div style={fieldsGrid}>
                <div style={selectWrapper}>
                  <label style={label}>Format d'export par défaut</label>
                  <select
                    value={settings.export_format}
                    onChange={(e) => setSettings({ ...settings, export_format: e.target.value })}
                    style={select}
                  >
                    <option value="PDF">PDF</option>
                    <option value="Excel">Excel</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
                <div style={selectWrapper}>
                  <label style={label}>Mise en page PDF</label>
                  <select
                    value={settings.pdf_export_layout}
                    onChange={(e) =>
                      setSettings({ ...settings, pdf_export_layout: e.target.value })
                    }
                    style={select}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Paysage</option>
                  </select>
                </div>
              </div>
              <div style={toggleGroup}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.auto_export_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_export_enabled: e.target.checked })
                    }
                    style={checkbox}
                  />
                  <span>Export automatique activé</span>
                </label>
              </div>
              {settings.auto_export_enabled && (
                <div style={selectWrapper}>
                  <label style={label}>Fréquence d'export automatique</label>
                  <select
                    value={settings.auto_export_frequency}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_export_frequency: e.target.value })
                    }
                    style={select}
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                  </select>
                </div>
              )}
            </div>

            <div style={section}>
              <div style={sectionHeader}>
                <FaTrash size={20} style={{ color: "#7a1f1f" }} />
                <h3 style={sectionTitle}>Rétention des Données</h3>
              </div>
              <div style={fieldsGrid}>
                <Input
                  label="Durée de rétention (jours)"
                  value={settings.data_retention_days}
                  onChange={(v) =>
                    setSettings({ ...settings, data_retention_days: parseInt(v) || 365 })
                  }
                  type="number"
                  icon={<FaTrash />}
                />
                <div style={infoBox}>
                  <FaExclamationTriangle style={{ color: "#f59e0b", marginRight: 8 }} />
                  <span>
                    Les données plus anciennes que cette durée seront automatiquement supprimées.
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Réinitialiser les paramètres"
        message="Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ? Cette action est irréversible."
        type="warning"
        confirmText="Réinitialiser"
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

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#111827",
}

const subtitle = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#6b7280",
}

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
}

const tabsContainer = {
  display: "flex",
  gap: 8,
  borderBottom: "2px solid #e5e7eb",
  overflowX: "auto",
}

const tab = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  border: "none",
  background: "transparent",
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  borderBottom: "2px solid transparent",
  marginBottom: "-2px",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
}

const activeTab = {
  color: "#7a1f1f",
  borderBottomColor: "#7a1f1f",
}

const content = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const section = {
  marginBottom: 32,
}

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 20,
}

const sectionTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
}

const fieldsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
}

const fullWidth = {
  gridColumn: "1 / -1",
}

const selectWrapper = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const label = {
  fontSize: "13px",
  color: "#374151",
  fontWeight: 600,
  marginBottom: "8px",
}

const select = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  background: "white",
  color: "#111827",
  cursor: "pointer",
  transition: "border-color 0.2s ease",
}

const toggleGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const toggleLabel = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: "14px",
  color: "#374151",
  cursor: "pointer",
}

const checkbox = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: "#7a1f1f",
}

const infoBox = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "10px",
  fontSize: "13px",
  color: "#92400e",
  gridColumn: "1 / -1",
}

const restrictedContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "400px",
  gap: 16,
  textAlign: "center",
}

const restrictedTitle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#1f2937",
}

const restrictedText = {
  margin: 0,
  fontSize: "14px",
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
