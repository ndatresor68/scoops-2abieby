-- ============================================
-- Ajout des colonnes manquantes à la table parcelles
-- ============================================

-- Ajouter code_parcelle si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'parcelles' 
    AND column_name = 'code_parcelle'
  ) THEN
    ALTER TABLE public.parcelles 
    ADD COLUMN code_parcelle TEXT UNIQUE;
    
    -- Créer un index sur code_parcelle
    CREATE INDEX IF NOT EXISTS idx_parcelles_code_parcelle ON public.parcelles(code_parcelle);
  END IF;
END $$;

-- Ajouter date_mesure si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'parcelles' 
    AND column_name = 'date_mesure'
  ) THEN
    ALTER TABLE public.parcelles 
    ADD COLUMN date_mesure DATE DEFAULT CURRENT_DATE;
    
    -- Créer un index sur date_mesure
    CREATE INDEX IF NOT EXISTS idx_parcelles_date_mesure ON public.parcelles(date_mesure DESC);
  END IF;
END $$;

-- Mettre à jour les parcelles existantes sans code_parcelle
UPDATE public.parcelles
SET code_parcelle = 'PRC-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at)::TEXT, 4, '0')
WHERE code_parcelle IS NULL;

-- Mettre à jour les parcelles existantes sans date_mesure
UPDATE public.parcelles
SET date_mesure = DATE(created_at)
WHERE date_mesure IS NULL;

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.parcelles.code_parcelle IS 'Code unique de la parcelle au format PRC-ANNEE-NUMERO';
COMMENT ON COLUMN public.parcelles.date_mesure IS 'Date de mesure GPS de la parcelle';
