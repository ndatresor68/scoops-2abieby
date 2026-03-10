# Système de Gestion des Utilisateurs - Documentation Complète

## 🎯 Vue d'Ensemble

Un système complet de gestion des utilisateurs a été créé pour transformer l'application en un système d'administration professionnel de type SaaS. Le système permet aux administrateurs de gérer tous les aspects des utilisateurs : création, modification, suspension, bannissement et suppression.

---

## ✨ Fonctionnalités Principales

### 1. Page de Gestion des Utilisateurs (`AdminUsers.jsx`)

#### Interface Moderne SaaS
- **Tableau professionnel** avec colonnes : Avatar, Nom, Email, Rôle, Statut, Centre, Actions
- **Cartes statistiques** en haut de page :
  - Total utilisateurs
  - Utilisateurs actifs
  - Utilisateurs suspendus
  - Utilisateurs bannis
- **Barre de recherche** pour filtrer par nom, email ou rôle
- **Bouton flottant** pour créer un utilisateur
- **Design responsive** adapté mobile et desktop

#### Gestion des Statuts

**Statuts disponibles :**
- **Actif** (active) - Utilisateur peut se connecter normalement
- **Suspendu** (suspended) - Utilisateur ne peut plus se connecter temporairement
- **Banni** (banned) - Utilisateur complètement bloqué (irréversible)

**Badges de statut :**
- Couleurs distinctes pour chaque statut
- Design moderne avec bordures et arrière-plans colorés

### 2. Création d'Utilisateur

**Processus complet :**
1. Création du compte dans Supabase Auth avec `admin.createUser()`
2. Insertion dans la table `utilisateurs` avec :
   - `nom` - Nom complet
   - `email` - Adresse email
   - `role` - Rôle (ADMIN, AGENT, SUPERVISOR, CENTRE)
   - `centre_id` - Centre associé (optionnel)
   - `status` - Statut par défaut : "active"
   - `avatar_url` - URL de la photo de profil (optionnel)

**Rôles disponibles :**
- **ADMIN** - Accès complet au système
- **AGENT** - Accès limité aux fonctionnalités agents
- **SUPERVISOR** - Nouveau rôle de superviseur
- **CENTRE** - Accès aux fonctionnalités des centres

**Validation :**
- Nom requis
- Email valide requis
- Mot de passe minimum 6 caractères requis
- Validation en temps réel avec messages d'erreur

### 3. Modification d'Utilisateur

**Champs modifiables :**
- Nom
- Email
- Rôle
- Centre associé
- Photo de profil

**Sécurité :**
- Impossible de modifier son propre compte pour les actions critiques
- Impossible de modifier d'autres administrateurs (sauf si vous êtes ADMIN)

### 4. Suspendre un Utilisateur

**Fonctionnalité :**
- Met le statut à "suspended"
- L'utilisateur ne peut plus se connecter
- Action réversible (peut être réactivé)

**Processus :**
1. Clic sur le bouton "Suspendre"
2. Dialogue de confirmation
3. Mise à jour du statut dans la base de données
4. Notification de succès

### 5. Bannir un Utilisateur

**Fonctionnalité :**
- Met le statut à "banned"
- L'utilisateur est complètement bloqué
- Action irréversible

**Processus :**
1. Clic sur le bouton "Bannir"
2. Dialogue de confirmation avec avertissement
3. Mise à jour du statut dans la base de données
4. Notification de succès

### 6. Réactiver un Utilisateur

**Fonctionnalité :**
- Change le statut de "suspended" à "active"
- L'utilisateur peut à nouveau se connecter

**Processus :**
1. Clic sur le bouton "Réactiver" (visible uniquement pour les utilisateurs suspendus)
2. Dialogue de confirmation
3. Mise à jour du statut dans la base de données
4. Notification de succès

### 7. Supprimer un Utilisateur

**Fonctionnalité :**
- Supprime l'utilisateur de la table `utilisateurs`
- Supprime le compte de `auth.users` (Supabase Auth)
- Action irréversible

**Processus :**
1. Clic sur le bouton "Supprimer"
2. Dialogue de confirmation avec avertissement
3. Suppression de la table `utilisateurs`
4. Suppression de `auth.users`
5. Notification de succès

### 8. Sécurité

**Contrôle d'accès :**
- Seuls les utilisateurs avec le rôle **ADMIN** peuvent accéder à cette page
- Vérification automatique via `useAuth().isAdmin`
- Message d'accès restreint pour les non-admins

**Protections supplémentaires :**
- Impossible de modifier son propre compte pour les actions critiques
- Impossible de modifier d'autres administrateurs (sauf si vous êtes ADMIN)
- Validation des formulaires côté client
- Gestion d'erreurs complète

### 9. Export PDF

**Fonctionnalité :**
- Export de tous les utilisateurs en PDF
- Utilise la fonction `exportUsersPDF()` du module `exportToPDF.js`
- Format professionnel avec logo et tableau

### 10. Statistiques Dashboard

**Cartes statistiques ajoutées :**
- Total utilisateurs
- Utilisateurs actifs
- Utilisateurs suspendus
- Utilisateurs bannis

**Intégration :**
- Les statistiques sont affichées dans `AdminStats.jsx`
- Mise à jour automatique lors du chargement
- Design cohérent avec le reste du dashboard

---

## 🗄️ Structure de la Base de Données

### Table `utilisateurs`

**Colonnes requises :**
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, FOREIGN KEY vers auth.users.id)
- nom (TEXT)
- email (TEXT, UNIQUE)
- role (TEXT) -- ADMIN, AGENT, SUPERVISOR, CENTRE
- centre_id (UUID, NULLABLE, FOREIGN KEY vers centres.id)
- avatar_url (TEXT, NULLABLE)
- status (TEXT, DEFAULT 'active') -- active, suspended, banned
- created_at (TIMESTAMPTZ)
```

**Migration SQL recommandée :**
```sql
-- Ajouter la colonne status si elle n'existe pas
ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_utilisateurs_status ON utilisateurs(status);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON utilisateurs(role);
```

---

## 🎨 Composants Utilisés

### Composants UI Réutilisables

1. **Modal** (`src/components/ui/Modal.jsx`)
   - Modal réutilisable pour les formulaires
   - Support responsive
   - Design moderne

2. **ConfirmDialog** (`src/components/ui/ConfirmDialog.jsx`)
   - Dialogue de confirmation pour les actions critiques
   - Types : warning, danger, info
   - États de chargement

3. **Button** (`src/components/ui/Button.jsx`)
   - Boutons stylisés avec variantes
   - Support des icônes
   - États disabled

4. **Input** (`src/components/ui/Input.jsx`)
   - Champs de saisie stylisés
   - Validation intégrée

5. **Toast** (`src/components/ui/Toast.jsx`)
   - Notifications toast pour les succès/erreurs
   - Auto-dismiss
   - Types : success, error, warning, info

---

## 📁 Structure des Fichiers

```
src/
├── pages/
│   ├── AdminDashboard.jsx          # Dashboard principal (import mis à jour)
│   └── admin/
│       ├── AdminUsers.jsx          # Page de gestion des utilisateurs (NOUVEAU)
│       └── AdminStats.jsx          # Statistiques (MIS À JOUR)
└── components/
    └── ui/
        ├── Modal.jsx               # Composant modal
        ├── ConfirmDialog.jsx       # Dialogue de confirmation
        ├── Button.jsx              # Boutons
        ├── Input.jsx               # Champs de saisie
        └── Toast.jsx               # Notifications
```

---

## 🔐 Politiques RLS Requises

### Table `utilisateurs`

**Lecture (SELECT) :**
```sql
CREATE POLICY "Authenticated users can select utilisateurs"
ON utilisateurs
FOR SELECT
TO authenticated
USING (true);
```

**Écriture (INSERT) :**
```sql
CREATE POLICY "Admins can insert utilisateurs"
ON utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);
```

**Mise à jour (UPDATE) :**
```sql
CREATE POLICY "Admins can update utilisateurs"
ON utilisateurs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);
```

**Suppression (DELETE) :**
```sql
CREATE POLICY "Admins can delete utilisateurs"
ON utilisateurs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);
```

---

## 🚀 Utilisation

### Accéder à la Gestion des Utilisateurs

1. Se connecter avec un compte **ADMIN**
2. Aller dans "Administration" → "Utilisateurs"
3. La page de gestion s'affiche avec toutes les fonctionnalités

### Créer un Utilisateur

1. Cliquer sur "Créer un utilisateur"
2. Remplir le formulaire :
   - Nom complet
   - Email
   - Mot de passe (minimum 6 caractères)
   - Rôle (ADMIN, AGENT, SUPERVISOR, CENTRE)
   - Centre associé (optionnel)
   - Photo de profil (optionnel)
3. Cliquer sur "Enregistrer"
4. L'utilisateur est créé avec le statut "active" par défaut

### Suspendre un Utilisateur

1. Trouver l'utilisateur dans le tableau
2. Cliquer sur le bouton "Suspendre" (icône avec slash)
3. Confirmer dans le dialogue
4. L'utilisateur ne pourra plus se connecter

### Bannir un Utilisateur

1. Trouver l'utilisateur dans le tableau
2. Cliquer sur le bouton "Bannir" (icône ban)
3. Confirmer dans le dialogue (action irréversible)
4. L'utilisateur est complètement bloqué

### Réactiver un Utilisateur

1. Trouver l'utilisateur suspendu dans le tableau
2. Cliquer sur le bouton "Réactiver" (icône check)
3. Confirmer dans le dialogue
4. L'utilisateur peut à nouveau se connecter

### Supprimer un Utilisateur

1. Trouver l'utilisateur dans le tableau
2. Cliquer sur le bouton "Supprimer" (icône trash)
3. Confirmer dans le dialogue (action irréversible)
4. L'utilisateur est supprimé de la base de données et de Supabase Auth

---

## ✅ Checklist de Fonctionnalités

### Interface
- [x] Tableau moderne avec toutes les colonnes
- [x] Cartes statistiques en haut
- [x] Barre de recherche fonctionnelle
- [x] Badges de statut colorés
- [x] Design responsive mobile/desktop
- [x] Bouton flottant pour créer

### Fonctionnalités CRUD
- [x] Créer un utilisateur
- [x] Modifier un utilisateur
- [x] Supprimer un utilisateur
- [x] Upload photo de profil

### Gestion des Statuts
- [x] Suspendre un utilisateur
- [x] Bannir un utilisateur
- [x] Réactiver un utilisateur
- [x] Affichage des statuts avec badges

### Sécurité
- [x] Accès restreint aux ADMIN uniquement
- [x] Protection contre auto-modification
- [x] Validation des formulaires
- [x] Gestion d'erreurs complète

### Rôles
- [x] Support ADMIN
- [x] Support AGENT
- [x] Support SUPERVISOR (nouveau)
- [x] Support CENTRE

### Statistiques
- [x] Total utilisateurs
- [x] Utilisateurs actifs
- [x] Utilisateurs suspendus
- [x] Utilisateurs bannis
- [x] Intégration dans AdminStats

### Export
- [x] Export PDF des utilisateurs

---

## 🎯 Résultat Final

Le système de gestion des utilisateurs est maintenant :
- ✅ **Complet** - Toutes les fonctionnalités CRUD + gestion des statuts
- ✅ **Sécurisé** - Accès restreint, validations, protections
- ✅ **Moderne** - Interface SaaS professionnelle
- ✅ **Robuste** - Gestion d'erreurs complète
- ✅ **Intégré** - Statistiques dans le dashboard
- ✅ **Maintenable** - Code propre et bien structuré

---

**Date de création :** $(date)
**Statut :** ✅ SYSTÈME COMPLET ET OPÉRATIONNEL
