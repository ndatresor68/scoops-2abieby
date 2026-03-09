# Système d'Administration - SCOOPS

## 🎯 Vue d'Ensemble

Le système d'administration complet permet aux administrateurs de gérer l'ensemble de la plateforme coopérative de manière sécurisée et efficace.

---

## 🔐 Sécurité

### Protection d'Accès

- ✅ **Vérification du rôle ADMIN** : Seuls les utilisateurs avec `role = "ADMIN"` peuvent accéder
- ✅ **Redirection automatique** : Les non-admins sont redirigés vers le dashboard
- ✅ **Protection au niveau composant** : Chaque section vérifie les permissions
- ✅ **Message d'accès restreint** : Affichage clair pour les utilisateurs non autorisés

### Implémentation

```javascript
const { isAdmin, role } = useAuth()

if (!isAdmin) {
  return <RestrictedAccess />
}
```

---

## 📊 Sections Administratives

### 1. Statistiques Système (`AdminStats`)

**Fonctionnalités:**
- ✅ Nombre total d'utilisateurs
- ✅ Nombre de centres
- ✅ Nombre de producteurs
- ✅ Total de cacao collecté (kg)
- ✅ Activité récente (derniers utilisateurs créés)

**Fichier:** `src/pages/admin/AdminStats.jsx`

**Caractéristiques:**
- Cartes statistiques avec icônes
- Design moderne et responsive
- Timeout protection pour les requêtes
- Gestion d'erreurs complète

### 2. Gestion des Utilisateurs (`AdminUsers`)

**Fonctionnalités:**
- ✅ Voir tous les utilisateurs
- ✅ Créer de nouveaux utilisateurs
- ✅ Modifier les rôles (ADMIN, AGENT, CENTRE)
- ✅ Modifier les informations utilisateur
- ✅ Supprimer des utilisateurs
- ✅ Assigner des centres aux utilisateurs
- ✅ Upload de photos de profil

**Fichier:** `src/pages/AdminUsers.jsx`

**Rôles disponibles:**
- `ADMIN` - Accès complet au système
- `CENTRE` - Gestion d'un centre spécifique
- `AGENT` - Accès standard

### 3. Gestion des Centres (`AdminCentres`)

**Fonctionnalités:**
- ✅ Créer de nouveaux centres
- ✅ Modifier les informations des centres
- ✅ Supprimer des centres
- ✅ Gérer les codes et localités

**Fichier:** `src/pages/admin/AdminCentres.jsx`

**Champs gérés:**
- Nom du centre
- Code unique
- Localité

### 4. Gestion des Producteurs (`AdminProducteurs`)

**Fonctionnalités:**
- ✅ Voir tous les producteurs
- ✅ Filtrer par centre
- ✅ Modifier les informations
- ✅ Supprimer des producteurs
- ✅ Export PDF
- ✅ Gestion complète des documents

**Fichier:** `src/pages/admin/AdminProducteurs.jsx`

**Note:** Réutilise le composant `Producteurs.jsx` existant avec toutes ses fonctionnalités.

### 5. Paramètres Système (`AdminSettings`)

**Fonctionnalités:**
- ✅ Nom de l'application
- ✅ Informations de la coopérative
- ✅ Devise/Motto
- ✅ Informations de contact (email, téléphone, adresse)

**Fichier:** `src/pages/admin/AdminSettings.jsx`

**Stockage:**
- Actuellement: localStorage (pour développement)
- Production: Table `settings` dans Supabase (à implémenter)

---

## 🎨 Interface Utilisateur

### Design

- ✅ **Layout moderne** : Design professionnel de niveau entreprise
- ✅ **Navigation par onglets** : Navigation intuitive entre sections
- ✅ **Responsive** : Optimisé pour mobile et desktop
- ✅ **Typographie claire** : Hiérarchie visuelle professionnelle
- ✅ **Icônes** : Utilisation de react-icons/fa6

### Navigation

Le tableau de bord admin utilise un système d'onglets pour naviguer entre les sections :

```
Administration
├── Statistiques
├── Utilisateurs
├── Centres
├── Producteurs
└── Paramètres
```

---

## 🔧 Intégration

### Layout Principal

Le système est intégré dans `Layout.jsx` :

```javascript
case "admin":
  return isAdmin ? <AdminDashboard /> : <DashboardCentral />
```

### Navigation

Le lien "Administration" apparaît dans la sidebar uniquement pour les admins :

```javascript
const modules = isAdmin
  ? [...BASE_MODULES, ADMIN_MODULE]
  : BASE_MODULES
```

---

## 📁 Structure des Fichiers

```
src/pages/
├── AdminDashboard.jsx          # Page principale admin
├── AdminUsers.jsx              # Gestion utilisateurs (existant)
└── admin/
    ├── AdminStats.jsx          # Statistiques système
    ├── AdminCentres.jsx        # Gestion centres
    ├── AdminProducteurs.jsx    # Gestion producteurs
    └── AdminSettings.jsx       # Paramètres système
```

---

## 🚀 Utilisation

### Accès Admin

1. Se connecter avec un compte ayant `role = "ADMIN"`
2. Cliquer sur "Administration" dans la sidebar
3. Naviguer entre les sections via les onglets

### Créer un Admin

Utiliser le script existant :

```bash
npm run create-admin
```

Ou via SQL :

```sql
-- Voir database/create_admin_user.sql
```

---

## ✅ Fonctionnalités Complètes

### Gestion Utilisateurs
- ✅ CRUD complet
- ✅ Changement de rôles
- ✅ Assignation de centres
- ✅ Upload d'avatar

### Gestion Centres
- ✅ CRUD complet
- ✅ Codes et localités
- ✅ Intégration avec utilisateurs

### Gestion Producteurs
- ✅ Vue complète
- ✅ Filtres avancés
- ✅ Export PDF
- ✅ Gestion documents

### Statistiques
- ✅ Vue d'ensemble système
- ✅ Métriques clés
- ✅ Activité récente

### Paramètres
- ✅ Configuration application
- ✅ Informations coopérative
- ✅ Contact

---

## 🔒 Sécurité Implémentée

1. **Vérification de rôle** : `isAdmin` check partout
2. **Redirection automatique** : Non-admins redirigés
3. **Messages clairs** : Accès restreint affiché
4. **Protection composants** : Chaque section vérifie les permissions

---

## 📝 Notes de Développement

### Améliorations Futures

1. **Table Settings** : Créer une table Supabase pour les paramètres
2. **Audit Log** : Logger toutes les actions admin
3. **Permissions granulaires** : Système de permissions plus fin
4. **Notifications** : Notifier les admins des actions importantes
5. **Backup/Restore** : Fonctionnalités de sauvegarde

### Timeout Protection

Toutes les requêtes Supabase ont des timeouts pour éviter les blocages :
- Stats: 15s
- Users: 10s
- Centres: 10s
- Producteurs: 15s

---

**Date de création:** $(date)
**Statut:** ✅ SYSTÈME D'ADMINISTRATION COMPLET ET OPÉRATIONNEL
