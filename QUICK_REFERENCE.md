# ⚡ QUICK REFERENCE - Cheat Sheet Performance

Utilisez ce fichier comme référence rapide pendant l'implémentation.

---

## 🎯 9 PROBLÈMES = 9 SOLUTIONS

| # | Problème | Fichier | Solution | Impact |
|---|----------|---------|----------|--------|
| 1 | 9 requêtes dashboard | `DashboardCentral.jsx` | Cache + 3 queries | -85% |
| 2 | 2081 producteurs sans pagination | `Producteurs.jsx` | Pagination 30/page | -75% |
| 3 | 3 retries login | `AuthContext.jsx` | 1 requête smart | -70% |
| 4 | Images non compressées | `ImageUpload.jsx` | browser-image-compression | -90% storage |
| 5 | PDF export gelé UI | `exportToPDF.js` | Web Worker | -95% block |
| 6 | Pas de real-time | N/A | useRealtimeData hook | instant data |
| 7 | Listes non virtualisées | `Producteurs.jsx` | react-window | -80% DOM |
| 8 | Bundle énorme | `vite.config.js` | Code splitting | -45% bundle |
| 9 | Firebase inutilisé | `firebase.js` | Supprimer | -500KB |

---

## 📦 PACKAGES À INSTALLER

```bash
# Images
npm install browser-image-compression

# Listes virtualisées
npm install react-window

# Déjà installé: jsPDF, xlsx, supabase-js
```

---

## 📁 FICHIERS À CRÉER

```
src/
├─ services/
│  ├─ dashboardService.js          (NEW)
│  ├─ producteursService.js        (NEW)
│  ├─ imageCompressionService.js   (NEW)
│  └─ exportWorkerService.js       (NEW)
├─ hooks/
│  └─ useRealtimeData.js           (NEW)
└─ workers/
   └─ pdfWorker.js                 (NEW)
```

---

## 📝 FICHIERS À MODIFIER

```
src/
├─ DashboardCentral.jsx    (utiliser dashboardService)
├─ Producteurs.jsx         (ajouter pagination)
├─ Parametres.jsx          (supprimer Firebase)
├─ context/
│  └─ AuthContext.jsx      (simplifier login)
├─ components/
│  └─ ImageUpload.jsx      (ajouter compression)
└─ firebase.js             (SUPPRIMER)

Racine:
├─ vite.config.js          (code splitting)
└─ package.json            (supprimer firebase)
```

---

## ⏱️ TIMELINE

| Jour | Tâche | Durée | Fichiers |
|------|-------|-------|----------|
| 1 | Dashboard optimisé | 4-5h | `dashboardService.js` + `DashboardCentral.jsx` |
| 2 | Pagination + Auth | 4-5h | `producteursService.js` + `AuthContext.jsx` |
| 3 | Images + Export | 3-4h | `imageCompressionService.js` + `pdfWorker.js` |
| 4 | Real-time + Virtual | 3h | `useRealtimeData.js` + react-window |
| 5 | Code split | 2-3h | `vite.config.js` |
| 6 | Nettoyage | 2h | Supprimer Firebase |
| 7 | Tests + Commit | 2-3h | Validation complète |

---

## 💻 COMMANDES ESSENTIELLES

```bash
# Développement
npm run dev              # Démarrer dev server
npm run build           # Build production
npm run lint            # Vérifier erreurs

# Vérifier performance
npm run build           # Créer dist
du -sh dist/            # Taille bundle

# Vérifier imports
grep -r "firebase" src/ # Chercher Firebase
grep -r "import" src/   # Tous les imports

# Nettoyer
rm -rf node_modules package-lock.json
npm install
npm run build

# Tests final
npm run preview         # Prévisualiser build
# Puis F12 > Lighthouse > Generate report
```

---

## 📊 RÉSULTATS ATTENDUS

### Dashboard
```
Avant: 3-5s
Après: 500-800ms
Check: DevTools > Network
```

### Producteurs
```
Avant: 4-6s
Après: 1-2s
Check: Page paginée, 30 items
```

### Login
```
Avant: 3-5s
Après: 800ms-1.5s
Check: Une seule requête
```

### Bundle
```
Avant: 450KB
Après: 200-250KB
Check: npm run build && du -sh dist/
```

### Lighthouse
```
Avant: 58/100
Après: 92/100+
Check: F12 > Lighthouse > Generate
```

---

## 🔍 VÉRIFICATION CHECKLIST

### Jour 1
```
□ dashboardService.js créé
□ DashboardCentral utilise le service
□ Cache localStorage fonctionne
□ DevTools: 3 requêtes au lieu de 9
□ Temps < 1s
```

### Jour 2
```
□ producteursService.js créé
□ Producteurs paginé (30/page)
□ Boutons pagination visibles
□ Login < 1.5s
□ Une seule requête auth
```

### Jour 3
```
□ Images compressées < 1.5MB
□ Export PDF sans gelage UI
□ pdfWorker.js fonctionne
□ Pas d'erreur console
```

### Jour 4
```
□ Real-time subscriptions actives
□ Données mises à jour auto
□ Virtualisation 2000+ items
□ 60fps scroll
```

### Jour 5
```
□ Code splitting: 3 chunks
□ Lazy loading: pages load async
□ Bundle < 300KB
□ npm run build sans erreur
```

### Jour 6
```
□ Firebase supprimé du code
□ Aucun import firebase
□ Build < 200KB
□ npm install successful
```

### Jour 7
```
□ Lighthouse 90+
□ DevTools: Network optimisé
□ Memory < 80MB
□ 0 console errors
□ Commit sur main
```

---

## 🐛 TROUBLESHOOTING RAPIDE

| Erreur | Solution |
|--------|----------|
| `Cannot find module 'dashboardService'` | Vérifier chemin relatif: `./services/dashboardService.js` |
| `useRealtimeData is not a function` | Vérifier imports: `import { useRealtimeData } from './hooks/useRealtimeData'` |
| `Worker failed to initialize` | Vérifier chemin worker: `new URL('../workers/pdfWorker.js', import.meta.url)` |
| `compression timeout` | Augmenter timeout: `maxSizeMB: 2` |
| `Firebase undefined` | L'avoir déjà supprimé du code |
| `Bundle still 450KB` | Vérifier Firebase vraiment supprimé: `grep -r firebase src/` |

---

## 📱 TESTER SUR MOBILE

```bash
# iPhone/iPad (Mac)
npm run dev
# Ouvrir sur même réseau: http://[votre-ip]:3000

# Android
adb reverse tcp:3000 tcp:3000
npm run dev
# Ouvrir: http://localhost:3000

# Chrome DevTools
F12 > Toggle Device Toolbar (Ctrl+Shift+M)
```

---

## 🎯 MÉTRIQUES À TRACKER

Avant chaque modification:
1. Prendre screenshot DevTools Network
2. Note temps de chargement
3. Note taille bundle

Après chaque modification:
1. Nouveau screenshot
2. Vérifier amélioration
3. Documenter résultats

---

## 📊 TEMPLATE AVANT/APRÈS

```
FONCTIONNALITÉ: [Nom]
DATE: [Date]

AVANT:
- Temps: [XXs]
- Requêtes: [X]
- Bundle: [XXKb]
- Lighthouse: [XX/100]

APRÈS:
- Temps: [XXs]
- Requêtes: [X]
- Bundle: [XXKb]
- Lighthouse: [XX/100]

GAIN:
- Temps: [XX%]
- Requêtes: [XX%]
- Bundle: [XX%]
- Lighthouse: [+XX pts]
```

---

## 🚀 CODE SNIPPETS RAPIDES

### Service cache simple
```javascript
const CACHE_KEY = 'data_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCache() {
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null
  
  const { data, timestamp } = JSON.parse(cached)
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_KEY)
    return null
  }
  
  return data
}

function setCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }))
}
```

### Pagination simple
```javascript
const PAGE_SIZE = 30
const [page, setPage] = useState(1)

const fetchPage = async () => {
  const start = (page - 1) * PAGE_SIZE
  const { data } = await supabase
    .from('table')
    .select('*')
    .range(start, start + PAGE_SIZE - 1)
  
  setData(data)
}
```

### Real-time subscription
```javascript
useEffect(() => {
  const channel = supabase
    .channel('changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'items' },
      (payload) => {
        setData(prev => 
          payload.eventType === 'INSERT' ? [...prev, payload.new] : prev
        )
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

### Web Worker
```javascript
// worker.js
self.onmessage = (e) => {
  const result = expensiveComputation(e.data)
  self.postMessage(result)
}

// component
const worker = new Worker('worker.js')
worker.postMessage(largeData)
worker.onmessage = (e) => setResult(e.data)
```

---

## 💡 PRO TIPS

1. **Cache first, update second**
   ```javascript
   const cached = getCache()
   if (cached) setData(cached)
   
   fetchFresh().then(setData).then(setCache)
   ```

2. **Debounce les recherches**
   ```javascript
   const debounce = (fn, delay) => {
     let timeout
     return (...args) => {
       clearTimeout(timeout)
       timeout = setTimeout(() => fn(...args), delay)
     }
   }
   ```

3. **Lazy load les composants lourds**
   ```javascript
   const Heavy = lazy(() => import('./Heavy'))
   <Suspense fallback={<Spinner />}>
     <Heavy />
   </Suspense>
   ```

4. **Vérifier DevTools souvent**
   ```
   F12 > Network > Reload
   Vérifier: nombre requêtes, taille, temps
   ```

---

## 📞 RESSOURCES

- DevTools Network: `F12 > Network tab`
- DevTools Performance: `F12 > Performance tab`
- Lighthouse: `F12 > Lighthouse tab`
- Local Storage: `F12 > Application > Storage`

---

## ✅ READY?

```
□ Documents lus
□ Packages installés
□ Fichiers préparés
□ Première modif prête

LET'S GO! 🚀
```

---

**Signet cette page pour reference rapide pendant l'implémentation!**

