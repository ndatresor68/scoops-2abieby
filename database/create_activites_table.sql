-- Create professional audit log table "activites"
-- This table stores all system activities for audit and tracking

CREATE TABLE IF NOT EXISTS public.activites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'login', 'logout',
    'user_created', 'user_updated', 'user_deleted', 'user_suspended', 'user_banned', 'user_reactivated',
    'producer_created', 'producer_updated', 'producer_deleted',
    'centre_created', 'centre_updated', 'centre_deleted',
    'achat_created', 'achat_updated', 'achat_deleted',
    'pdf_exported', 'settings_updated'
  )),
  target TEXT NOT NULL CHECK (target IN ('user', 'centre', 'producteur', 'achat', 'system', 'pdf', 'settings')),
  details TEXT,
  ip_address INET,
  device TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activites_created_at ON public.activites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activites_user_id ON public.activites(user_id);
CREATE INDEX IF NOT EXISTS idx_activites_action ON public.activites(action);
CREATE INDEX IF NOT EXISTS idx_activites_target ON public.activites(target);
CREATE INDEX IF NOT EXISTS idx_activites_user_email ON public.activites(user_email);

-- Enable RLS
ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read activities
CREATE POLICY "Authenticated users can read activities"
ON public.activites
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only authenticated users can insert activities
CREATE POLICY "Authenticated users can insert activities"
ON public.activites
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.activites TO authenticated;
GRANT INSERT ON public.activites TO authenticated;

-- Comments
COMMENT ON TABLE public.activites IS 'Professional audit log for system activities and tracking';
COMMENT ON COLUMN public.activites.action IS 'Action type: login, logout, user_created, user_updated, etc.';
COMMENT ON COLUMN public.activites.target IS 'Target entity type: user, centre, producteur, achat, system, pdf, settings';
COMMENT ON COLUMN public.activites.ip_address IS 'IP address of the user performing the action';
COMMENT ON COLUMN public.activites.device IS 'Device type (mobile, desktop, tablet)';
COMMENT ON COLUMN public.activites.browser IS 'Browser name and version';
COMMENT ON COLUMN public.activites.os IS 'Operating system';
COMMENT ON COLUMN public.activites.location IS 'Geographic location if permission granted';
