-- Autoriser les utilisateurs CENTRE a creer, modifier et supprimer
-- uniquement les parcelles de leur propre centre.

DROP POLICY IF EXISTS "Centres can read parcelles from their centre" ON public.parcelles;

CREATE POLICY "Centres can manage parcelles from their centre"
ON public.parcelles
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
