-- Device tokens for Firebase Cloud Messaging (FCM)
-- Stores browser/app registration tokens so Admin can send pushes.

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_status ON public.device_tokens(status);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert/update their own tokens
CREATE POLICY "Users can insert own device token"
ON public.device_tokens
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own device tokens"
ON public.device_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can read all tokens (needed by Admin dashboard to target devices)
CREATE POLICY "Admins can read all device tokens"
ON public.device_tokens
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can update their own tokens (e.g. status)
CREATE POLICY "Users can update own device token"
ON public.device_tokens
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update tokens as well
CREATE POLICY "Admins can update all device tokens"
ON public.device_tokens
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.device_tokens TO authenticated;
GRANT INSERT ON public.device_tokens TO authenticated;
GRANT UPDATE ON public.device_tokens TO authenticated;
