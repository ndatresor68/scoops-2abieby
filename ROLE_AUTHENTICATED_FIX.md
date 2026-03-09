# Correction du Rôle "authenticated" - PostgreSQL Role vs Application Role

## 🔍 Problème Identifié

L'UI affichait `role = authenticated` au lieu de `role = ADMIN`.

**Cause**: "authenticated" est un rôle PostgreSQL par défaut, PAS le rôle de l'application.

L'application ne doit **JAMAIS** utiliser:
- `auth.user.role` (métadonnées Supabase auth)
- `session.role` (rôle de session)
- `auth.role` (rôle PostgreSQL)

L'application doit **TOUJOURS** utiliser:
- `public.utilisateurs.role` (rôle depuis la table DB)

## ✅ Corrections Appliquées

### 1. loadProfileForUser - Vérification Multi-Champs

**Changement Principal**: Essaie plusieurs champs pour trouver le profil

```javascript
// Try user_id first (foreign key to auth.users.id)
const { data: profileByUserId } = await supabase
  .from("utilisateurs")
  .select("*")
  .eq("user_id", authUser.id)
  .single()

// Then try id (if id matches auth.users.id)
const { data: profileById } = await supabase
  .from("utilisateurs")
  .select("*")
  .eq("id", authUser.id)
  .single()

// Fallback: email
const { data: profileByEmail } = await supabase
  .from("utilisateurs")
  .select("*")
  .eq("email", authUser.email)
  .single()
```

### 2. Rejet du Rôle "authenticated"

**Ajouté**: Vérification explicite pour rejeter "authenticated"

```javascript
// CRITICAL: Verify role is NOT "authenticated" (PostgreSQL role)
if (profile.role === "authenticated" || profile.role === "AUTHENTICATED") {
  console.error("[AuthContext] CRITICAL ERROR: Profile role is 'authenticated'")
  console.error("[AuthContext] This is a PostgreSQL role, not application role!")
  console.error("[AuthContext] Expected: ADMIN, AGENT, or CENTRE")
  return null
}
```

### 3. Nettoyage de authUser Avant Fusion

**Changement Principal**: Supprime explicitement tout rôle de authUser avant fusion

```javascript
// Remove any role from authUser (if it exists) - we ONLY use profile.role
const mergedUser = {
  ...authUser,
  role: undefined,  // Clear any auth role first
  nom: undefined,   // Clear any auth nom first
}

// Now set ONLY from profile (DB)
setUser({
  ...mergedUser,
  role: profile.role,  // FROM DB ONLY - NEVER from auth
  nom: profile.nom,    // FROM DB ONLY - NEVER from auth
  centre_id: profile.centre_id,
  avatar_url: profile.avatar_url,
})
```

### 4. effectiveRole - Rejet de "authenticated"

**Ajouté**: Vérification dans effectiveRole

```javascript
// CRITICAL: Reject "authenticated" - this is a PostgreSQL role, not application role
if (roleFromUser === "authenticated" || roleFromUser === "AUTHENTICATED") {
  console.error("[AuthContext] CRITICAL: user.role is 'authenticated' - this is WRONG!")
  console.error("[AuthContext] This means role is coming from auth metadata, not DB")
  return null
}
```

### 5. Ne Pas Définir User Sans Profil

**Changement Principal**: Ne définit pas `user` si le profil n'est pas chargé

```javascript
// Don't set user without profile - we need role from DB
// This ensures we never use auth.role or session.role
if (!profileResult) {
  console.error("[AuthContext] CRITICAL: Profile not loaded!")
  // Don't set user - wait for profile load
}
```

## 🔒 Garanties

1. ✅ **Source Unique**: Rôle **TOUJOURS** depuis `public.utilisateurs.role`
2. ✅ **Rejet "authenticated"**: Vérifie et rejette explicitement ce rôle PostgreSQL
3. ✅ **Nettoyage Auth**: Supprime tout rôle de authUser avant fusion
4. ✅ **Multi-Champs**: Essaie `user_id`, `id`, puis `email`
5. ✅ **Pas de Fallback Auth**: Ne définit jamais user sans profil chargé
6. ✅ **Logs Complets**: `Loaded profile:` logué avec vérifications

## 📋 Flux de Chargement Garanti

### Après Connexion

1. `signInWithPassword()` appelé
2. Connexion réussie → `loadProfileForUser()` appelé
3. Requête: Essaie `user_id`, puis `id`, puis `email`
4. **Vérification**: Rejette si `profile.role === "authenticated"`
5. **Nettoyage**: Supprime `role` de `authUser`
6. **Fusion**: `setUser({...authUser, role: profile.role})` - **SEULEMENT** depuis DB
7. **Vérification**: `effectiveRole` rejette "authenticated"
8. Tous les composants reçoivent `user.role = "ADMIN"` depuis DB

## ✅ Résultat Attendu

Pour `ndatresor68@gmail.com` avec `role = ADMIN` dans `utilisateurs`:

### Console Logs Attendus

```
[AuthContext] ===== LOADING PROFILE FROM DB =====
[AuthContext] Profile found by user_id (or id or email)
[AuthContext] ===== PROFILE LOADED FROM DB =====
Loaded profile: {id: <uuid>, email: "ndatresor68@gmail.com", role: "ADMIN", ...} ✅
[AuthContext] DB ROLE: ADMIN ✅
[AuthContext] User state updated with profile data from DB
[AuthContext] User.role is now: ADMIN (from utilisateurs table)
[AuthContext] Effective role from user.role (from DB): ADMIN
```

### Interface Attendue

- ✅ **Header**: "Connecté en tant que ndatresor68 (ADMIN)"
- ✅ **UserMenu**: "ndatresor68@gmail.com • ADMIN"
- ✅ **Profile Page**: Affiche "ADMIN"
- ✅ **Admin Menu**: Visible
- ✅ **Admin Dashboard**: Accessible
- ✅ **Jamais "authenticated"**: Rejeté explicitement

---

**Date de correction:** $(date)
**Statut:** ✅ CORRIGÉ - Rôle toujours depuis `public.utilisateurs.role`, rejet de "authenticated"
