-- Fix utilisateurs table to use id as primary key matching auth.users.id
-- Remove user_id column and update all references

-- Step 1: Drop existing RLS policies that reference user_id
DROP POLICY IF EXISTS "Admins can manage all users" ON public.utilisateurs;
DROP POLICY IF EXISTS "Users can read own profile" ON public.utilisateurs;

-- Step 2: Drop the user_id column if it exists (after backing up data)
-- Note: This assumes id already matches auth.users.id
-- If not, you'll need to migrate data first

-- Step 3: Update the table structure
-- Remove user_id column (if exists) and ensure id is the primary key
DO $$
BEGIN
  -- Check if user_id column exists and remove it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'utilisateurs' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop foreign key constraint first
    ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_user_id_fkey;
    -- Drop the column
    ALTER TABLE public.utilisateurs DROP COLUMN user_id;
  END IF;
END $$;

-- Step 4: Drop index on user_id if it exists
DROP INDEX IF EXISTS idx_utilisateurs_user_id;

-- Step 5: Ensure id is the primary key (should already be)
-- Make sure id references auth.users.id
ALTER TABLE public.utilisateurs 
  DROP CONSTRAINT IF EXISTS utilisateurs_id_fkey;

-- Add foreign key constraint: id references auth.users.id
ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Recreate RLS policies using id instead of user_id
-- Policy: ADMIN can manage all users
CREATE POLICY "Admins can manage all users"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Step 7: Update indexes
CREATE INDEX IF NOT EXISTS idx_utilisateurs_id ON public.utilisateurs(id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON public.utilisateurs(role);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_centre_id ON public.utilisateurs(centre_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_status ON public.utilisateurs(status);
