CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT messages_content_check CHECK (
    COALESCE(NULLIF(BTRIM(message), ''), NULLIF(BTRIM(audio_url), '')) IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
  ON public.messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created_at
  ON public.messages(receiver_id, sender_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR receiver_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.utilisateurs
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

CREATE POLICY "Users can send messages as themselves"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    receiver_id IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.utilisateurs
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
);

GRANT SELECT, INSERT ON public.messages TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-audio', 'chat-audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-audio'
  AND owner = auth.uid()
);

CREATE POLICY "Authenticated users can read chat audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-audio');

CREATE POLICY "Authenticated users can delete their own chat audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-audio'
  AND owner = auth.uid()
);
