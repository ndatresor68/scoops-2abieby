/**
 * Simple i18n system for language switching
 * Supports French (fr) and English (en)
 */

const translations = {
  fr: {
    // Common
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    create: "Créer",
    search: "Rechercher",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    
    // Navigation
    dashboard: "Tableau de bord",
    producers: "Producteurs",
    centers: "Centres",
    purchases: "Achats",
    settings: "Paramètres",
    users: "Utilisateurs",
    activities: "Activités",
    
    // Settings
    generalSettings: "Paramètres Généraux",
    systemSettings: "Paramètres Système",
    userSettings: "Gestion des Utilisateurs",
    dataSettings: "Paramètres de Données",
    cooperativeName: "Nom de la coopérative",
    address: "Adresse",
    phone: "Téléphone",
    email: "Email",
    language: "Langue",
    currency: "Devise",
    
    // User Registration
    registrationDisabled: "L'inscription des utilisateurs est désactivée par l'administrateur",
    register: "S'inscrire",
    
    // Password Policy
    passwordTooShort: "Le mot de passe doit contenir au moins {min} caractères",
    passwordRequiresUppercase: "Le mot de passe doit contenir au moins une majuscule",
    passwordRequiresLowercase: "Le mot de passe doit contenir au moins une minuscule",
    passwordRequiresNumber: "Le mot de passe doit contenir au moins un chiffre",
    passwordRequiresSpecialChar: "Le mot de passe doit contenir au moins un caractère spécial",
    
    // Session
    sessionExpired: "Votre session a expiré. Veuillez vous reconnecter.",
    
    // Export
    exportPDF: "Exporter en PDF",
    exportExcel: "Exporter en Excel",
    exporting: "Export en cours...",
    
    // Notifications
    notifications: "Notifications",
    noNotifications: "Aucune notification",
    
    // Activity Logging
    activityLogged: "Activité enregistrée",
  },
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    
    // Navigation
    dashboard: "Dashboard",
    producers: "Producers",
    centers: "Centers",
    purchases: "Purchases",
    settings: "Settings",
    users: "Users",
    activities: "Activities",
    
    // Settings
    generalSettings: "General Settings",
    systemSettings: "System Settings",
    userSettings: "User Management",
    dataSettings: "Data Settings",
    cooperativeName: "Cooperative Name",
    address: "Address",
    phone: "Phone",
    email: "Email",
    language: "Language",
    currency: "Currency",
    
    // User Registration
    registrationDisabled: "User registration is disabled by the administrator",
    register: "Register",
    
    // Password Policy
    passwordTooShort: "Password must contain at least {min} characters",
    passwordRequiresUppercase: "Password must contain at least one uppercase letter",
    passwordRequiresLowercase: "Password must contain at least one lowercase letter",
    passwordRequiresNumber: "Password must contain at least one number",
    passwordRequiresSpecialChar: "Password must contain at least one special character",
    
    // Session
    sessionExpired: "Your session has expired. Please log in again.",
    
    // Export
    exportPDF: "Export to PDF",
    exportExcel: "Export to Excel",
    exporting: "Exporting...",
    
    // Notifications
    notifications: "Notifications",
    noNotifications: "No notifications",
    
    // Activity Logging
    activityLogged: "Activity logged",
  },
}

let currentLanguage = localStorage.getItem("app_language") || "fr"

// Listen for language changes
if (typeof window !== "undefined") {
  window.addEventListener("languageChanged", (event) => {
    currentLanguage = event.detail.language
  })
}

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang
    localStorage.setItem("app_language", lang)
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: { language: lang } }))
  }
}

export function getLanguage() {
  return currentLanguage
}

export function t(key, params = {}) {
  const translation = translations[currentLanguage]?.[key] || translations.fr[key] || key
  
  // Replace parameters like {min} with actual values
  if (params && Object.keys(params).length > 0) {
    return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : match
    })
  }
  
  return translation
}

// React hook version
import { useState, useEffect } from "react"

export function useTranslation() {
  const [lang, setLang] = useState(currentLanguage)
  
  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLang(event.detail.language)
    }
    
    window.addEventListener("languageChanged", handleLanguageChange)
    return () => window.removeEventListener("languageChanged", handleLanguageChange)
  }, [])
  
  return { t, language: lang, setLanguage }
}

export { translations }
