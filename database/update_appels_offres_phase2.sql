ALTER TABLE public.appels_offres
ADD COLUMN IF NOT EXISTS localisation TEXT;

ALTER TABLE public.appels_offres
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

ALTER TABLE public.appels_offres
ADD COLUMN IF NOT EXISTS recommendation TEXT DEFAULT 'IGNORE';

ALTER TABLE public.appels_offres
ADD COLUMN IF NOT EXISTS risk TEXT DEFAULT 'HIGH';

CREATE UNIQUE INDEX IF NOT EXISTS idx_appels_offres_unique_titre_source
  ON public.appels_offres ((lower(titre)), (lower(source)));
