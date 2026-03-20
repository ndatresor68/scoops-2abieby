CREATE TABLE IF NOT EXISTS public.appels_offres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  localisation TEXT,
  secteur TEXT NOT NULL CHECK (secteur IN ('cacao', 'cafe')),
  score INTEGER DEFAULT 0,
  recommendation TEXT DEFAULT 'IGNORE',
  risk TEXT DEFAULT 'HIGH',
  date_publication DATE NOT NULL DEFAULT CURRENT_DATE,
  date_limite DATE,
  lien TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appels_offres_secteur
  ON public.appels_offres(secteur);

CREATE INDEX IF NOT EXISTS idx_appels_offres_date_publication
  ON public.appels_offres(date_publication DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appels_offres_unique_titre_source
  ON public.appels_offres ((lower(titre)), (lower(source)));

ALTER TABLE public.appels_offres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read opportunities"
ON public.appels_offres
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert opportunities"
ON public.appels_offres
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.utilisateurs
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

GRANT SELECT ON public.appels_offres TO authenticated;
GRANT INSERT ON public.appels_offres TO authenticated;
