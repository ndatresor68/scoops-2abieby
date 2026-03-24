CREATE TABLE IF NOT EXISTS public.employes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_prenom TEXT NOT NULL,
  telephone TEXT,
  poste TEXT,
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  salaire NUMERIC NOT NULL DEFAULT 0,
  statut TEXT DEFAULT 'ACTIF',
  date_embauche DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employes
ADD COLUMN IF NOT EXISTS statut_paiement TEXT DEFAULT 'NON_PAYE';

ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only access employes" ON public.employes;

CREATE POLICY "Admin only access employes"
ON public.employes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  )
);
