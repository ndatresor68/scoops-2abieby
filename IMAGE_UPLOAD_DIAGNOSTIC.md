# Diagnostic et Correction du Flux d'Upload d'Images

## Problème Identifié
Les images s'uploadent correctement dans Supabase Storage, mais les colonnes `photo`, `photo_cni_recto`, et `photo_cni_verso` restent NULL dans la base de données.

## Corrections Apportées

### 1. ✅ Logs Détaillés Ajoutés

#### STEP 1: Vérification de l'Upload
- Log du fichier (nom, type, taille)
- Log du résultat de l'upload (data, error)
- Gestion d'erreurs complète

#### STEP 2: Vérification du Chemin Généré
- Log du chemin complet: `${folder}/${producteurId}/${fileName}`
- Confirmation que le même chemin est utilisé dans `getPublicUrl()`

#### STEP 3: Génération de l'URL Publique
- Log de l'URL publique générée
- Vérification que l'URL est valide

#### STEP 4: Sauvegarde dans la Base de Données
- Log du payload avant sauvegarde
- Log du résultat de l'update/insert
- Vérification que les données sont bien sauvegardées
- **Correction importante**: Ajout de `.select()` pour vérifier que l'update a fonctionné
- **Correction importante**: Les erreurs d'update lancent maintenant une exception au lieu d'être silencieuses

### 2. ✅ Colonnes de Base de Données Correctes

Le code utilise maintenant explicitement:
- `photo` (pas `photo_url`)
- `photo_cni_recto`
- `photo_cni_verso`
- `carte_planteur`

### 3. ✅ Flux de Création Corrigé

**Avant:**
- L'update des URLs échouait silencieusement si une erreur survenait

**Maintenant:**
- L'update utilise `.select()` pour vérifier le succès
- Les erreurs lancent une exception
- Logs détaillés à chaque étape

### 4. ✅ Flux de Mise à Jour Corrigé

- Logs détaillés du payload avant update
- Vérification que les URLs sont bien sauvegardées après update
- Logs de confirmation avec les valeurs sauvegardées

## Structure des Chemins

Les fichiers sont organisés comme suit dans Supabase Storage:

```
producteurs/
  photos/
    {producteurId}/
      {timestamp}-{randomId}.{ext}
  documents/
    {producteurId}/
      {timestamp}-{randomId}.{ext}
```

## Vérification des Colonnes

### ✅ Colonnes Utilisées (CORRECTES)
- `photo`
- `photo_cni_recto`
- `photo_cni_verso`
- `carte_planteur`

### ❌ Colonnes NON Utilisées
- `photo_url` (n'existe pas)
- `image` (n'existe pas)
- `avatar` (n'existe pas)

## Affichage dans l'UI

Le tableau utilise correctement:
```jsx
<img src={producteur.photo} alt={producteur.nom} />
```

## Export PDF

L'export PDF utilise:
```javascript
producteur.photo
```

## Tests à Effectuer

1. **Créer un nouveau producteur avec photo:**
   - Ouvrir la console du navigateur
   - Vérifier les logs `[uploadFile]` et `[handleSubmit]`
   - Vérifier que l'image apparaît dans Storage
   - Vérifier que la colonne `photo` contient l'URL dans la base de données
   - Vérifier que l'image s'affiche dans le tableau

2. **Modifier un producteur existant:**
   - Ajouter une nouvelle photo
   - Vérifier les logs de mise à jour
   - Vérifier que l'URL est mise à jour dans la base de données

3. **Vérifier les RLS Policies:**
   - Les utilisateurs authentifiés doivent pouvoir INSERT et UPDATE sur la table `producteurs`
   - Les utilisateurs authentifiés doivent pouvoir UPLOAD dans le bucket `producteurs`

## Logs à Surveiller

Lors de l'upload, vous devriez voir dans la console:

```
[uploadFile] ===== STEP 1: VERIFY FILE UPLOAD =====
[uploadFile] File: {name, type, size}
[uploadFile] ===== STEP 2: VERIFY GENERATED PATH =====
[uploadFile] Upload path: photos/{producteurId}/{fileName}
[uploadFile] Upload result: {data, error}
[uploadFile] ===== STEP 3: GENERATE PUBLIC URL =====
[uploadFile] Generated public URL: https://...
[handleSubmit] ===== STEP 4: STORE URL IN DATABASE =====
[handleSubmit] Update payload: {photo: "https://...", ...}
[handleSubmit] Update result: {data: [...], error: null}
[handleSubmit] Verified photo in database: https://...
```

## Si les URLs ne sont toujours pas sauvegardées

1. Vérifier les logs de la console pour identifier l'étape qui échoue
2. Vérifier les politiques RLS de la table `producteurs`
3. Vérifier que les colonnes existent dans la base de données:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'producteurs' 
   AND column_name IN ('photo', 'photo_cni_recto', 'photo_cni_verso');
   ```
4. Vérifier les permissions d'écriture sur la table

## Commandes SQL Utiles

### Vérifier les colonnes
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'producteurs'
AND column_name IN ('photo', 'photo_cni_recto', 'photo_cni_verso');
```

### Vérifier les politiques RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'producteurs';
```

### Tester une mise à jour manuelle
```sql
UPDATE producteurs 
SET photo = 'https://test-url.com/image.jpg'
WHERE id = 'your-producteur-id';
```

## Résultat Attendu

Après ces corrections:
- ✅ Les images s'uploadent dans Storage
- ✅ Les URLs sont sauvegardées dans la base de données
- ✅ Les images s'affichent dans le tableau
- ✅ Les images apparaissent dans l'export PDF
- ✅ Les logs détaillés permettent de diagnostiquer les problèmes
