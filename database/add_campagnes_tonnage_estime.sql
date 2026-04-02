ALTER TABLE public.campagnes
ADD COLUMN IF NOT EXISTS tonnage_estime_tonnes NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.campagnes
ADD COLUMN IF NOT EXISTS tonnage_estime_kg NUMERIC GENERATED ALWAYS AS (tonnage_estime_tonnes * 1000) STORED;
