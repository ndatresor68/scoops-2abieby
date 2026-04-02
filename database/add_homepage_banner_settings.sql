ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS homepage_banner_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS homepage_banner_text TEXT DEFAULT 'Bienvenue sur SCOOP ASAB-COOP-CA • Suivi des campagnes • Gestion des quotas • Pesées sécurisées en temps réel';

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS homepage_banner_speed_seconds INTEGER DEFAULT 22;
