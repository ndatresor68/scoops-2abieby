/**
 * Script pour créer l'utilisateur administrateur
 * 
 * Usage:
 *   node scripts/create-admin.js
 * 
 * Ou avec les variables d'environnement:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_service_key node scripts/create-admin.js
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env') })
dotenv.config({ path: join(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dbfcmlonhgpobmaeutdf.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const ADMIN_EMAIL = 'ndatresor68@gmail.com'
const ADMIN_PASSWORD = 'Leaticia2024@'
const ADMIN_ROLE = 'ADMIN'

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_KEY est requis')
  console.error('   Ajoutez-la dans votre fichier .env.local')
  console.error('   Vous pouvez la trouver dans: Supabase Dashboard > Settings > API > service_role key')
  process.exit(1)
}

// Créer le client Supabase avec la service role key (permissions admin)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  console.log('🚀 Création de l\'utilisateur administrateur...\n')
  console.log(`   Email: ${ADMIN_EMAIL}`)
  console.log(`   Rôle: ${ADMIN_ROLE}\n`)

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Erreur lors de la vérification des utilisateurs:', listError.message)
      throw listError
    }

    const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

    let userId

    if (existingUser) {
      console.log('ℹ️  Utilisateur existant trouvé, mise à jour...')
      userId = existingUser.id

      // Mettre à jour le mot de passe si nécessaire
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: ADMIN_PASSWORD,
        user_metadata: {
          full_name: ADMIN_EMAIL.split('@')[0],
          role: ADMIN_ROLE
        }
      })

      if (updateError) {
        console.warn('⚠️  Avertissement lors de la mise à jour:', updateError.message)
      } else {
        console.log('✅ Mot de passe et métadonnées mis à jour')
      }
    } else {
      // 2. Créer l'utilisateur dans auth.users
      console.log('📝 Création du nouvel utilisateur...')
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_EMAIL.split('@')[0],
          role: ADMIN_ROLE
        }
      })

      if (createError) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', createError.message)
        throw createError
      }

      if (!newUser?.user?.id) {
        throw new Error('Impossible de créer l\'utilisateur - ID manquant')
      }

      userId = newUser.user.id
      console.log('✅ Utilisateur créé dans auth.users')
      console.log(`   ID: ${userId}`)
    }

    // 3. Créer ou mettre à jour le profil dans la table utilisateurs
    console.log('\n📋 Création/mise à jour du profil dans la table utilisateurs...')

    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('utilisateurs')
      .select('id, user_id, email, role')
      .or(`email.eq.${ADMIN_EMAIL},user_id.eq.${userId}`)
      .maybeSingle()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification du profil:', profileCheckError.message)
      throw profileCheckError
    }

    const profileData = {
      user_id: userId,
      email: ADMIN_EMAIL,
      role: ADMIN_ROLE,
      nom: ADMIN_EMAIL.split('@')[0],
      updated_at: new Date().toISOString()
    }

    if (existingProfile) {
      // Mettre à jour le profil existant
      const { error: updateError } = await supabaseAdmin
        .from('utilisateurs')
        .update(profileData)
        .eq('id', existingProfile.id)

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour du profil:', updateError.message)
        throw updateError
      }

      console.log('✅ Profil mis à jour dans la table utilisateurs')
    } else {
      // Créer un nouveau profil
      const { error: insertError } = await supabaseAdmin
        .from('utilisateurs')
        .insert([profileData])

      if (insertError) {
        console.error('❌ Erreur lors de la création du profil:', insertError.message)
        console.error('   Vérifiez que la table "utilisateurs" existe et a les bonnes colonnes')
        throw insertError
      }

      console.log('✅ Profil créé dans la table utilisateurs')
    }

    console.log('\n🎉 SUCCÈS! L\'utilisateur administrateur a été créé/mis à jour avec succès')
    console.log('\n📝 Informations de connexion:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Mot de passe: ${ADMIN_PASSWORD}`)
    console.log(`   Rôle: ${ADMIN_ROLE}`)
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion!')

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    console.error('\n💡 Solutions possibles:')
    console.error('   1. Vérifiez que SUPABASE_SERVICE_ROLE_KEY est correcte')
    console.error('   2. Vérifiez que la table "utilisateurs" existe')
    console.error('   3. Exécutez le script SQL: database/create_admin_user.sql')
    process.exit(1)
  }
}

// Exécuter le script
createAdminUser()
