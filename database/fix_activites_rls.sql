-- Fix RLS Policies for activites table
-- This script ensures that authenticated users can read activities

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read activities" ON public.activites;
DROP POLICY IF EXISTS "Admins can read activities" ON public.activites;
DROP POLICY IF EXISTS "Users can read activities" ON public.activites;

-- Create a more permissive policy for reading activities
-- All authenticated users can read all activities
CREATE POLICY "Authenticated users can read activities"
ON public.activites
FOR SELECT
TO authenticated
USING (true);

-- Also create a policy specifically for admins (more explicit)
CREATE POLICY "Admins can read all activities"
ON public.activites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE user_id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Verify RLS is enabled
ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions
GRANT SELECT ON public.activites TO authenticated;
GRANT INSERT ON public.activites TO authenticated;

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'activites';
