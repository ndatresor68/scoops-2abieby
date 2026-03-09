# Guide de Réparation - SCOOPS Application

## 🔧 Problèmes Identifiés et Réparés

### 1. Écran Blanc - Problèmes Réparés

#### ✅ AuthContext.jsx
- **Problème**: Ligne 78 manquante - `const { data } = await supabase.auth.getUser()`
- **Réparé**: Ajout de la gestion d'erreurs complète avec try/catch
- **Réparé**: Suppression du `console.log(role)` de debug

#### ✅ Gestion d'erreurs améliorée
- Tous les appels Supabase ont maintenant une gestion d'erreurs appropriée
- Les erreurs sont loggées sans casser l'application

### 2. Authentification Supabase - Réparations

#### ✅ Configuration Supabase
- Vérification des variables d'environnement
- Fallback vers les valeurs par défaut si les variables ne sont pas définies

#### ✅ Script de création d'admin
- Script Node.js: `scripts/create-admin.js`
- Script SQL: `database/create_admin_user.sql`

## 📋 Instructions de Réparation Complète

### Étape 1: Installer les dépendances

```bash
npm install
```

### Étape 2: Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet:

```env
VITE_SUPABASE_URL=https://dbfcmlonhgpobmaeutdf.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

**Où trouver les clés:**
- Dashboard Supabase > Settings > API
- `anon/public` key → `VITE_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ SECRET - ne jamais exposer côté client)

### Étape 3: Créer l'utilisateur administrateur

#### Option A: Via le script Node.js (Recommandé)

```bash
npm run create-admin
```

Le script va:
1. Créer l'utilisateur dans `auth.users`
2. Créer/mettre à jour le profil dans `utilisateurs`
3. Définir le rôle à `ADMIN`

**Informations de connexion:**
- Email: `ndatresor68@gmail.com`
- Password: `Leaticia2024@`
- Role: `ADMIN`

#### Option B: Via SQL (Alternative)

1. Allez dans Supabase Dashboard > SQL Editor
2. Exécutez le script: `database/create_admin_user.sql`
3. **IMPORTANT**: Créez d'abord l'utilisateur via le dashboard Supabase (Authentication > Users > Add User)

### Étape 4: Vérifier la structure de la base de données

Assurez-vous que la table `utilisateurs` existe avec ces colonnes:

```sql
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'AGENT' CHECK (role IN ('ADMIN', 'AGENT', 'CENTRE')),
  centre_id UUID,
  avatar_url TEXT,
  photo_profil TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Étape 5: Vérifier les buckets Storage

Assurez-vous que ces buckets existent dans Supabase Storage:
- `avatars` (pour les photos de profil)
- `producteurs` (pour les photos et documents des producteurs)

**Créer un bucket:**
1. Dashboard Supabase > Storage
2. New bucket
3. Nom: `avatars` ou `producteurs`
4. Cochez "Public bucket"
5. Créez

### Étape 6: Tester l'application

```bash
npm run dev
```

**Vérifications:**
1. ✅ L'application se charge sans écran blanc
2. ✅ La page de login s'affiche
3. ✅ Connexion avec `ndatresor68@gmail.com` / `Leaticia2024@`
4. ✅ Le dashboard s'affiche
5. ✅ L'accès admin fonctionne

## 🐛 Dépannage

### Problème: Écran blanc persistant

**Solutions:**
1. Ouvrez la console du navigateur (F12)
2. Vérifiez les erreurs JavaScript
3. Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont corrects
4. Vérifiez la connexion réseau à Supabase

### Problème: Erreur d'authentification

**Solutions:**
1. Vérifiez que l'utilisateur existe dans `auth.users`
2. Vérifiez que le profil existe dans `utilisateurs`
3. Vérifiez que le rôle est bien `ADMIN` (en majuscules)
4. Réessayez de créer l'admin avec le script

### Problème: Erreur "Table utilisateurs not found"

**Solutions:**
1. Exécutez le script SQL: `database/create_admin_user.sql`
2. Ou créez la table manuellement (voir Étape 4)

### Problème: Erreur lors de l'upload d'images

**Solutions:**
1. Vérifiez que les buckets Storage existent
2. Vérifiez les politiques RLS sur les buckets
3. Assurez-vous que les buckets sont publics ou que les politiques permettent l'accès

## 📝 Checklist de Vérification

- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Table `utilisateurs` créée avec toutes les colonnes
- [ ] Utilisateur admin créé dans `auth.users`
- [ ] Profil admin créé dans `utilisateurs` avec `role = 'ADMIN'`
- [ ] Buckets Storage créés (`avatars`, `producteurs`)
- [ ] Application démarre sans erreur
- [ ] Login fonctionne
- [ ] Dashboard accessible
- [ ] Accès admin fonctionne

## 🔒 Sécurité

⚠️ **IMPORTANT:**
- Ne commitez JAMAIS le fichier `.env.local`
- Ne partagez JAMAIS la `SUPABASE_SERVICE_ROLE_KEY`
- Changez le mot de passe admin après la première connexion
- Utilisez des mots de passe forts en production

## 📞 Support

Si les problèmes persistent:
1. Vérifiez les logs de la console navigateur
2. Vérifiez les logs Supabase (Dashboard > Logs)
3. Vérifiez que toutes les étapes ont été suivies
