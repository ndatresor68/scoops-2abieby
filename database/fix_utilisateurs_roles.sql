-- Corrige la gestion des roles pour la table utilisateurs.
-- Execute ce script dans Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- 1) Verifier que la table existe
DO $$
BEGIN
  IF to_regclass('public.utilisateurs') IS NULL THEN
    RAISE EXCEPTION 'Table public.utilisateurs introuvable';
  END IF;
END $$;

-- 2) Ajouter le default UUID sur id si absent
DO $$
DECLARE
  id_default text;
BEGIN
  SELECT c.column_default
  INTO id_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'utilisateurs'
    AND c.column_name = 'id';

  IF id_default IS NULL THEN
    EXECUTE 'ALTER TABLE public.utilisateurs ALTER COLUMN id SET DEFAULT gen_random_uuid()';
  END IF;
END $$;

-- Normaliser les roles existants avant de poser la contrainte
UPDATE public.utilisateurs
SET role = UPPER(TRIM(role))
WHERE role IS NOT NULL;

-- 3) Remplacer la contrainte pour accepter ADMIN/AGENT/CENTRE
ALTER TABLE public.utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('ADMIN', 'AGENT', 'CENTRE'));

-- 4 et 5) Mettre ndatresor68@gmail.com en ADMIN (UPDATE si existe, sinon INSERT)
DO $$
DECLARE
  v_email constant text := 'ndatresor68@gmail.com';
  v_auth_user_id uuid;
BEGIN
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.utilisateurs
  SET role = 'ADMIN'
  WHERE LOWER(email) = LOWER(v_email);

  IF NOT FOUND THEN
    INSERT INTO public.utilisateurs (user_id, email, role, nom)
    VALUES (v_auth_user_id, v_email, 'ADMIN', split_part(v_email, '@', 1));
  END IF;
END $$;

commit;
