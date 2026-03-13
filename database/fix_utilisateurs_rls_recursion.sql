-- Fix RLS Policy Recursion on utilisateurs table
-- Problem: Policies that query utilisateurs within their own condition cause infinite recursion
-- Solution: Remove recursive queries and use direct auth.uid() checks

-- Step 1: Drop all existing policies on utilisateurs
DROP POLICY IF EXISTS "Admins can manage all users" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can read own profile" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can update own profile" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.utilisateurs;

-- Step 2: Enable RLS (if not already enabled)
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;

-- Step 3: Create safe policies without recursion

-- Policy 1: Users can read their own profile
-- Uses direct auth.uid() check - no table query needed
CREATE POLICY "Users can read own profile"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can update their own profile
-- Uses direct auth.uid() check - no table query needed
CREATE POLICY "Users can update own profile"
ON public.utilisateurs
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own profile
-- Allows users to create their profile when they sign up
CREATE POLICY "Users can insert own profile"
ON public.utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy 4: Admin full access (using JWT claim or bypass)
-- Since we can't query utilisateurs to check role, we'll use a different approach
-- Option A: Use a security definer function (recommended)
-- Option B: Allow all authenticated users and check admin in application layer
-- Option C: Use JWT claims (requires setting claims on login)

-- For now, we'll create a function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$;

-- Admin policy using the function (bypasses RLS)
CREATE POLICY "Admins full access"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Alternative simpler approach: Allow all authenticated users to read/update
-- and handle admin checks in application layer
-- This is safer but less secure - admin checks happen in code, not database

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Also create helper functions for other tables to avoid recursion
CREATE OR REPLACE FUNCTION public.is_agent(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = user_id AND role = 'AGENT'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_centre_id(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  centre_uuid UUID;
BEGIN
  SELECT centre_id INTO centre_uuid
  FROM public.utilisateurs
  WHERE id = user_id AND role = 'CENTRE'
  LIMIT 1;
  RETURN centre_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_agent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_centre_id(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.is_admin(UUID) IS 'Check if user is admin (bypasses RLS to prevent recursion)';
COMMENT ON POLICY "Users can read own profile" ON public.utilisateurs IS 'Users can read their own profile using id = auth.uid()';
COMMENT ON POLICY "Users can update own profile" ON public.utilisateurs IS 'Users can update their own profile';
COMMENT ON POLICY "Users can insert own profile" ON public.utilisateurs IS 'Users can create their own profile on signup';
COMMENT ON POLICY "Admins full access" ON public.utilisateurs IS 'Admins have full access using security definer function';
