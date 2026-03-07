import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://dbfcmlonhgpobmaeutdf.supabase.co"
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_VtxAZVPSnBy6xnpdWu3Qsg_nIyUIrV3"

export const supabase = createClient(supabaseUrl, supabaseKey)
