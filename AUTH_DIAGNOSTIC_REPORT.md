# 🔍 Authentication System Diagnostic Report

**Date:** Generated during diagnostic analysis  
**Status:** Issues identified - NO FIXES APPLIED

---

## 📋 Executive Summary

The authentication system has **multiple critical issues** causing users to be unexpectedly logged out during:
- Page reloads
- Input operations
- Navigation
- Loading states

**Root Cause:** Aggressive error handling and timeout mechanisms that clear user state prematurely, combined with race conditions during session initialization.

---

## 🔴 Critical Issues Identified

### Issue #1: Aggressive Timeout Mechanisms (CRITICAL)

**Location:** `src/context/AuthContext.jsx`

**Problem:**
Multiple timeout mechanisms that clear user state on timeout:

1. **5-second timeout for `getUser()`** (Line 154-167)
   ```javascript
   const timeoutPromise = new Promise((_, reject) => 
     setTimeout(() => reject(new Error("Auth timeout")), 5000)
   )
   ```
   - If `supabase.auth.getUser()` takes > 5 seconds, user is cleared
   - **Impact:** Slow network = automatic logout

2. **5-second timeout for profile loading** (Line 184-203)
   - If profile load from DB takes > 5 seconds, user is set with `role: null`
   - **Impact:** Database latency = user without role

3. **8-second safety timeout** (Line 249-254)
   ```javascript
   timeoutId = setTimeout(() => {
     if (mounted) {
       console.warn("[AuthContext] Safety timeout reached, forcing loading to false")
       setLoading(false)
     }
   }, 8000)
   ```
   - Forces loading to false after 8 seconds
   - **Impact:** If session init takes longer, user sees login screen

**Why this causes logout:**
- On slow networks or during high DB load, these timeouts fire
- Each timeout clears user state or sets loading to false
- Layout component (Line 107) shows login if `!user || loadingTimeout`

---

### Issue #2: Error Handling That Clears User State (CRITICAL)

**Location:** `src/context/AuthContext.jsx`

**Problem:**
Every error path clears user state with `setUser(null)`:

1. **In `syncAuthState()`** (Lines 163-166, 172-174, 229-232)
   ```javascript
   catch (err) {
     console.error("[AuthContext] Auth check timeout or error:", err)
     setUser(null)  // ❌ Clears user on ANY error
     return null
   }
   ```

2. **In `initializeSession()`** (Line 268)
   ```javascript
   catch (error) {
     setUser(null) // ❌ Clears user on ANY error
   }
   ```

3. **In `onAuthStateChange` listener** (Line 291)
   ```javascript
   catch (error) {
     setUser(null)  // ❌ Clears user on ANY error
   }
   ```

**Why this causes logout:**
- Network hiccups, temporary DB unavailability, or transient errors trigger logout
- No distinction between "no session" vs "temporary error"
- User is logged out even if session exists in localStorage

---

### Issue #3: Layout Component Premature Login Screen (HIGH)

**Location:** `src/components/Layout.jsx` (Line 107)

**Problem:**
```javascript
if (!user || loadingTimeout) {
  return <Login />
}
```

**Why this causes logout:**
- If `user` is temporarily `null` during re-render (e.g., during profile load), login screen appears
- `loadingTimeout` triggers after 10 seconds, showing login even if auth is still initializing
- No check if session actually exists in localStorage before showing login

**Race condition:**
- User state might be `null` briefly during `syncAuthState()` execution
- Layout renders login screen before user state is restored

---

### Issue #4: onAuthStateChange Listener Triggers syncAuthState (HIGH)

**Location:** `src/context/AuthContext.jsx` (Line 279-294)

**Problem:**
```javascript
const listenerData = supabase.auth.onAuthStateChange(async (event) => {
  if (!mounted) return
  console.log("[AuthContext] Auth state changed:", event)
  
  try {
    await syncAuthState()  // ❌ Calls syncAuthState on EVERY auth event
    if (mounted) setLoading(false)
  } catch (error) {
    setUser(null)  // ❌ Clears user on error
  }
})
```

**Why this causes logout:**
- `onAuthStateChange` fires on:
  - Token refresh
  - Session initialization
  - Any auth state change
- Each event triggers `syncAuthState()`, which can timeout or error
- If `syncAuthState()` fails during token refresh, user is logged out
- **Critical:** Token refresh happens automatically, and if it fails, user is logged out

---

### Issue #5: No Session Persistence Verification (MEDIUM)

**Location:** `src/context/AuthContext.jsx`

**Problem:**
- Code never checks if session exists in localStorage before clearing user
- Supabase stores session in `localStorage` (configured in `supabaseClient.js` Line 52)
- If `getUser()` fails but session exists in localStorage, user is still cleared

**Why this causes logout:**
- On page reload, if `getUser()` times out but localStorage has valid session, user is logged out
- Should verify localStorage before clearing user state

---

### Issue #6: Profile Loading Failure Sets User with role: null (MEDIUM)

**Location:** `src/context/AuthContext.jsx` (Line 197-202)

**Problem:**
```javascript
setUser({
  ...nextUser,
  role: null, // ❌ User set without role
  nom: nextUser.email?.split("@")[0] || "User",
})
```

**Why this causes issues:**
- If profile load fails, user is set with `role: null`
- Components checking `isAdmin`, `isAgent`, `isCentre` will all be false
- User might be logged in but can't access role-based features
- Layout might redirect to login if role checks fail

---

### Issue #7: React StrictMode Double Mounting (LOW - Dev Only)

**Location:** `src/main.jsx` (Line 17)

**Problem:**
```javascript
<StrictMode>
  <AuthProvider>
    ...
  </AuthProvider>
</StrictMode>
```

**Why this causes issues:**
- In development, StrictMode causes components to mount twice
- AuthContext initializes twice, causing duplicate session checks
- Can cause race conditions during development

**Note:** This only affects development, not production

---

### Issue #8: Multiple Async Operations Without Coordination (MEDIUM)

**Location:** `src/context/AuthContext.jsx`

**Problem:**
- `initializeSession()` calls `syncAuthState()`
- `syncAuthState()` calls `getUser()` and `loadProfileForUser()`
- `onAuthStateChange` also calls `syncAuthState()`
- No coordination between these operations

**Why this causes issues:**
- Multiple `syncAuthState()` calls can run simultaneously
- Race conditions where one clears user while another sets it
- Last operation wins, potentially clearing valid user state

---

## 📁 Files Responsible

### Primary Issues:
1. **`src/context/AuthContext.jsx`** - All timeout and error handling logic
2. **`src/components/Layout.jsx`** - Premature login screen rendering

### Secondary Issues:
3. **`src/supabaseClient.js`** - Session persistence config (working correctly)
4. **`src/main.jsx`** - StrictMode (dev only)

---

## 🔍 Detailed Analysis

### Authentication Flow:

1. **App Initialization:**
   - `main.jsx` renders `AuthProvider`
   - `AuthContext` mounts, `useEffect` (Line 240) runs
   - `initializeSession()` called
   - `syncAuthState()` called
   - `supabase.auth.getUser()` called (5s timeout)
   - If timeout → `setUser(null)` → logout

2. **Session Check:**
   - `getUser()` reads from localStorage (via Supabase)
   - If successful, `loadProfileForUser()` called (5s timeout)
   - If timeout → user set with `role: null`
   - If error → `setUser(null)` → logout

3. **Auth State Changes:**
   - `onAuthStateChange` listener fires on token refresh
   - Calls `syncAuthState()` again
   - If any error → `setUser(null)` → logout

4. **Layout Rendering:**
   - Checks `if (!user || loadingTimeout)`
   - If true → shows login screen
   - No verification if session exists in localStorage

---

## 🎯 Root Causes Summary

| Issue | Severity | When It Happens | Why User Gets Logged Out |
|-------|----------|-----------------|--------------------------|
| Timeout mechanisms | CRITICAL | Slow network/DB | Timeout fires → `setUser(null)` |
| Error handling | CRITICAL | Any error | Error → `setUser(null)` |
| Layout check | HIGH | Re-render during init | `user` temporarily null → login screen |
| Auth listener | HIGH | Token refresh | Refresh error → `setUser(null)` |
| No localStorage check | MEDIUM | Page reload | `getUser()` fails but session exists |
| Profile load failure | MEDIUM | DB timeout | User set with `role: null` |
| Race conditions | MEDIUM | Multiple async ops | Last operation clears user |
| StrictMode | LOW | Dev only | Double mounting causes issues |

---

## 🧪 Test Scenarios That Trigger Logout

1. **Slow Network:**
   - `getUser()` takes > 5 seconds → timeout → logout

2. **Database Latency:**
   - Profile load takes > 5 seconds → user set with `role: null` → potential logout

3. **Page Reload:**
   - `initializeSession()` runs → if any step fails → logout
   - Layout shows login if `user` is null during init

4. **Token Refresh:**
   - `onAuthStateChange` fires → `syncAuthState()` called → if error → logout

5. **Input During Loading:**
   - User types while auth initializing → re-render → `user` might be null → login screen

6. **Navigation:**
   - Component re-renders → `user` check → if null → login screen

---

## 📊 Impact Assessment

### High Impact:
- Users lose work when logged out unexpectedly
- Poor user experience (constant re-login)
- Data loss risk (unsaved changes)

### Medium Impact:
- Role-based features inaccessible if profile load fails
- Confusion about login state

### Low Impact:
- Development-only issues (StrictMode)

---

## 🔧 Recommended Fix Strategy (NOT IMPLEMENTED)

### Priority 1: Fix Timeout Mechanisms
- Increase timeouts or make them configurable
- Don't clear user on timeout if session exists in localStorage
- Add retry logic instead of immediate logout

### Priority 2: Improve Error Handling
- Distinguish between "no session" vs "temporary error"
- Only clear user if session actually invalid
- Retry failed operations instead of immediate logout

### Priority 3: Fix Layout Component
- Check localStorage before showing login
- Don't show login if session exists but user state is loading
- Add loading state that doesn't trigger login screen

### Priority 4: Coordinate Async Operations
- Prevent multiple `syncAuthState()` calls
- Use flags to track ongoing operations
- Queue operations instead of running in parallel

### Priority 5: Verify Session Persistence
- Check localStorage before clearing user
- Use `supabase.auth.getSession()` as fallback
- Verify session validity before logout

---

## 📝 Debug Logging Recommendations

Add temporary logging to track:
- When `setUser(null)` is called and why
- When timeouts fire
- When errors occur in auth flow
- When `onAuthStateChange` fires
- localStorage session state

---

## ✅ Conclusion

The authentication system has **8 identified issues** causing unexpected logouts:
- **3 CRITICAL** (timeouts, error handling)
- **3 HIGH** (Layout, auth listener, localStorage)
- **2 MEDIUM/LOW** (profile loading, race conditions)

**Primary Root Cause:** Aggressive error handling and timeout mechanisms that clear user state without verifying if a valid session exists in localStorage.

**Next Steps:** Implement fixes following the recommended strategy, starting with Priority 1 and 2.

---

**Report Generated:** Diagnostic analysis complete  
**Status:** Ready for fix implementation
