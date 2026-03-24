ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Users can update message delivery state'
  ) THEN
    CREATE POLICY "Users can update message delivery state"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
      sender_id = auth.uid()
      OR receiver_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.utilisateurs
        WHERE id = auth.uid() AND role = 'ADMIN'
      )
    )
    WITH CHECK (
      sender_id = auth.uid()
      OR receiver_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.utilisateurs
        WHERE id = auth.uid() AND role = 'ADMIN'
      )
    );
  END IF;
END $$;

GRANT UPDATE ON public.messages TO authenticated;
