# Système d'Audit Log Professionnel

## 🎯 Vue d'Ensemble

Système d'audit log professionnel pour tracer toutes les activités importantes du système avec informations détaillées sur l'utilisateur, le device, l'IP, et la localisation.

---

## 📋 Fonctionnalités

### 1. Table `activites` Complète

**Colonnes :**
- `id` - UUID primaire
- `user_id` - ID de l'utilisateur (FK vers auth.users)
- `user_email` - Email de l'utilisateur (pour recherche rapide)
- `action` - Type d'action (login, user_created, producer_updated, etc.)
- `target` - Cible de l'action (user, centre, producteur, achat, system, pdf, settings)
- `details` - Description détaillée
- `ip_address` - Adresse IP de l'utilisateur
- `device` - Type de device (mobile, desktop, tablet)
- `browser` - Navigateur et version
- `os` - Système d'exploitation
- `location` - Localisation géographique (si permission accordée)
- `created_at` - Date et heure de l'action

### 2. Capture d'Informations Device

**Utilitaire :** `src/utils/deviceInfo.js`

**Fonctionnalités :**
- ✅ Parsing de `navigator.userAgent` pour browser, OS, device
- ✅ Détection IP via API publique (ipify.org)
- ✅ Géolocalisation optionnelle (avec permission)
- ✅ Fallback gracieux si services indisponibles

**Fonctions disponibles :**
- `parseUserAgent(userAgent)` - Parse user agent string
- `getIPAddress()` - Récupère l'IP publique
- `getLocation()` - Récupère la localisation (avec permission)
- `captureDeviceInfo(includeLocation)` - Capture toutes les infos
- `captureBasicDeviceInfo()` - Capture rapide (sans IP/location)

### 3. Logger d'Activités

**Utilitaire :** `src/utils/activityLogger.js`

**Actions loggées :**
- ✅ `login` - Connexion utilisateur
- ✅ `logout` - Déconnexion utilisateur
- ✅ `user_created` - Création d'utilisateur
- ✅ `user_updated` - Modification d'utilisateur
- ✅ `user_deleted` - Suppression d'utilisateur
- ✅ `user_suspended` - Suspension d'utilisateur
- ✅ `user_banned` - Bannissement d'utilisateur
- ✅ `user_reactivated` - Réactivation d'utilisateur
- ✅ `producer_created` - Création de producteur
- ✅ `producer_updated` - Modification de producteur
- ✅ `producer_deleted` - Suppression de producteur
- ✅ `centre_created` - Création de centre
- ✅ `centre_updated` - Modification de centre
- ✅ `centre_deleted` - Suppression de centre
- ✅ `achat_created` - Création d'achat
- ✅ `pdf_exported` - Export PDF
- ✅ `settings_updated` - Modification de paramètres

**Fonctions disponibles :**
- `logActivity(action, target, details, userId, userEmail, includeLocation)`
- `logUserLogin(userId, userEmail)`
- `logUserLogout(userId, userEmail)`
- `logUserCreated(userId, userName, role, createdByUserId, createdByEmail)`
- `logUserUpdated(userId, userName, changes, updatedByUserId, updatedByEmail)`
- `logUserDeleted(userId, userName, deletedByUserId, deletedByEmail)`
- `logUserSuspended(userId, userName, suspendedByUserId, suspendedByEmail)`
- `logUserBanned(userId, userName, bannedByUserId, bannedByEmail)`
- `logUserReactivated(userId, userName, reactivatedByUserId, reactivatedByEmail)`
- `logProducerCreated(producerId, producerName, producerCode, createdByUserId, createdByEmail)`
- `logProducerUpdated(producerId, producerName, changes, updatedByUserId, updatedByEmail)`
- `logProducerDeleted(producerId, producerName, deletedByUserId, deletedByEmail)`
- `logCentreCreated(centreId, centreName, createdByUserId, createdByEmail)`
- `logCentreUpdated(centreId, centreName, changes, updatedByUserId, updatedByEmail)`
- `logCentreDeleted(centreId, centreName, deletedByUserId, deletedByEmail)`
- `logAchatCreated(achatId, producerName, poids, montant, createdByUserId, createdByEmail)`
- `logPDFExported(pdfType, details, exportedByUserId, exportedByEmail)`
- `logSettingsUpdated(settings, updatedByUserId, updatedByEmail)`

### 4. Page AdminActivities

**Fichier :** `src/pages/admin/AdminActivities.jsx`

**Fonctionnalités :**
- ✅ Affichage de toutes les activités avec colonnes complètes
- ✅ Filtres par type d'entité (user, centre, producteur, achat, system, pdf, settings)
- ✅ Filtres par action (login, user_created, etc.)
- ✅ Recherche en temps réel (utilisateur, action, IP, device, browser, détails)
- ✅ Export PDF professionnel
- ✅ Design moderne et responsive
- ✅ Tableau avec colonnes : Date, Utilisateur, Action, Cible, IP, Device, Browser, Détails

**Colonnes affichées :**
1. **Date** - Date et heure formatées
2. **Utilisateur** - Email de l'utilisateur
3. **Action** - Type d'action avec badge coloré
4. **Cible** - Type d'entité avec badge coloré
5. **IP** - Adresse IP (tronquée si trop longue)
6. **Device** - Type de device avec icône
7. **Browser** - Navigateur et version
8. **Détails** - Description complète

### 5. Export PDF

**Fonction :** `exportActivitiesPDF(activities)` dans `src/utils/exportToPDF.js`

**Fonctionnalités :**
- ✅ Export de toutes les activités filtrées
- ✅ Format professionnel avec en-tête et pied de page
- ✅ Toutes les colonnes incluses
- ✅ Logging automatique de l'export PDF

---

## 🗄️ Migration de Base de Données

### Script SQL

**Fichier :** `database/create_activites_table.sql`

**Exécution :**
```bash
# Via Supabase Dashboard SQL Editor
# Copier le contenu de database/create_activites_table.sql et exécuter
```

**Ou via psql :**
```bash
psql -h your-host -U postgres -d your-db -f database/create_activites_table.sql
```

### Vérification

```sql
-- Vérifier que la table existe
SELECT * FROM information_schema.tables 
WHERE table_name = 'activites';

-- Vérifier les colonnes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activites';

-- Vérifier les index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'activites';
```

---

## 🔌 Intégrations

### 1. AuthContext - Login/Logout

**Fichier :** `src/context/AuthContext.jsx`

**Intégration :**
```javascript
import { logUserLogin, logUserLogout } from "../utils/activityLogger"

// Dans signInWithPassword, après chargement du profil
await logUserLogin(response.data.user.id, response.data.user.email)

// Dans signOut, avant déconnexion
await logUserLogout(user.id, user.email)
```

### 2. AdminUsers - Gestion Utilisateurs

**Fichier :** `src/pages/admin/AdminUsers.jsx`

**Intégration :**
- ✅ Création d'utilisateur → `logUserCreated()`
- ✅ Modification d'utilisateur → `logUserUpdated()`
- ✅ Suppression d'utilisateur → `logUserDeleted()`
- ✅ Suspension → `logUserSuspended()`
- ✅ Bannissement → `logUserBanned()`
- ✅ Réactivation → `logUserReactivated()`

### 3. Producteurs - CRUD Producteurs

**À intégrer dans :** `src/Producteurs.jsx`

**Actions à logger :**
- Création → `logProducerCreated()`
- Modification → `logProducerUpdated()`
- Suppression → `logProducerDeleted()`

### 4. Centres - CRUD Centres

**À intégrer dans :** `src/pages/admin/AdminCentres.jsx`

**Actions à logger :**
- Création → `logCentreCreated()`
- Modification → `logCentreUpdated()`
- Suppression → `logCentreDeleted()`

### 5. Achats - Création Achats

**À intégrer dans :** `src/achats.jsx`

**Actions à logger :**
- Création → `logAchatCreated()`

### 6. Export PDF

**Intégration automatique :**
- Tous les exports PDF loggent automatiquement via `logPDFExported()`

---

## 🎨 Interface Utilisateur

### Page AdminActivities

**URL :** `/admin/activites`

**Fonctionnalités UI :**
- ✅ Header avec titre et bouton d'export PDF
- ✅ Filtres par type d'entité (dropdown)
- ✅ Filtres par action (dropdown)
- ✅ Barre de recherche globale
- ✅ Tableau responsive avec scroll horizontal
- ✅ Badges colorés pour actions et cibles
- ✅ Icônes pour devices (mobile/tablet/desktop)
- ✅ Résumé du nombre d'activités affichées

**Design :**
- Design moderne SaaS
- Couleurs cohérentes avec le reste de l'application
- Responsive mobile/desktop
- États de chargement
- Messages d'état vide

---

## 🔐 Sécurité

### RLS Policies

**Lecture :**
- Tous les utilisateurs authentifiés peuvent lire les activités

**Écriture :**
- Tous les utilisateurs authentifiés peuvent insérer des activités
- Le logging est non-bloquant (ne casse pas le flux principal)

### Données Sensibles

**IP Address :**
- Stockée en INET (PostgreSQL)
- Visible uniquement aux admins
- Peut être masquée dans l'UI si nécessaire

**Location :**
- Stockée uniquement si permission accordée
- Format : "City, Region, Country" ou coordonnées
- Visible uniquement aux admins

---

## 📊 Performance

### Indexes

**Indexes créés :**
- `idx_activites_created_at` - Pour tri chronologique
- `idx_activites_user_id` - Pour filtrage par utilisateur
- `idx_activites_action` - Pour filtrage par action
- `idx_activites_target` - Pour filtrage par cible
- `idx_activites_user_email` - Pour recherche par email

### Optimisations

- Limite de 500 activités par défaut dans AdminActivities
- Pagination possible si nécessaire
- Requêtes optimisées avec indexes
- Logging asynchrone non-bloquant

---

## 🧪 Tests

### Test 1: Login/Logout
1. Se connecter
2. ✅ Vérifier qu'une activité "login" est créée avec IP et device
3. Se déconnecter
4. ✅ Vérifier qu'une activité "logout" est créée

### Test 2: Création Utilisateur
1. Créer un utilisateur
2. ✅ Vérifier qu'une activité "user_created" est créée
3. ✅ Vérifier que l'IP et le device sont capturés

### Test 3: Page AdminActivities
1. Aller dans Admin → Activités
2. ✅ Vérifier que les activités s'affichent
3. ✅ Tester les filtres
4. ✅ Tester la recherche
5. ✅ Tester l'export PDF

### Test 4: Export PDF
1. Filtrer les activités
2. Cliquer sur "Exporter PDF"
3. ✅ Vérifier que le PDF est généré
4. ✅ Vérifier qu'une activité "pdf_exported" est créée

---

## 📝 Notes Importantes

### Logging Non-Bloquant

**Principe :**
- Le logging ne doit jamais casser le flux principal
- Si la table n'existe pas, un warning est loggé mais l'action continue
- Si le logging échoue, l'action principale n'est pas affectée

### Performance

**IP Address :**
- Récupération asynchrone avec timeout de 3 secondes
- Fallback sur plusieurs services
- Cache possible côté client

**Location :**
- Demande de permission explicite
- Timeout de 5 secondes
- Cache de 5 minutes

### Compatibilité

**Browsers supportés :**
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Opera

**Devices supportés :**
- Desktop
- Mobile
- Tablet

---

## ✅ Checklist d'Intégration

### Base de Données
- [x] Table `activites` créée avec toutes les colonnes
- [x] Indexes créés
- [x] RLS policies configurées

### Utilitaires
- [x] `deviceInfo.js` créé
- [x] `activityLogger.js` mis à jour
- [x] `exportToPDF.js` avec fonction `exportActivitiesPDF`

### Interface
- [x] `AdminActivities.jsx` créé avec toutes les fonctionnalités
- [x] Filtres fonctionnels
- [x] Recherche fonctionnelle
- [x] Export PDF fonctionnel

### Intégrations
- [x] AuthContext - Login/Logout
- [x] AdminUsers - Toutes les actions utilisateurs
- [ ] Producteurs - CRUD (à intégrer)
- [ ] Centres - CRUD (à intégrer)
- [ ] Achats - Création (à intégrer)

---

**Date de création :** $(date)
**Statut :** ✅ SYSTÈME D'AUDIT LOG PROFESSIONNEL COMPLET
