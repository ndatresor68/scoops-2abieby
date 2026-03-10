import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "../supabaseClient"

const SettingsContext = createContext(null)

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

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    try {
      console.log("[SettingsContext] Fetching settings from database...")
      
      const { data, error: fetchError } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("[SettingsContext] Error fetching settings:", fetchError)
        // Use default settings if table doesn't exist
        setSettings(DEFAULT_SETTINGS)
        setError(null)
        return
      }

      if (data) {
        console.log("[SettingsContext] Settings loaded:", data)
        const mergedSettings = { ...DEFAULT_SETTINGS, ...data }
        setSettings(mergedSettings)
        setError(null)
        
        // Apply language immediately
        if (mergedSettings.default_language) {
          applyLanguage(mergedSettings.default_language)
        }
      } else {
        console.log("[SettingsContext] No settings found, using defaults")
        setSettings(DEFAULT_SETTINGS)
        setError(null)
      }
    } catch (err) {
      console.error("[SettingsContext] Exception:", err)
      setError(err.message)
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings) => {
    try {
      console.log("[SettingsContext] Updating settings...")
      
      const { data: existingData } = await supabase
        .from("settings")
        .select("id")
        .limit(1)
        .maybeSingle()

      let result
      if (existingData?.id) {
        result = await supabase
          .from("settings")
          .update(newSettings)
          .eq("id", existingData.id)
          .select()
      } else {
        result = await supabase
          .from("settings")
          .insert([newSettings])
          .select()
      }

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Update local state immediately
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      
      // Apply language change immediately if language was updated
      if (newSettings.default_language && newSettings.default_language !== settings.default_language) {
        applyLanguage(newSettings.default_language)
      }
      
      console.log("[SettingsContext] Settings updated successfully")
      return { success: true }
    } catch (err) {
      console.error("[SettingsContext] Update error:", err)
      throw err
    }
  }, [settings])

  // Apply language change
  function applyLanguage(lang) {
    console.log("[SettingsContext] Applying language:", lang)
    // Store in localStorage for persistence
    localStorage.setItem("app_language", lang)
    // Trigger language change event
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: { language: lang } }))
  }

  // Initialize settings on mount
  useEffect(() => {
    fetchSettings()
    
    // Set up realtime subscription for settings changes
    const channel = supabase
      .channel("settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
        },
        (payload) => {
          console.log("[SettingsContext] Settings changed via Realtime:", payload)
          fetchSettings() // Reload settings when changed
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSettings])

  // Get current language from settings or localStorage
  const currentLanguage = settings.default_language || localStorage.getItem("app_language") || "fr"

  const value = {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: fetchSettings,
    currentLanguage,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider")
  }
  return context
}

// Helper hooks for specific settings
export function useLanguage() {
  const { currentLanguage } = useSettings()
  return currentLanguage
}

export function useUserRegistration() {
  const { settings } = useSettings()
  return settings.allow_user_registration
}

export function usePasswordPolicy() {
  const { settings } = useSettings()
  return {
    enabled: settings.password_policy_enabled,
    minLength: settings.security_password_min_length,
    requireUppercase: settings.password_require_uppercase,
    requireLowercase: settings.password_require_lowercase,
    requireNumbers: settings.password_require_numbers,
    requireSpecialChars: settings.password_require_special_chars,
  }
}

export function useExportFormat() {
  const { settings } = useSettings()
  return settings.export_format || "PDF"
}

export function useNotificationsEnabled() {
  const { settings } = useSettings()
  return settings.notifications_enabled
}

export function useActivityLogging() {
  const { settings } = useSettings()
  return settings.activity_logging
}

export function useSessionTimeout() {
  const { settings } = useSettings()
  return settings.session_timeout_minutes || 30
}
