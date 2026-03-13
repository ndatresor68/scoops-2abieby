-- Multi-Centre Cooperative Management System
-- Complete schema with RLS policies for centre isolation
-- Each centre only sees its own data

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
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'AGENT', 'CENTRE')),
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for utilisateurs
CREATE INDEX IF NOT EXISTS idx_utilisateurs_id ON public.utilisateurs(id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON public.utilisateurs(role);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_centre_id ON public.utilisateurs(centre_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_status ON public.utilisateurs(status);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_actif ON public.utilisateurs(actif);

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
-- 5. PARCELLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.parcelles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producteur_id UUID REFERENCES public.producteurs(id) ON DELETE CASCADE,
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  superficie NUMERIC NOT NULL,
  localisation TEXT,
  coordonnees TEXT,
  type_cacao TEXT,
  annee_plantation INTEGER,
  statut TEXT DEFAULT 'active',
  created_by UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for parcelles
CREATE INDEX IF NOT EXISTS idx_parcelles_producteur_id ON public.parcelles(producteur_id);
CREATE INDEX IF NOT EXISTS idx_parcelles_centre_id ON public.parcelles(centre_id);
CREATE INDEX IF NOT EXISTS idx_parcelles_created_by ON public.parcelles(created_by);

-- ============================================
-- 6. LIVRAISONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.livraisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  poids_total NUMERIC NOT NULL,
  nombre_sacs INTEGER DEFAULT 0,
  statut TEXT NOT NULL CHECK (statut IN ('EN_ATTENTE', 'VALIDE')),
  date_livraison TIMESTAMPTZ DEFAULT NOW(),
  utilisateur_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for livraisons
CREATE INDEX IF NOT EXISTS idx_livraisons_centre_id ON public.livraisons(centre_id);
CREATE INDEX IF NOT EXISTS idx_livraisons_statut ON public.livraisons(statut);
CREATE INDEX IF NOT EXISTS idx_livraisons_date_livraison ON public.livraisons(date_livraison DESC);
CREATE INDEX IF NOT EXISTS idx_livraisons_created_at ON public.livraisons(created_at DESC);

-- ============================================
-- 7. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. HELPER FUNCTIONS (Avoid RLS Recursion)
-- ============================================

-- Function to check if user is admin
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

-- Function to check if user is agent
CREATE OR REPLACE FUNCTION public.is_agent(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = user_id AND role = 'AGENT'
  );
END;
$$;

-- Function to get user's centre_id
CREATE OR REPLACE FUNCTION public.get_user_centre_id(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  centre_uuid UUID;
BEGIN
  SELECT centre_id INTO centre_uuid
  FROM public.utilisateurs
  WHERE id = user_id
  LIMIT 1;
  RETURN centre_uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_centre_id(UUID) TO authenticated;

-- ============================================
-- 9. RLS POLICIES - CENTRES
-- ============================================

-- ADMIN: Full access to all centres
CREATE POLICY "Admins can manage all centres"
ON public.centres
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- All authenticated users: Can read all centres
CREATE POLICY "All users can read centres"
ON public.centres
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 10. RLS POLICIES - UTILISATEURS
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.utilisateurs
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins full access utilisateurs"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 11. RLS POLICIES - PRODUCTEURS
-- ============================================

-- ADMIN: Full access to all producteurs
CREATE POLICY "Admins can manage all producteurs"
ON public.producteurs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- AGENT: Can manage producteurs from their centre only
CREATE POLICY "Agents can manage producteurs from their centre"
ON public.producteurs
FOR ALL
TO authenticated
USING (
  public.is_agent(auth.uid())
  AND public.get_user_centre_id(auth.uid()) = centre_id
)
WITH CHECK (
  public.is_agent(auth.uid())
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- CENTRE: Can read producteurs from their centre only
CREATE POLICY "Centres can read producteurs from their centre"
ON public.producteurs
FOR SELECT
TO authenticated
USING (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- ============================================
-- 12. RLS POLICIES - ACHATS
-- ============================================

-- ADMIN: Full access to all achats
CREATE POLICY "Admins can manage all achats"
ON public.achats
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- CENTRE: Can manage achats from their centre only
CREATE POLICY "Centres can manage achats from their centre"
ON public.achats
FOR ALL
TO authenticated
USING (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
)
WITH CHECK (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- ============================================
-- 13. RLS POLICIES - PARCELLES
-- ============================================

-- ADMIN: Full access to all parcelles
CREATE POLICY "Admins can manage all parcelles"
ON public.parcelles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- AGENT: Can manage parcelles from their centre only
CREATE POLICY "Agents can manage parcelles from their centre"
ON public.parcelles
FOR ALL
TO authenticated
USING (
  public.is_agent(auth.uid())
  AND public.get_user_centre_id(auth.uid()) = centre_id
)
WITH CHECK (
  public.is_agent(auth.uid())
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- CENTRE: Can read parcelles from their centre only
CREATE POLICY "Centres can read parcelles from their centre"
ON public.parcelles
FOR SELECT
TO authenticated
USING (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- ============================================
-- 14. RLS POLICIES - LIVRAISONS
-- ============================================

-- ADMIN: Full access to all livraisons
CREATE POLICY "Admins can manage all livraisons"
ON public.livraisons
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- CENTRE: Can manage livraisons from their centre only
CREATE POLICY "Centres can manage livraisons from their centre"
ON public.livraisons
FOR ALL
TO authenticated
USING (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
)
WITH CHECK (
  public.get_user_centre_id(auth.uid()) IS NOT NULL
  AND public.get_user_centre_id(auth.uid()) = centre_id
);

-- ============================================
-- 15. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centres TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utilisateurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producteurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livraisons TO authenticated;

-- ============================================
-- 16. UPDATE TRIGGERS
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

CREATE TRIGGER update_parcelles_updated_at
  BEFORE UPDATE ON public.parcelles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livraisons_updated_at
  BEFORE UPDATE ON public.livraisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 17. COMMENTS
-- ============================================
COMMENT ON TABLE public.centres IS 'Collection centres for cocoa cooperative';
COMMENT ON TABLE public.utilisateurs IS 'System users with roles: ADMIN, AGENT, CENTRE';
COMMENT ON TABLE public.producteurs IS 'Cocoa producers/farmers';
COMMENT ON TABLE public.achats IS 'Cocoa purchase/weighing records';
COMMENT ON TABLE public.parcelles IS 'Producer land parcels';
COMMENT ON TABLE public.livraisons IS 'Cocoa deliveries to processing';

COMMENT ON COLUMN public.utilisateurs.role IS 'User role: ADMIN (full access), AGENT (field work), CENTRE (weighing)';
COMMENT ON COLUMN public.utilisateurs.centre_id IS 'Centre assignment for AGENT and CENTRE roles';
COMMENT ON COLUMN public.producteurs.centre_id IS 'Centre where producer is registered';
COMMENT ON COLUMN public.achats.centre_id IS 'Centre where weighing was performed';
COMMENT ON COLUMN public.parcelles.centre_id IS 'Centre where parcel is located';
COMMENT ON COLUMN public.livraisons.centre_id IS 'Centre making the delivery';
