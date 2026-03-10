-- Fix RLS Policies for utilisateurs table
-- This script ensures that authenticated admin users can read users for statistics

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.utilisateurs;
DROP POLICY IF EXISTS "Admins can read users" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can read users" ON public.utilisateurs;

-- Create a policy for authenticated users to read users (for statistics)
-- All authenticated users can read users (needed for admin dashboard stats)
CREATE POLICY "Authenticated users can read users"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (true);

-- Also create a policy specifically for admins (more explicit)
CREATE POLICY "Admins can read all users"
ON public.utilisateurs
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
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions
GRANT SELECT ON public.utilisateurs TO authenticated;

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
WHERE tablename = 'utilisateurs';
