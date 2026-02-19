import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dbfcmlonhgpobmaeutdf.supabase.co'
const supabaseKey = 'sb_publishable_VtxAZVPSnBy6xnpdWu3Qsg_nIyUIrV3'

export const supabase = createClient(supabaseUrl, supabaseKey)