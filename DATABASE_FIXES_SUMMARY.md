# Database Fixes Summary

## ✅ Completed Fixes

### 1. Database Schema Correction

**Issue**: The `utilisateurs` table had both `id` (PRIMARY KEY) and `user_id` (FOREIGN KEY) columns, causing confusion.

**Fix**: Updated schema to use `id` as PRIMARY KEY that references `auth.users.id` directly.

**Files Updated**:
- `database/create_cooperative_schema.sql` - Removed `user_id` column, made `id` reference `auth.users.id`
- `database/fix_utilisateurs_id.sql` - Migration script to fix existing database

### 2. RLS Policies Updated

All RLS policies now use `id = auth.uid()` instead of `user_id = auth.uid()`:

- ✅ `utilisateurs` table policies
- ✅ `producteurs` table policies (CENTRE role check)
- ✅ `achats` table policies (ADMIN and CENTRE role checks)

### 3. Frontend Code Updates

**AuthContext.jsx**:
- ✅ Changed from `.eq("user_id", authUser.id)` to `.eq("id", authUser.id)`
- ✅ Removed fallback to `user_id` lookup

**AdminUsers.jsx**:
- ✅ Changed insert payload from `user_id: newAuthUser.id` to `id: newAuthUser.id`
- ✅ Updated avatar upload to use `editingUser.id` instead of `editingUser.user_id || editingUser.id`

**AdminAgents.jsx**:
- ✅ Changed insert payload from `user_id: newAuthUser.id` to `id: newAuthUser.id`

**activityLogger.js**:
- ✅ Updated query from `.eq("user_id", userId)` to `.eq("id", userId)`
- Note: `activites.user_id` still references `auth.users.id` (this is correct)

**notifications.js**:
- ✅ Changed from `.select("user_id")` to `.select("id")`
- ✅ Updated mapping from `user.user_id` to `user.id`
- Note: `notifications.user_id` still references `auth.users.id` (this is correct)

**AdminStats.jsx**:
- ✅ Removed reference to `user.user_id` in logging

**AdminActivities.jsx**:
- ✅ Changed from `.select("user_id, email")` to `.select("id, email")`
- ✅ Updated historical activity generation to use `user.id`
- ✅ Fixed user lookup for achats to use `.in("id", userIds)`

### 4. Environment Variables

**supabaseClient.js**:
- ✅ Already correctly uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- ✅ Created `.env.local.example` file with correct variable names

### 5. Database Structure Validation

All queries now correctly reference:
- ✅ `utilisateurs.id` (PRIMARY KEY, matches `auth.users.id`)
- ✅ `producteurs.centre_id` (FOREIGN KEY to `centres.id`)
- ✅ `achats.centre_id` (FOREIGN KEY to `centres.id`)
- ✅ `achats.utilisateur_id` (FOREIGN KEY to `utilisateurs.id`)
- ✅ `producteurs.created_by` (FOREIGN KEY to `utilisateurs.id`)

## 📋 Migration Steps

### Step 1: Run Database Migration

Execute the migration script in Supabase SQL Editor:

```sql
-- Run: database/fix_utilisateurs_id.sql
```

This will:
1. Drop existing RLS policies
2. Remove `user_id` column (if exists)
3. Add foreign key constraint: `id` → `auth.users.id`
4. Recreate RLS policies using `id`

### Step 2: Update Existing User Records

If you have existing users, ensure their `id` matches `auth.users.id`:

```sql
-- Check for mismatches
SELECT u.id, u.email, au.id as auth_id
FROM public.utilisateurs u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- If needed, update records (example)
-- UPDATE public.utilisateurs
-- SET id = (SELECT id FROM auth.users WHERE email = utilisateurs.email)
-- WHERE id != (SELECT id FROM auth.users WHERE email = utilisateurs.email);
```

### Step 3: Verify Environment Variables

Create `.env.local` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🔍 Testing Checklist

- [ ] Login works correctly
- [ ] User profile loads from `utilisateurs` table
- [ ] ADMIN can access all data
- [ ] CENTRE can only see their centre's data
- [ ] AGENT can see all producteurs but not achats
- [ ] Dashboard statistics load correctly
- [ ] User creation works (id matches auth.users.id)
- [ ] RLS policies prevent unauthorized access

## ⚠️ Important Notes

1. **User Creation**: When creating a new user, the `id` in `utilisateurs` must match `auth.users.id`:
   ```javascript
   const { data: authData } = await supabase.auth.signUp({...})
   await supabase.from("utilisateurs").insert({
     id: authData.user.id, // Must match auth.users.id
     email: "...",
     nom: "...",
     role: "..."
   })
   ```

2. **Foreign Keys**: 
   - `utilisateurs.id` → `auth.users.id` (same value)
   - `activites.user_id` → `auth.users.id` (references auth, not utilisateurs)
   - `notifications.user_id` → `auth.users.id` (references auth, not utilisateurs)
   - `producteurs.created_by` → `utilisateurs.id`
   - `achats.utilisateur_id` → `utilisateurs.id`

3. **RLS Policies**: All policies now use `id = auth.uid()` for `utilisateurs` table lookups.

## 🎯 Next Steps

1. Run the migration script
2. Test user login and profile loading
3. Verify role-based access control
4. Test dashboard statistics
5. Verify data filtering by role
