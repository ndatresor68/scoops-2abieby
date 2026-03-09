import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://dbfcmlonhgpobmaeutdf.supabase.co"
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_VtxAZVPSnBy6xnpdWu3Qsg_nIyUIrV3"

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERREUR: Variables d'environnement Supabase manquantes")
  console.error("   VITE_SUPABASE_URL:", supabaseUrl ? "✅" : "❌")
  console.error("   VITE_SUPABASE_ANON_KEY:", supabaseKey ? "✅" : "❌")
  console.error("   Créez un fichier .env.local avec ces variables")
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
