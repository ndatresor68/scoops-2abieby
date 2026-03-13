# Module Gestion Parcelles avec GPS et Leaflet

## 📋 Vue d'ensemble

Module complet de gestion des parcelles avec mesure GPS en temps réel, utilisant Leaflet pour la visualisation cartographique et Turf.js pour le calcul des surfaces.

## 🎯 Fonctionnalités

### 1. Mesure GPS en temps réel
- ✅ Suivi GPS continu avec `navigator.geolocation.watchPosition()`
- ✅ Affichage des points GPS sur la carte en temps réel
- ✅ Tracé de la ligne du chemin parcouru
- ✅ Précision GPS configurable (seuil par défaut: 10m)
- ✅ Mode plein écran sur mobile

### 2. Calcul de surface
- ✅ Fermeture automatique du polygone
- ✅ Calcul de la surface avec Turf.js
- ✅ Conversion automatique en hectares
- ✅ Affichage de la superficie calculée

### 3. Génération de code parcelle
- ✅ Format: `PRC-ANNEE-NUMERO` (ex: PRC-2026-0001)
- ✅ Numérotation automatique par année
- ✅ Code unique garanti

### 4. Formulaire après mesure
- ✅ Champs non modifiables: superficie, coordonnées, date mesure, agent, code parcelle
- ✅ Champs modifiables: producteur, type cacao, année plantation, notes
- ✅ Récupération automatique du code_producteur et centre_id lors de la sélection du producteur
- ✅ Aperçu de la parcelle sur la carte

### 5. Mode hors ligne
- ✅ Sauvegarde dans IndexedDB si internet indisponible
- ✅ Synchronisation automatique avec Supabase à la reconnexion
- ✅ Indicateur de statut de connexion

### 6. Vue admin
- ✅ Carte Leaflet affichant toutes les parcelles
- ✅ Polygones colorés par parcelle
- ✅ Popup avec informations (code, producteur, centre, superficie)
- ✅ Liste des parcelles avec détails
- ✅ Sélection d'une parcelle pour voir les détails

## 📁 Structure des fichiers

```
src/
├── components/
│   └── maps/
│       ├── GpsTracker.jsx          # Hook pour le tracking GPS
│       └── ParcelMap.jsx           # Composant carte Leaflet
├── pages/
│   ├── GestionParcelles.jsx       # Page principale avec workflow GPS
│   └── admin/
│       └── AdminParcelles.jsx     # Vue admin avec carte
└── utils/
    ├── indexedDB.js               # Utilitaires IndexedDB (mode hors ligne)
    └── parcelleCode.js            # Génération de code parcelle
```

## 🗄️ Base de données

### Table `parcelles`

Colonnes requises:
- `id` (UUID, PRIMARY KEY)
- `code_parcelle` (TEXT, UNIQUE) - Format PRC-ANNEE-NUMERO
- `producteur_id` (UUID, FK vers producteurs)
- `centre_id` (UUID, FK vers centres)
- `superficie` (NUMERIC) - En hectares
- `coordonnees` (TEXT, JSON) - Array de points GPS [{lat, lng}, ...]
- `date_mesure` (DATE) - Date de mesure GPS
- `type_cacao` (TEXT)
- `annee_plantation` (INTEGER)
- `notes` (TEXT)
- `created_by` (UUID, FK vers utilisateurs)
- `statut` (TEXT, default 'active')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Script SQL

Exécuter le script `database/add_parcelle_fields.sql` pour ajouter les colonnes manquantes:
- `code_parcelle`
- `date_mesure`

## 🚀 Utilisation

### Pour les Agents/Centres

1. **Accéder à la page Parcelles**
   - Menu latéral → "Gestion des Parcelles"

2. **Démarrer une mesure**
   - Cliquer sur "Nouvelle parcelle GPS"
   - Autoriser l'accès GPS si demandé
   - Marcher autour du champ à mesurer

3. **Terminer la mesure**
   - Cliquer sur "Terminer mesure" (minimum 3 points requis)
   - Le polygone se ferme automatiquement
   - La surface est calculée automatiquement

4. **Remplir le formulaire**
   - Sélectionner un producteur (code et centre récupérés automatiquement)
   - Renseigner type cacao, année plantation, notes
   - Vérifier l'aperçu de la parcelle sur la carte
   - Cliquer sur "Enregistrer"

5. **Mode hors ligne**
   - Si pas de connexion, la parcelle est sauvegardée localement
   - Synchronisation automatique à la reconnexion

### Pour les Admins

1. **Accéder à la vue admin**
   - Menu latéral → "Administration" → "Parcelles"

2. **Visualiser les parcelles**
   - Carte Leaflet avec tous les polygones
   - Cliquer sur un polygone pour voir les infos
   - Cliquer sur une ligne du tableau pour voir les détails

## 🔧 Configuration

### Précision GPS

Modifier le seuil de précision dans `GestionParcelles.jsx`:

```javascript
const { ... } = useGpsTracker({
  accuracyThreshold: 10, // 10 mètres (modifiable)
})
```

### Centre de la carte par défaut

Modifier dans `ParcelMap.jsx`:

```javascript
center = [5.3600, -4.0083] // Côte d'Ivoire par défaut
```

### Format du code parcelle

Modifier dans `parcelleCode.js`:

```javascript
const prefix = `PRC-${year}-` // Modifier PRC si nécessaire
```

## 📱 Responsive

- **Mobile**: Carte plein écran pendant la mesure
- **Desktop**: Carte intégrée dans la page
- **Tablette**: Adaptation automatique

## 🔒 Sécurité RLS

Les policies RLS sont respectées:
- **AGENT**: Voit uniquement les parcelles de son centre
- **CENTRE**: Voit uniquement les parcelles de son centre
- **ADMIN**: Voit toutes les parcelles

## 🐛 Dépannage

### GPS ne fonctionne pas
- Vérifier que le GPS est activé sur le téléphone
- Autoriser l'accès GPS dans les paramètres du navigateur
- Vérifier que l'application est en HTTPS (requis pour GPS)

### Carte ne s'affiche pas
- Vérifier la connexion internet (tiles OpenStreetMap)
- Vérifier que Leaflet CSS est importé
- Vérifier la console pour les erreurs

### Surface incorrecte
- Vérifier que le polygone est fermé (au moins 3 points)
- Vérifier la précision GPS (doit être < 100m)
- Vérifier que Turf.js est installé

### Synchronisation hors ligne ne fonctionne pas
- Vérifier que IndexedDB est supporté par le navigateur
- Vérifier la console pour les erreurs
- Vérifier que `syncPendingParcelles()` est appelé à la reconnexion

## 📦 Dépendances

- `leaflet`: ^1.9.4
- `react-leaflet`: ^5.0.0
- `@turf/turf`: ^7.3.4

## 🎨 Styles

Les styles CSS de Leaflet sont importés automatiquement dans `ParcelMap.jsx`:

```javascript
import "leaflet/dist/leaflet.css"
```

## 📝 Notes importantes

1. **HTTPS requis**: La géolocalisation nécessite HTTPS (sauf localhost)
2. **Permissions**: L'utilisateur doit autoriser l'accès GPS
3. **Précision**: La précision dépend du GPS du téléphone et de l'environnement
4. **Batterie**: Le tracking GPS consomme de la batterie
5. **Données**: Les tiles OpenStreetMap nécessitent une connexion internet

## 🔄 Workflow complet

```
Liste parcelles → Bouton "+" → Démarrer mesure → Marcher → Terminer → 
Formulaire → Enregistrer → Retour liste
```

## ✅ Checklist de déploiement

- [ ] Exécuter le script SQL `add_parcelle_fields.sql`
- [ ] Vérifier que les dépendances sont installées
- [ ] Tester le GPS sur un appareil réel
- [ ] Tester le mode hors ligne
- [ ] Vérifier les policies RLS
- [ ] Tester la synchronisation
- [ ] Vérifier la vue admin
