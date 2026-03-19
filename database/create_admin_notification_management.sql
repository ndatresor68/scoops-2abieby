-- Extend notification management to support admin push campaigns and delivery logs.

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS target_type TEXT;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON public.notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_type ON public.notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON public.notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Admins can read notification management records'
  ) THEN
    EXECUTE '
      CREATE POLICY "Admins can read notification management records"
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()))
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_logs'
      AND policyname = 'Admins can read notification logs'
  ) THEN
    EXECUTE '
      CREATE POLICY "Admins can read notification logs"
      ON public.notification_logs
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()))
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_logs'
      AND policyname = 'Admins can insert notification logs'
  ) THEN
    EXECUTE '
      CREATE POLICY "Admins can insert notification logs"
      ON public.notification_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin(auth.uid()))
    ';
  END IF;
END $$;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.notification_logs TO authenticated;
