CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_page ON public.activity_logs(page);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.utilisateurs
    WHERE utilisateurs.id = auth.uid()
      AND utilisateurs.role = 'ADMIN'
  )
);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;

COMMENT ON TABLE public.activity_logs IS 'Audit log table for application and business monitoring';
