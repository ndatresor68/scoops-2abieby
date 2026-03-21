import { createClient } from "@supabase/supabase-js"
import { createSupabaseService } from "./services/supabaseService"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const rawSupabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      flowType: "pkce",
    },
    global: {
      headers: {
        "x-client-info": "scoops-app",
      },
    },
    db: {
      schema: "public",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

export const supabase = createSupabaseService(rawSupabase)
