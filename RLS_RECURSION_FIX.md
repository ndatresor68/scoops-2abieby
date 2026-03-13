# RLS Recursion Fix for utilisateurs Table

## 🔴 Problem

The RLS policies on `public.utilisateurs` were causing infinite recursion:

```
Error code: 42P17
"infinite recursion detected in policy for relation 'utilisateurs'"
```

### Root Cause

The problematic policy was:

```sql
CREATE POLICY "Admins can manage all users"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utilisateurs  -- ❌ Queries same table!
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);
```

**Why this causes recursion:**
1. To check if user is ADMIN, policy queries `utilisateurs` table
2. But to query `utilisateurs`, PostgreSQL needs to check RLS policies
3. Which includes checking if user is ADMIN...
4. Which queries `utilisateurs` again...
5. **Infinite loop!** 🔄

## ✅ Solution

### Approach: Security Definer Function

Create a function with `SECURITY DEFINER` that bypasses RLS to check admin status:

```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with creator's privileges, bypasses RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$;
```

### Safe Policies

```sql
-- 1. Users can read their own profile (direct auth.uid() - no recursion)
CREATE POLICY "Users can read own profile"
ON public.utilisateurs
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.utilisateurs
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.utilisateurs
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 4. Admins have full access (uses function - no recursion)
CREATE POLICY "Admins full access"
ON public.utilisateurs
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
```

## 🚀 Migration Steps

### Step 1: Run the Fix Script

Execute in Supabase SQL Editor:

```sql
-- Run: database/fix_utilisateurs_rls_recursion.sql
```

This will:
1. Drop all existing policies
2. Create the `is_admin()` function
3. Create new safe policies
4. Grant necessary permissions

### Step 2: Verify Policies

Check policies are created:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'utilisateurs';
```

### Step 3: Test Query

Test that profile loading works:

```sql
-- This should work without recursion error
SELECT * FROM public.utilisateurs WHERE id = auth.uid();
```

## 📋 Policy Details

### 1. Users can read own profile
- **Operation**: SELECT
- **Condition**: `id = auth.uid()`
- **No recursion**: Direct comparison, no table query

### 2. Users can update own profile
- **Operation**: UPDATE
- **Condition**: `id = auth.uid()` (both USING and WITH CHECK)
- **No recursion**: Direct comparison

### 3. Users can insert own profile
- **Operation**: INSERT
- **Condition**: `id = auth.uid()` (WITH CHECK)
- **No recursion**: Direct comparison
- **Use case**: When user signs up, they create their profile

### 4. Admins full access
- **Operation**: ALL (SELECT, INSERT, UPDATE, DELETE)
- **Condition**: `public.is_admin(auth.uid())`
- **No recursion**: Function uses SECURITY DEFINER to bypass RLS

## 🔒 Security Notes

1. **Security Definer Function**: 
   - Runs with creator's privileges (usually postgres)
   - Bypasses RLS when checking admin status
   - Safe because it only checks role, doesn't modify data

2. **Direct auth.uid() Checks**:
   - No table queries needed
   - Fast and safe
   - No recursion possible

3. **Admin Policy**:
   - Uses function to avoid recursion
   - Still secure - only admins can access all users
   - Application layer should also verify admin status

## ✅ Expected Results

After applying the fix:

- ✅ Login works
- ✅ Profile loads without recursion error
- ✅ Users can read/update their own profile
- ✅ Admins can access all users
- ✅ No infinite recursion errors
- ✅ Dashboard renders correctly

## 🧪 Testing

1. **Test as regular user**:
   ```sql
   -- Should return only your own profile
   SELECT * FROM public.utilisateurs WHERE id = auth.uid();
   ```

2. **Test as admin**:
   ```sql
   -- Should return all users
   SELECT * FROM public.utilisateurs;
   ```

3. **Test profile update**:
   ```sql
   -- Should work for own profile
   UPDATE public.utilisateurs 
   SET nom = 'Test' 
   WHERE id = auth.uid();
   ```

4. **Test in application**:
   - Login with user account
   - Verify profile loads
   - Verify dashboard renders
   - Verify no recursion errors in console

## 📝 Files Updated

- ✅ `database/create_cooperative_schema.sql` - Updated with safe policies
- ✅ `database/fix_utilisateurs_rls_recursion.sql` - Migration script
- ✅ `RLS_RECURSION_FIX.md` - This documentation

## ⚠️ Important

- Always test policies after changes
- Monitor for recursion errors
- Keep security definer functions minimal and secure
- Consider application-level admin checks as additional security layer
