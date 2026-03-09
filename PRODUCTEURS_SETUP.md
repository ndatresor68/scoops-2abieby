# Configuration du module Producteurs

## Configuration Supabase Storage

Pour que le module producteurs fonctionne correctement, vous devez créer un bucket Supabase Storage nommé `producteurs` avec la structure suivante :

### 1. Créer le bucket

Dans votre dashboard Supabase :
1. Allez dans **Storage**
2. Cliquez sur **New bucket**
3. Nommez-le `producteurs`
4. Cochez **Public bucket** pour permettre l'accès aux images
5. Créez le bucket

### 2. Structure des dossiers

Le bucket `producteurs` contiendra automatiquement :
- `producteurs/photos/` - Photos des producteurs
- `producteurs/documents/` - Documents (CNI, carte planteur)

### 3. Politiques RLS (Row Level Security)

Assurez-vous que les politiques RLS permettent :
- **Lecture** : Tous les utilisateurs authentifiés peuvent lire
- **Écriture** : Seuls les utilisateurs avec les droits appropriés peuvent écrire

Exemple de politique SQL :

```sql
-- Politique de lecture
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'producteurs');

-- Politique d'écriture (ajustez selon vos besoins)
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'producteurs' AND auth.role() = 'authenticated');
```

## Fonctionnalités implémentées

✅ **Filtre par centre** - Filtrage des producteurs par centre avec dropdown
✅ **Recherche** - Recherche par nom, code, téléphone ou centre
✅ **Photo producteur** - Upload via caméra ou fichier
✅ **Documents** - CNI recto, CNI verso, Carte planteur
✅ **Affichage photo** - Colonne photo ronde dans le tableau
✅ **Page détail** - Modal avec toutes les informations et documents
✅ **Export PDF** - Export professionnel avec logo et tableau
✅ **Responsive mobile** - Vue en cartes sur mobile, tableau sur desktop

## Utilisation

### Ajouter un producteur
1. Cliquez sur "Ajouter un producteur"
2. Remplissez le formulaire
3. Ajoutez la photo (caméra ou fichier)
4. Ajoutez les documents si disponibles
5. Enregistrez

### Filtrer les producteurs
- Utilisez le dropdown "Tous les centres" pour filtrer par centre
- Utilisez la barre de recherche pour rechercher par nom
- Cliquez sur "Réinitialiser" pour effacer les filtres

### Voir les détails
- Cliquez sur une ligne du tableau (ou une carte sur mobile)
- La modal s'ouvre avec toutes les informations et documents

### Exporter en PDF
- Cliquez sur "Exporter PDF"
- Le PDF est généré avec le logo, la liste et la date

## Notes importantes

- Les images sont stockées dans Supabase Storage
- Les URLs des images sont sauvegardées dans la table `producteurs`
- Les colonnes nécessaires dans la table `producteurs` :
  - `photo` (text)
  - `photo_cni_recto` (text)
  - `photo_cni_verso` (text)
  - `carte_planteur` (text)

Si ces colonnes n'existent pas, ajoutez-les à votre table :

```sql
ALTER TABLE producteurs
ADD COLUMN IF NOT EXISTS photo TEXT,
ADD COLUMN IF NOT EXISTS photo_cni_recto TEXT,
ADD COLUMN IF NOT EXISTS photo_cni_verso TEXT,
ADD COLUMN IF NOT EXISTS carte_planteur TEXT;
```
