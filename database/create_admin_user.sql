-- Script SQL pour créer l'utilisateur administrateur
-- Exécutez ce script dans Supabase SQL Editor
-- Email: ndatresor68@gmail.com
-- Password: Leaticia2024@
-- Role: ADMIN

BEGIN;

-- 1. Créer l'utilisateur dans auth.users (si n'existe pas déjà)
DO $$
DECLARE
  v_email TEXT := 'ndatresor68@gmail.com';
  v_password TEXT := 'Leaticia2024@';
  v_user_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = v_email) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    -- Créer l'utilisateur via auth.users (nécessite service_role key côté serveur)
    -- Note: Cette partie doit être faite via l'API Supabase Admin ou le dashboard
    RAISE NOTICE 'L''utilisateur % doit être créé via le dashboard Supabase ou l''API Admin', v_email;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    RAISE NOTICE 'Utilisateur existant trouvé avec ID: %', v_user_id;
  END IF;
END $$;

-- 2. S'assurer que la table utilisateurs existe et a les bonnes colonnes
DO $$
BEGIN
  -- Créer la table si elle n'existe pas
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utilisateurs') THEN
    CREATE TABLE public.utilisateurs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      nom TEXT,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'AGENT',
      centre_id UUID,
      avatar_url TEXT,
      photo_profil TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_utilisateurs_user_id ON public.utilisateurs(user_id);
    CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);
  END IF;
  
  -- Ajouter les colonnes manquantes si elles n'existent pas
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'utilisateurs' AND column_name = 'user_id') THEN
    ALTER TABLE public.utilisateurs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'utilisateurs' AND column_name = 'photo_profil') THEN
    ALTER TABLE public.utilisateurs ADD COLUMN photo_profil TEXT;
  END IF;
END $$;

-- 3. Normaliser les rôles existants
UPDATE public.utilisateurs
SET role = UPPER(TRIM(role))
WHERE role IS NOT NULL;

-- 4. Mettre à jour ou créer le profil admin
DO $$
DECLARE
  v_email TEXT := 'ndatresor68@gmail.com';
  v_auth_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur auth
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur auth trouvé pour %. Créez-le d''abord via le dashboard Supabase.', v_email;
  ELSE
    -- Vérifier si le profil existe
    SELECT id INTO v_profile_id
    FROM public.utilisateurs
    WHERE user_id = v_auth_user_id OR email = v_email
    LIMIT 1;
    
    IF v_profile_id IS NOT NULL THEN
      -- Mettre à jour le profil existant
      UPDATE public.utilisateurs
      SET 
        role = 'ADMIN',
        email = v_email,
        user_id = v_auth_user_id,
        nom = COALESCE(nom, split_part(v_email, '@', 1)),
        updated_at = NOW()
      WHERE id = v_profile_id;
      
      RAISE NOTICE 'Profil admin mis à jour pour %', v_email;
    ELSE
      -- Créer un nouveau profil
      INSERT INTO public.utilisateurs (user_id, email, role, nom, created_at, updated_at)
      VALUES (v_auth_user_id, v_email, 'ADMIN', split_part(v_email, '@', 1), NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET role = 'ADMIN', updated_at = NOW();
      
      RAISE NOTICE 'Profil admin créé pour %', v_email;
    END IF;
  END IF;
END $$;

-- 5. S'assurer que la contrainte de rôle est correcte
ALTER TABLE public.utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('ADMIN', 'AGENT', 'CENTRE'));

-- 6. Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_utilisateurs_updated_at ON public.utilisateurs;
CREATE TRIGGER update_utilisateurs_updated_at
  BEFORE UPDATE ON public.utilisateurs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Instructions:
-- 1. Créez d'abord l'utilisateur dans auth.users via le dashboard Supabase ou l'API Admin
-- 2. Exécutez ensuite ce script SQL
-- 3. Vérifiez que le profil existe dans la table utilisateurs avec role = 'ADMIN'
