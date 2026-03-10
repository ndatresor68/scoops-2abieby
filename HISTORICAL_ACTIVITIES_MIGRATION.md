# Migration des Activités Historiques

## 🎯 Objectif

Reconstruire l'historique complet des activités du système en créant des entrées d'audit log à partir des données existantes dans les tables :
- `utilisateurs`
- `producteurs`
- `centres`
- `achats`

## 📋 Script de Migration

**Fichier :** `database/migrate_historical_activities.sql`

### Fonctionnalités

1. **Insertion des activités utilisateurs**
   - Crée une activité `user_created` pour chaque utilisateur existant
   - Utilise la date `created_at` originale
   - Inclut le nom, email et rôle dans les détails

2. **Insertion des activités producteurs**
   - Crée une activité `producer_created` pour chaque producteur existant
   - Utilise la date `created_at` originale
   - Inclut le nom et code dans les détails
   - `user_email` = "System" (utilisateur original inconnu)

3. **Insertion des activités centres**
   - Crée une activité `centre_created` pour chaque centre existant
   - Utilise la date `created_at` originale
   - Inclut le nom et code dans les détails
   - `user_email` = "System"

4. **Insertion des activités achats**
   - Crée une activité `achat_created` pour chaque achat existant
   - Utilise la date `created_at` originale
   - Inclut le producteur, poids et montant dans les détails
   - Essaie de récupérer l'email de l'utilisateur, sinon "System"

5. **Évite les doublons**
   - Vérifie si l'activité existe déjà avant insertion
   - Compare par action, target, created_at et détails

6. **Préserve les dates originales**
   - Utilise `created_at` de chaque enregistrement source
   - Maintient l'ordre chronologique

## 🚀 Exécution

### Option 1: Via Supabase Dashboard

1. Aller dans **Supabase Dashboard** → **SQL Editor**
2. Ouvrir le fichier `database/migrate_historical_activities.sql`
3. Copier tout le contenu
4. Coller dans l'éditeur SQL
5. Cliquer sur **Run**

### Option 2: Via psql

```bash
psql -h your-host -U postgres -d your-db -f database/migrate_historical_activities.sql
```

### Option 3: Via Supabase CLI

```bash
supabase db execute -f database/migrate_historical_activities.sql
```

## ✅ Vérification

Après l'exécution, vérifier les résultats :

```sql
-- Compter les activités par type
SELECT 
  action,
  target,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM public.activites
GROUP BY action, target
ORDER BY target, action;

-- Vérifier les activités historiques (sans IP/device)
SELECT 
  COUNT(*) as historical_count
FROM public.activites
WHERE ip_address IS NULL 
  AND device IS NULL
  AND action IN ('user_created', 'producer_created', 'centre_created', 'achat_created');

-- Vérifier les activités récentes (avec IP/device)
SELECT 
  COUNT(*) as recent_count
FROM public.activites
WHERE ip_address IS NOT NULL 
  OR device IS NOT NULL;
```

## 📊 Résultats Attendus

Le script affichera un résumé :
```
Migration completed successfully!
Historical activities inserted:
  - Users: X
  - Producers: Y
  - Centres: Z
  - Achats: W
  - Total activities: X+Y+Z+W
```

## 🔄 Page AdminActivities

**Mise à jour :** `src/pages/admin/AdminActivities.jsx`

### Fonctionnalités Ajoutées

1. **Affichage Unifié**
   - Affiche à la fois les nouvelles activités (avec IP/device) et les historiques
   - Tri chronologique unifié
   - Badge "Historique" pour identifier les activités reconstruites

2. **Fallback Automatique**
   - Si la table `activites` est vide, génère automatiquement les activités historiques
   - Fonction `generateHistoricalActivities()` pour reconstruction à la volée

3. **Identification Visuelle**
   - Badge jaune "Historique" sur les activités reconstruites
   - Tooltip explicatif
   - Message d'information dans le résumé

### Colonnes Affichées

- **Date** - Date originale préservée
- **Utilisateur** - Email ou "System" pour historique
- **Action** - Type d'action
- **Cible** - Type d'entité
- **IP** - "—" pour historique (pas d'IP disponible)
- **Device** - "—" pour historique
- **Browser** - "—" pour historique
- **Détails** - Description complète

## 🎨 Interface Utilisateur

### Badge Historique

Les activités historiques sont identifiées par :
- Badge jaune "Historique" à côté de l'email utilisateur
- Tooltip : "Historical activity reconstructed from existing data"
- Message d'information dans le résumé

### Exemple d'Affichage

```
Date              | Utilisateur        | Action    | Cible      | IP | Device | Browser | Détails
------------------|--------------------|-----------|------------|----|--------|---------|------------------
2024-01-15 10:30 | admin@example.com  | Créé      | Utilisateur|... | Desktop| Chrome  | User John created
2024-01-10 14:20 | System [Historique]| Créé      | Producteur | —  | —      | —       | Producer ABC created
```

## 📝 Notes Importantes

### Données Manquantes

Pour les activités historiques :
- `ip_address` = NULL (pas disponible)
- `device` = NULL (pas disponible)
- `browser` = NULL (pas disponible)
- `os` = NULL (pas disponible)
- `location` = NULL (pas disponible)
- `user_email` = "System" si utilisateur original inconnu

### Performance

- Le script utilise des indexes pour éviter les doublons
- Limite de 200 enregistrements par table pour la génération à la volée
- Index sur `created_at` pour tri rapide

### Sécurité

- Le script utilise une transaction (BEGIN/COMMIT)
- Vérifie les doublons avant insertion
- Ne modifie pas les données sources

## 🔧 Dépannage

### Problème: Doublons créés

**Solution :**
```sql
-- Supprimer les doublons (garder le plus récent)
DELETE FROM public.activites a1
USING public.activites a2
WHERE a1.id < a2.id
  AND a1.action = a2.action
  AND a1.target = a2.target
  AND a1.created_at = a2.created_at
  AND a1.details = a2.details;
```

### Problème: Dates incorrectes

**Vérification :**
```sql
-- Vérifier les dates NULL
SELECT COUNT(*) FROM public.activites WHERE created_at IS NULL;

-- Corriger les dates NULL (utiliser NOW() comme fallback)
UPDATE public.activites
SET created_at = NOW()
WHERE created_at IS NULL;
```

### Problème: Migration partielle

**Réexécution sécurisée :**
- Le script vérifie les doublons avant insertion
- Peut être réexécuté sans créer de doublons
- Utilise `NOT EXISTS` pour éviter les conflits

## ✅ Checklist

- [x] Script SQL créé avec toutes les tables
- [x] Vérification des doublons implémentée
- [x] Préservation des dates originales
- [x] Page AdminActivities mise à jour
- [x] Badge historique ajouté
- [x] Fallback automatique implémenté
- [x] Documentation complète

## 🎯 Résultat Final

Après migration :
- ✅ Toutes les activités historiques sont dans la table `activites`
- ✅ Les nouvelles activités continuent d'être loggées normalement
- ✅ La page AdminActivities affiche un historique complet
- ✅ Les activités historiques sont clairement identifiées
- ✅ L'ordre chronologique est préservé

---

**Date de création :** $(date)
**Statut :** ✅ MIGRATION PRÊTE À EXÉCUTER
