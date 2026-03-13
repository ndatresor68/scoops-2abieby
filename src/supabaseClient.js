import { createClient } from "@supabase/supabase-js"

// Get environment variables - Vite requires VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Variables d'environnement Supabase manquantes")
  console.error("   VITE_SUPABASE_URL:", supabaseUrl ? "✅" : "❌")
  console.error("   VITE_SUPABASE_ANON_KEY:", supabaseKey ? "✅" : "❌")
  console.error("   Créez un fichier .env.local avec ces variables:")
  console.error("   VITE_SUPABASE_URL=https://your-project.supabase.co")
  console.error("   VITE_SUPABASE_ANON_KEY=your-anon-key-here")
  
  // Don't throw - allow app to render login screen
  // The app will show connection errors in the UI
}

// Create Supabase client with error handling
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", // Fallback to prevent crash
  supabaseKey || "placeholder-key", // Fallback to prevent crash
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Reduce timeout to fail faster
      storage: window.localStorage,
    },
    // Add global error handling
    global: {
      headers: {
        "x-client-info": "scoops-app",
      },
    },
  }
)

// Test connection on initialization
if (supabaseUrl && supabaseKey) {
  console.log("✅ Supabase client initialized")
  console.log("   URL:", supabaseUrl.substring(0, 30) + "...")
  console.log("   Key:", supabaseKey.substring(0, 20) + "...")
} else {
  console.warn("⚠️ Supabase client initialized with placeholder values")
  console.warn("   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local")
}
