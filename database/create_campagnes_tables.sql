-- Campaign and centre quota system
-- Campaign price drives all weighing amounts
-- Centre quota blocks new weighings once the campaign limit is reached

CREATE TABLE IF NOT EXISTS public.campagnes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type TEXT CHECK (type IN ('PRINCIPALE', 'INTERMEDIAIRE')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  prix_kg NUMERIC NOT NULL,
  tonnage_estime_tonnes NUMERIC NOT NULL DEFAULT 0,
  tonnage_estime_kg NUMERIC GENERATED ALWAYS AS (tonnage_estime_tonnes * 1000) STORED,
  statut TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campagne_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id UUID REFERENCES public.campagnes(id) ON DELETE CASCADE,
  centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  quota_tonnes NUMERIC NOT NULL,
  quota_kg NUMERIC GENERATED ALWAYS AS (quota_tonnes * 1000) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT campagne_centres_unique UNIQUE (campagne_id, centre_id)
);

CREATE INDEX IF NOT EXISTS idx_campagnes_statut ON public.campagnes(statut);
CREATE INDEX IF NOT EXISTS idx_campagnes_dates ON public.campagnes(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_campagne_centres_campagne_id ON public.campagne_centres(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_centres_centre_id ON public.campagne_centres(centre_id);

ALTER TABLE public.campagnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campagne_centres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active campagnes" ON public.campagnes;
CREATE POLICY "Authenticated users can read active campagnes"
ON public.campagnes
FOR SELECT
TO authenticated
USING (
  statut = 'ACTIVE'
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage campagnes" ON public.campagnes;
CREATE POLICY "Admins can manage campagnes"
ON public.campagnes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage campaign quotas" ON public.campagne_centres;
CREATE POLICY "Admins can manage campaign quotas"
ON public.campagne_centres
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Centres can read their own campaign quota" ON public.campagne_centres;
CREATE POLICY "Centres can read their own campaign quota"
ON public.campagne_centres
FOR SELECT
TO authenticated
USING (
  centre_id = public.get_user_centre_id(auth.uid())
  OR public.is_admin(auth.uid())
);
