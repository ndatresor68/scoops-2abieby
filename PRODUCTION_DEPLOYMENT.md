# Guide de Déploiement en Production

## Configuration des Variables d'Environnement

L'application nécessite deux variables d'environnement pour se connecter à Supabase :

### Variables Requises

1. **VITE_SUPABASE_URL**
   - Format: `https://xxxxx.supabase.co`
   - Trouvez cette valeur dans : Supabase Dashboard > Settings > API > Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Votre clé API publique/anonyme
   - Trouvez cette valeur dans : Supabase Dashboard > Settings > API > Project API keys > `anon` `public`

### Configuration par Plateforme

#### Vercel

1. Allez dans votre projet Vercel
2. Settings > Environment Variables
3. Ajoutez :
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
4. Sélectionnez les environnements (Production, Preview, Development)
5. Redéployez l'application

#### Netlify

1. Allez dans votre site Netlify
2. Site Settings > Environment Variables
3. Ajoutez :
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
4. Redéployez l'application

#### Autres Plateformes

Pour toute autre plateforme de déploiement :
1. Trouvez la section "Environment Variables" ou "Config Vars"
2. Ajoutez les deux variables avec le préfixe `VITE_`
3. Redéployez après avoir ajouté les variables

### Vérification

Après le déploiement, vérifiez dans la console du navigateur :
- ✅ "Supabase client initialized (production)" = Configuration correcte
- ❌ "Supabase client initialized with placeholder values" = Variables manquantes

### Erreur "Failed to fetch"

Si vous voyez l'erreur "Failed to fetch" en production :

1. **Vérifiez les variables d'environnement**
   - Les variables doivent être définies AVANT le build
   - Le préfixe `VITE_` est obligatoire
   - Pas d'espaces avant/après les valeurs

2. **Vérifiez la configuration CORS dans Supabase**
   - Supabase Dashboard > Settings > API
   - Ajoutez votre domaine de production dans "Allowed Origins"
   - Exemple: `https://your-app.vercel.app`

3. **Vérifiez l'URL Supabase**
   - Doit commencer par `https://`
   - Doit se terminer par `.supabase.co`
   - Pas d'espaces ou de caractères spéciaux

4. **Vérifiez la clé API**
   - Utilisez la clé `anon` ou `public`, PAS la `service_role`
   - La clé doit être complète (généralement très longue)

### Test Local de Production

Pour tester la build de production localement :

```bash
# Créez un fichier .env.local avec vos variables
echo "VITE_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env.local

# Build
npm run build

# Preview
npm run preview
```

### Support

Si le problème persiste :
1. Vérifiez les logs de la console du navigateur
2. Vérifiez les logs de votre plateforme de déploiement
3. Vérifiez que Supabase est accessible depuis votre réseau
