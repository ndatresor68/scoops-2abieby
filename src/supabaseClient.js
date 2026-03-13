import { createClient } from "@supabase/supabase-js"

// Get environment variables - Vite requires VITE_ prefix
// In production, these must be set at build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
const isProduction = import.meta.env.PROD
const isDevelopment = import.meta.env.DEV

if (!supabaseUrl || !supabaseKey) {
  const envType = isProduction ? "production" : "development"
  console.error(`❌ ERREUR: Variables d'environnement Supabase manquantes (${envType})`)
  console.error("   VITE_SUPABASE_URL:", supabaseUrl ? "✅" : "❌")
  console.error("   VITE_SUPABASE_ANON_KEY:", supabaseKey ? "✅" : "❌")
  
  if (isDevelopment) {
    console.error("   Créez un fichier .env.local avec ces variables:")
    console.error("   VITE_SUPABASE_URL=https://your-project.supabase.co")
    console.error("   VITE_SUPABASE_ANON_KEY=your-anon-key-here")
  } else {
    console.error("   ⚠️ PRODUCTION: Les variables d'environnement doivent être définies lors du build")
    console.error("   Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont configurées")
    console.error("   dans votre plateforme de déploiement (Vercel, Netlify, etc.)")
  }
  
  // Don't throw - allow app to render login screen
  // The app will show connection errors in the UI
}

// Validate URL format
const isValidUrl = supabaseUrl && (
  supabaseUrl.startsWith("https://") && 
  supabaseUrl.includes(".supabase.co")
)

if (supabaseUrl && !isValidUrl && supabaseUrl !== "https://placeholder.supabase.co") {
  console.warn("⚠️ VITE_SUPABASE_URL semble invalide:", supabaseUrl)
  console.warn("   Format attendu: https://xxxxx.supabase.co")
}

// Create Supabase client with enhanced error handling
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", // Fallback to prevent crash
  supabaseKey || "placeholder-key", // Fallback to prevent crash
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      // Add timeout for auth operations
      flowType: "pkce",
    },
    // Enhanced global configuration for production
    global: {
      headers: {
        "x-client-info": "scoops-app",
      },
    },
    // Database configuration
    db: {
      schema: "public",
    },
    // Realtime configuration
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Test connection on initialization
if (supabaseUrl && supabaseKey && isValidUrl) {
  if (isDevelopment) {
    console.log("✅ Supabase client initialized (development)")
    console.log("   URL:", supabaseUrl.substring(0, 30) + "...")
    console.log("   Key:", supabaseKey.substring(0, 20) + "...")
  } else {
    console.log("✅ Supabase client initialized (production)")
  }
  
  // Test connection with a simple query
  if (isDevelopment) {
    supabase
      .from("utilisateurs")
      .select("count", { count: "exact", head: true })
      .then(({ error }) => {
        if (error) {
          console.warn("⚠️ Supabase connection test failed:", error.message)
        } else {
          console.log("✅ Supabase connection test successful")
        }
      })
      .catch((err) => {
        console.warn("⚠️ Supabase connection test error:", err.message)
      })
  }
} else {
  const envType = isProduction ? "production" : "development"
  console.warn(`⚠️ Supabase client initialized with placeholder values (${envType})`)
  if (isProduction) {
    console.warn("   ⚠️ CRITICAL: Les variables d'environnement ne sont pas définies en production!")
    console.warn("   L'application ne pourra pas se connecter à Supabase.")
  }
}
