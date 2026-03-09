/**
 * Script simplifié pour créer l'utilisateur administrateur
 * Utilise directement les valeurs hardcodées (pour développement uniquement)
 * 
 * Usage: node scripts/create-admin-simple.js
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dbfcmlonhgpobmaeutdf.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: SUPABASE_SERVICE_ROLE_KEY est requis')
  console.error('   Définissez-la: export SUPABASE_SERVICE_ROLE_KEY="votre_key"')
  console.error('   Ou ajoutez-la dans .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ADMIN_EMAIL = 'ndatresor68@gmail.com'
const ADMIN_PASSWORD = 'Leaticia2024@'

async function main() {
  console.log('🚀 Création admin...\n')

  try {
    // Créer l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Admin', role: 'ADMIN' }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('ℹ️  Utilisateur existe déjà, mise à jour...')
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.users?.find(u => u.email === ADMIN_EMAIL)
        if (user) {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: ADMIN_PASSWORD,
            user_metadata: { role: 'ADMIN' }
          })
          console.log('✅ Mot de passe mis à jour')
        }
      } else {
        throw error
      }
    } else {
      console.log('✅ Utilisateur créé:', data.user.id)
    }

    // Créer/mettre à jour le profil
    const userId = data?.user?.id || (await supabaseAdmin.auth.admin.listUsers()).data?.users?.find(u => u.email === ADMIN_EMAIL)?.id

    if (!userId) {
      throw new Error('Impossible de trouver l\'ID utilisateur')
    }

    const { error: profileError } = await supabaseAdmin
      .from('utilisateurs')
      .upsert({
        user_id: userId,
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        nom: 'Administrateur'
      }, { onConflict: 'email' })

    if (profileError) {
      console.warn('⚠️  Erreur profil:', profileError.message)
    } else {
      console.log('✅ Profil créé/mis à jour')
    }

    console.log('\n🎉 SUCCÈS!')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)

  } catch (error) {
    console.error('❌ ERREUR:', error.message)
    process.exit(1)
  }
}

main()
