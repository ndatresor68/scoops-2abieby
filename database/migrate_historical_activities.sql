-- Migration Script: Reconstruct Historical Activities
-- This script creates activity log entries from existing data in:
-- - producteurs (created_at)
-- - centres (created_at)
-- - utilisateurs (created_at)
-- - achats (created_at)
--
-- These historical activities will be merged with new activities logged by the system.

BEGIN;

-- 1. Insert historical activities from utilisateurs table
INSERT INTO public.activites (
  user_id,
  user_email,
  action,
  target,
  details,
  ip_address,
  device,
  browser,
  os,
  location,
  created_at
)
SELECT
  u.user_id,
  COALESCE(u.email, 'System') as user_email,
  'user_created' as action,
  'user' as target,
  'User ' || COALESCE(u.nom, u.email, 'Unknown') || ' created with role ' || COALESCE(u.role, 'UNKNOWN') as details,
  NULL as ip_address, -- Historical data doesn't have IP
  NULL as device,
  NULL as browser,
  NULL as os,
  NULL as location,
  COALESCE(u.created_at, NOW()) as created_at
FROM public.utilisateurs u
WHERE NOT EXISTS (
  -- Avoid duplicates: check if activity already exists
  SELECT 1 FROM public.activites a
  WHERE a.user_id = u.user_id
    AND a.action = 'user_created'
    AND a.target = 'user'
    AND a.created_at = u.created_at
)
AND u.created_at IS NOT NULL
ORDER BY u.created_at ASC;

-- 2. Insert historical activities from producteurs table
INSERT INTO public.activites (
  user_id,
  user_email,
  action,
  target,
  details,
  ip_address,
  device,
  browser,
  os,
  location,
  created_at
)
SELECT
  NULL as user_id, -- Producer creation user unknown
  'System' as user_email,
  'producer_created' as action,
  'producteur' as target,
  'Producer ' || COALESCE(p.nom, 'Unknown') || 
    CASE 
      WHEN p.code IS NOT NULL THEN ' (' || p.code || ')'
      ELSE ''
    END || ' created' as details,
  NULL as ip_address,
  NULL as device,
  NULL as browser,
  NULL as os,
  NULL as location,
  COALESCE(p.created_at, NOW()) as created_at
FROM public.producteurs p
WHERE NOT EXISTS (
  SELECT 1 FROM public.activites a
  WHERE a.action = 'producer_created'
    AND a.target = 'producteur'
    AND a.details LIKE '%' || COALESCE(p.nom, 'Unknown') || '%'
    AND a.created_at = p.created_at
)
AND p.created_at IS NOT NULL
ORDER BY p.created_at ASC;

-- 3. Insert historical activities from centres table
INSERT INTO public.activites (
  user_id,
  user_email,
  action,
  target,
  details,
  ip_address,
  device,
  browser,
  os,
  location,
  created_at
)
SELECT
  NULL as user_id,
  'System' as user_email,
  'centre_created' as action,
  'centre' as target,
  'Centre ' || COALESCE(c.nom, 'Unknown') || 
    CASE 
      WHEN c.code IS NOT NULL THEN ' (' || c.code || ')'
      ELSE ''
    END || ' created' as details,
  NULL as ip_address,
  NULL as device,
  NULL as browser,
  NULL as os,
  NULL as location,
  COALESCE(c.created_at, NOW()) as created_at
FROM public.centres c
WHERE NOT EXISTS (
  SELECT 1 FROM public.activites a
  WHERE a.action = 'centre_created'
    AND a.target = 'centre'
    AND a.details LIKE '%' || COALESCE(c.nom, 'Unknown') || '%'
    AND a.created_at = c.created_at
)
AND c.created_at IS NOT NULL
ORDER BY c.created_at ASC;

-- 4. Insert historical activities from achats table
INSERT INTO public.activites (
  user_id,
  user_email,
  action,
  target,
  details,
  ip_address,
  device,
  browser,
  os,
  location,
  created_at
)
SELECT
  a.utilisateur_id as user_id,
  COALESCE(
    (SELECT u.email FROM public.utilisateurs u WHERE u.user_id = a.utilisateur_id LIMIT 1),
    'System'
  ) as user_email,
  'achat_created' as action,
  'achat' as target,
  'Purchase of ' || COALESCE(CAST(a.poids AS TEXT), '0') || 'kg for ' || 
    COALESCE(a.nom_producteur, 'Unknown') || 
    CASE 
      WHEN a.montant IS NOT NULL THEN ' - ' || CAST(a.montant AS TEXT) || ' FCFA'
      ELSE ''
    END as details,
  NULL as ip_address,
  NULL as device,
  NULL as browser,
  NULL as os,
  NULL as location,
  COALESCE(a.created_at, NOW()) as created_at
FROM public.achats a
WHERE NOT EXISTS (
  SELECT 1 FROM public.activites act
  WHERE act.action = 'achat_created'
    AND act.target = 'achat'
    AND act.created_at = a.created_at
    AND act.details LIKE '%' || COALESCE(a.nom_producteur, 'Unknown') || '%'
)
AND a.created_at IS NOT NULL
ORDER BY a.created_at ASC;

-- 5. Create index on created_at if not exists (for performance)
CREATE INDEX IF NOT EXISTS idx_activites_created_at_desc ON public.activites(created_at DESC);

-- 6. Update statistics
DO $$
DECLARE
  v_user_count INTEGER;
  v_producer_count INTEGER;
  v_centre_count INTEGER;
  v_achat_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.activites WHERE action = 'user_created';
  SELECT COUNT(*) INTO v_producer_count FROM public.activites WHERE action = 'producer_created';
  SELECT COUNT(*) INTO v_centre_count FROM public.activites WHERE action = 'centre_created';
  SELECT COUNT(*) INTO v_achat_count FROM public.activites WHERE action = 'achat_created';
  SELECT COUNT(*) INTO v_total_count FROM public.activites;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Historical activities inserted:';
  RAISE NOTICE '  - Users: %', v_user_count;
  RAISE NOTICE '  - Producers: %', v_producer_count;
  RAISE NOTICE '  - Centres: %', v_centre_count;
  RAISE NOTICE '  - Achats: %', v_achat_count;
  RAISE NOTICE '  - Total activities: %', v_total_count;
END $$;

COMMIT;

-- Verification query (run after migration to verify)
-- SELECT 
--   action,
--   target,
--   COUNT(*) as count,
--   MIN(created_at) as earliest,
--   MAX(created_at) as latest
-- FROM public.activites
-- GROUP BY action, target
-- ORDER BY target, action;
