ALTER TABLE public.achats
ADD COLUMN IF NOT EXISTS campagne_id UUID REFERENCES public.campagnes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_achats_campagne_id ON public.achats(campagne_id);

UPDATE public.achats AS a
SET campagne_id = matched_campagne.id
FROM (
  SELECT
    achats.id AS achat_id,
    campagnes.id
  FROM public.achats AS achats
  JOIN LATERAL (
    SELECT c.id
    FROM public.campagnes AS c
    WHERE (achats.date_pesee::date BETWEEN c.date_debut AND c.date_fin)
       OR (achats.created_at::date BETWEEN c.date_debut AND c.date_fin)
    ORDER BY c.date_debut DESC, c.created_at DESC
    LIMIT 1
  ) AS campagnes ON TRUE
  WHERE achats.campagne_id IS NULL
) AS matched_campagne
WHERE a.id = matched_campagne.achat_id
  AND a.campagne_id IS NULL;
