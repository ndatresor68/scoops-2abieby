-- Create professional settings table for the cooperative management system
-- This table stores all application settings

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- General Settings
  cooperative_name TEXT DEFAULT 'SCOOP ASAB-COOP-CA',
  cooperative_motto TEXT DEFAULT 'Union • Discipline • Travail',
  logo_url TEXT,
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  default_language TEXT DEFAULT 'fr',
  currency TEXT DEFAULT 'FCFA',
  
  -- System Settings
  notifications_enabled BOOLEAN DEFAULT true,
  automatic_backups BOOLEAN DEFAULT true,
  activity_logging BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 30,
  security_two_factor BOOLEAN DEFAULT false,
  security_password_min_length INTEGER DEFAULT 8,
  
  -- User Management Settings
  allow_user_registration BOOLEAN DEFAULT false,
  default_user_role TEXT DEFAULT 'AGENT',
  password_policy_enabled BOOLEAN DEFAULT true,
  password_require_uppercase BOOLEAN DEFAULT true,
  password_require_lowercase BOOLEAN DEFAULT true,
  password_require_numbers BOOLEAN DEFAULT true,
  password_require_special_chars BOOLEAN DEFAULT false,
  account_suspension_after_failed_logins INTEGER DEFAULT 5,
  account_suspension_duration_hours INTEGER DEFAULT 24,
  
  -- Data Settings
  export_format TEXT DEFAULT 'PDF',
  pdf_export_layout TEXT DEFAULT 'landscape',
  data_retention_days INTEGER DEFAULT 365,
  auto_export_enabled BOOLEAN DEFAULT false,
  auto_export_frequency TEXT DEFAULT 'monthly',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON public.settings(updated_at DESC);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Grant permissions
GRANT SELECT ON public.settings TO authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT INSERT ON public.settings TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_settings_updated_at ON public.settings;
CREATE TRIGGER trigger_update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Insert default settings if table is empty
INSERT INTO public.settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);

-- Comments
COMMENT ON TABLE public.settings IS 'Application settings for the cooperative management system';
COMMENT ON COLUMN public.settings.cooperative_name IS 'Name of the cooperative';
COMMENT ON COLUMN public.settings.logo_url IS 'URL of the cooperative logo';
COMMENT ON COLUMN public.settings.default_language IS 'Default language code (fr, en, etc.)';
COMMENT ON COLUMN public.settings.currency IS 'Default currency code';
COMMENT ON COLUMN public.settings.session_timeout_minutes IS 'Session timeout in minutes';
COMMENT ON COLUMN public.settings.default_user_role IS 'Default role for new users (ADMIN, AGENT, CENTRE)';
COMMENT ON COLUMN public.settings.data_retention_days IS 'Number of days to retain data before deletion';
