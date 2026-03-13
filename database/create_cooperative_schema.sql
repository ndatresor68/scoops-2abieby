-- Complete Cooperative Management System Database Schema
-- Supports three roles: ADMIN, AGENT, CENTRE

-- ============================================
-- 1. CENTRES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.centres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  ville TEXT,
  responsable TEXT,
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for centres
CREATE INDEX IF NOT EXISTS idx_centres_code ON public.centres(code);
CREATE INDEX IF NOT EXISTS idx_centres_nom ON public.centres(nom);

-- ============================================
-- 2. UTILISATEURS TABLE
-- ============================================
-- IMPORTANT: id is the PRIMARY KEY and must match auth.users.id
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'AGENT', 'CENTRE')),
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for utilisateurs
CREATE INDEX IF NOT EXISTS idx_utilisateurs_id ON public.utilisateurs(id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON public.utilisateurs(role);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_centre_id ON public.utilisateurs(centre_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_status ON public.utilisateurs(status);

-- ============================================
-- 3. PRODUCTEURS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.producteurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  telephone TEXT,
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  photo TEXT,
  photo_cni_recto TEXT,
  photo_cni_verso TEXT,
  carte_planteur TEXT,
  localite TEXT,
  ville TEXT,
  statut TEXT DEFAULT 'actif',
  created_by UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for producteurs
CREATE INDEX IF NOT EXISTS idx_producteurs_code ON public.producteurs(code);
CREATE INDEX IF NOT EXISTS idx_producteurs_centre_id ON public.producteurs(centre_id);
CREATE INDEX IF NOT EXISTS idx_producteurs_created_by ON public.producteurs(created_by);
CREATE INDEX IF NOT EXISTS idx_producteurs_nom ON public.producteurs(nom);

-- ============================================
-- 4. ACHATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.achats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE SET NULL,
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  poids NUMERIC NOT NULL,
  sacs INTEGER DEFAULT 0,
  prix_unitaire NUMERIC NOT NULL,
  montant NUMERIC NOT NULL,
  date_pesee TIMESTAMPTZ DEFAULT NOW(),
  utilisateur_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  nom_producteur TEXT,
  code_producteur TEXT,
  nom_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for achats
CREATE INDEX IF NOT EXISTS idx_achats_producteur_id ON public.achats(producteur_id);
CREATE INDEX IF NOT EXISTS idx_achats_centre_id ON public.achats(centre_id);
CREATE INDEX IF NOT EXISTS idx_achats_utilisateur_id ON public.achats(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_achats_date_pesee ON public.achats(date_pesee DESC);
CREATE INDEX IF NOT EXISTS idx_achats_created_at ON public.achats(created_at DESC);

-- ============================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES - CENTRES
-- ============================================

-- ADMIN: Full access to all centres
-- Uses is_admin() function to avoid recursion
CREATE POLICY "Admins can manage all centres"
ON public.centres
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- AGENT and CENTRE: Can read all centres
CREATE POLICY "Agents and Centres can read centres"
ON public.centres
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 7. RLS POLICIES - UTILISATEURS
-- ============================================

-- IMPORTANT: Policies cannot query the same table they protect (causes recursion)
-- Solution: Use security definer function or direct auth.uid() checks

-- Create helper function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Policy 1: Users can read their own profile (no recursion - direct auth.uid() check)
CREATE POLICY "Users can read own profile"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.utilisateurs
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy 4: Admins have full access (uses security definer function - no recursion)
CREATE POLICY "Admins full access"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 8. RLS POLICIES - PRODUCTEURS
-- ============================================

-- ADMIN: Full access to all producteurs
CREATE POLICY "Admins can manage all producteurs"
ON public.producteurs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- AGENT: Can manage producteurs (create, read, update)
CREATE POLICY "Agents can manage producteurs"
ON public.producteurs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'AGENT'
  )
);

-- CENTRE: Can only read producteurs from their centre
CREATE POLICY "Centres can read producteurs from their centre"
ON public.producteurs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs u
    WHERE u.id = auth.uid()
    AND u.role = 'CENTRE'
    AND u.centre_id = producteurs.centre_id
  )
);

-- ============================================
-- 9. RLS POLICIES - ACHATS
-- ============================================

-- ADMIN: Full access to all achats
CREATE POLICY "Admins can manage all achats"
ON public.achats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- CENTRE: Can manage achats from their centre only
CREATE POLICY "Centres can manage achats from their centre"
ON public.achats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs u
    WHERE u.id = auth.uid()
    AND u.role = 'CENTRE'
    AND u.centre_id = achats.centre_id
  )
);

-- AGENT: Cannot access achats (weighing is CENTRE only)
-- No policy for AGENT = no access

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centres TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utilisateurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producteurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achats TO authenticated;

-- ============================================
-- 11. UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_centres_updated_at
  BEFORE UPDATE ON public.centres
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utilisateurs_updated_at
  BEFORE UPDATE ON public.utilisateurs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producteurs_updated_at
  BEFORE UPDATE ON public.producteurs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achats_updated_at
  BEFORE UPDATE ON public.achats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. COMMENTS
-- ============================================
COMMENT ON TABLE public.centres IS 'Collection centres for cocoa cooperative';
COMMENT ON TABLE public.utilisateurs IS 'System users with roles: ADMIN, AGENT, CENTRE';
COMMENT ON TABLE public.producteurs IS 'Cocoa producers/farmers';
COMMENT ON TABLE public.achats IS 'Cocoa purchase/weighing records';

COMMENT ON COLUMN public.utilisateurs.role IS 'User role: ADMIN (full access), AGENT (field work), CENTRE (weighing)';
COMMENT ON COLUMN public.utilisateurs.centre_id IS 'Centre assignment for AGENT and CENTRE roles';
COMMENT ON COLUMN public.producteurs.centre_id IS 'Centre where producer is registered';
COMMENT ON COLUMN public.achats.centre_id IS 'Centre where weighing was performed';
