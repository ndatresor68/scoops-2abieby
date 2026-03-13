# Role-Based Cooperative Management System

## 📋 Overview

This document describes the complete role-based access control (RBAC) system implemented for the cocoa cooperative management application. The system supports three distinct roles: **ADMIN**, **AGENT**, and **CENTRE**.

---

## 🗄️ Database Structure

### Tables

#### `centres`
- `id` (UUID, PRIMARY KEY)
- `nom` (TEXT)
- `code` (TEXT, UNIQUE)
- `ville` (TEXT)
- `responsable` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `utilisateurs`
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FOREIGN KEY → auth.users.id)
- `email` (TEXT, UNIQUE)
- `nom` (TEXT)
- `role` (TEXT) - **ADMIN | AGENT | CENTRE**
- `centre_id` (UUID, FOREIGN KEY → centres.id) - Required for AGENT and CENTRE
- `status` (TEXT) - active | suspended | banned
- `created_at` (TIMESTAMPTZ)

#### `producteurs`
- `id` (UUID, PRIMARY KEY)
- `nom` (TEXT)
- `code` (TEXT, UNIQUE)
- `telephone` (TEXT)
- `centre_id` (UUID, FOREIGN KEY → centres.id)
- `photo`, `photo_cni_recto`, `photo_cni_verso`, `carte_planteur` (TEXT)
- `created_by` (UUID, FOREIGN KEY → utilisateurs.id)
- `created_at` (TIMESTAMPTZ)

#### `achats`
- `id` (UUID, PRIMARY KEY)
- `producteur_id` (UUID, FOREIGN KEY → producteurs.id)
- `centre_id` (UUID, FOREIGN KEY → centres.id)
- `poids` (NUMERIC)
- `sacs` (INTEGER)
- `prix_unitaire` (NUMERIC)
- `montant` (NUMERIC)
- `date_pesee` (TIMESTAMPTZ)
- `utilisateur_id` (UUID, FOREIGN KEY → utilisateurs.id)
- `nom_producteur`, `code_producteur`, `nom_agent` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## 🔐 Role Permissions

### ADMIN
- ✅ **Full access** to all data and features
- ✅ Manage centres (create, update, delete)
- ✅ Manage users (create, update, delete, suspend, ban)
- ✅ Manage producteurs (create, update, delete)
- ✅ View all purchases (achats)
- ✅ Access global dashboard with all statistics
- ✅ Access admin panel

### AGENT
- ✅ Manage producteurs (create, update, delete)
- ✅ Manage parcelles (future feature)
- ✅ Manage terrain activities (future feature)
- ❌ **Cannot access weighing (achats)** - This is CENTRE-only
- ✅ View all producteurs (not filtered by centre)
- ✅ Access agent dashboard

### CENTRE
- ✅ Perform weighing (create achats)
- ✅ View only producteurs from their assigned centre
- ✅ View only purchases (achats) from their centre
- ✅ Access centre-specific dashboard
- ❌ Cannot manage users or centres
- ❌ Cannot access admin panel

---

## 🚀 Setup Instructions

### 1. Create Database Schema

Execute the SQL script to create all tables and RLS policies:

```bash
# Via Supabase Dashboard → SQL Editor
# Copy and paste the contents of: database/create_cooperative_schema.sql
```

Or via psql:
```bash
psql -h your-host -U postgres -d your-db -f database/create_cooperative_schema.sql
```

### 2. Verify RLS Policies

The script creates Row Level Security (RLS) policies that automatically filter data based on user roles:

- **ADMIN**: Can access all rows
- **CENTRE**: Can only access rows where `centre_id` matches their assigned centre
- **AGENT**: Can access producteurs but not achats

### 3. Create Users

Users must be created in two steps:

1. **Create auth user** (via Supabase Auth):
   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: "user@example.com",
     password: "secure-password"
   })
   ```

2. **Create profile in utilisateurs table**:
   ```javascript
   await supabase.from("utilisateurs").insert({
     user_id: data.user.id,
     email: "user@example.com",
     nom: "User Name",
     role: "CENTRE", // or "ADMIN" or "AGENT"
     centre_id: "uuid-of-centre", // Required for CENTRE and AGENT
   })
   ```

---

## 💻 Frontend Implementation

### Role Detection

After login, the system automatically loads the user profile from the `utilisateurs` table:

```javascript
// AuthContext automatically loads profile
const { user, role, isAdmin, isAgent, isCentre, centreId } = useAuth()
```

### Data Filtering

Use the role-based query utilities:

```javascript
import { getProducteursQuery, getAchatsQuery, canPerformAction } from "./utils/rolePermissions"

// Get filtered query for producteurs
const query = getProducteursQuery(user)
const { data } = await query

// Get filtered query for achats (returns null for AGENT)
const achatsQuery = getAchatsQuery(user)
if (achatsQuery) {
  const { data } = await achatsQuery
}

// Check permissions
if (canPerformAction(user, "create_achat")) {
  // User can create purchases
}
```

### Navigation

The navigation menu automatically adapts based on role:

- **ADMIN**: Dashboard, Centres, Utilisateurs, Producteurs, Pesées, Administration, Paramètres
- **AGENT**: Dashboard, Producteurs, Parcelles, Activités terrain
- **CENTRE**: Dashboard, Producteurs du centre, Pesées, Statistiques centre

### Dashboards

Role-specific dashboards are automatically displayed:

- **AdminDashboard**: Global statistics (all producteurs, centres, purchases)
- **CentreDashboard**: Centre-specific statistics (producteurs in centre, weighings, total cocoa, amount paid)
- **AgentDashboard**: Field work statistics (producers registered, field activities, parcel measurements)

---

## 📊 Component Updates

### Producteurs.jsx
- Uses `getProducteursQuery(user)` to filter producteurs based on role
- CENTRE users only see producteurs from their centre
- ADMIN and AGENT see all producteurs

### achats.jsx
- Uses `getAchatsQuery(user)` to filter purchases
- Checks `canPerformAction(user, "create_achat")` before allowing weighing
- AGENT users cannot access this page (redirected to dashboard)
- CENTRE users only see purchases from their centre

### Layout.jsx
- Routes to role-specific dashboards
- Hides menu items based on role permissions
- Prevents access to restricted pages

---

## 🔒 Security

### RLS Policies

All tables have Row Level Security enabled with policies that:

1. **ADMIN**: Full access via policy check
2. **CENTRE**: Filtered by `centre_id` matching user's assigned centre
3. **AGENT**: Limited access (producteurs only, no achats)

### Frontend Checks

Even with RLS, frontend checks prevent UI access:

```javascript
// In Layout.jsx
if (isAdmin || isCentre) {
  return <Achats />
}
return <DashboardCentral /> // Redirect if no access
```

---

## 📝 Usage Examples

### Creating a CENTRE User

```javascript
// 1. Sign up
const { data: authData } = await supabase.auth.signUp({
  email: "centre@example.com",
  password: "password123"
})

// 2. Create profile
await supabase.from("utilisateurs").insert({
  user_id: authData.user.id,
  email: "centre@example.com",
  nom: "Centre Manager",
  role: "CENTRE",
  centre_id: "uuid-of-centre", // Required!
})
```

### Filtering Data in Components

```javascript
import { useAuth } from "./context/AuthContext"
import { getProducteursQuery } from "./utils/rolePermissions"

function MyComponent() {
  const { user } = useAuth()
  
  useEffect(() => {
    async function loadData() {
      const query = getProducteursQuery(user)
      const { data } = await query
      setProducteurs(data)
    }
    loadData()
  }, [user])
}
```

---

## 🎯 Next Steps

1. **Test the system** with users of each role
2. **Verify RLS policies** are working correctly
3. **Implement future features**:
   - Parcelles management (AGENT)
   - Field activities (AGENT)
   - Centre statistics page (CENTRE)

---

## 📚 Files Created/Modified

### New Files
- `database/create_cooperative_schema.sql` - Complete database schema
- `src/utils/rolePermissions.js` - Role-based query utilities
- `src/pages/dashboards/AdminDashboard.jsx` - Admin dashboard
- `src/pages/dashboards/CentreDashboard.jsx` - Centre dashboard
- `src/pages/dashboards/AgentDashboard.jsx` - Agent dashboard

### Modified Files
- `src/context/AuthContext.jsx` - Added `isAgent`, `isCentre`, `centreId`
- `src/components/Navbar.jsx` - Role-based navigation
- `src/components/Layout.jsx` - Role-based routing and dashboards
- `src/Producteurs.jsx` - Role-based filtering
- `src/achats.jsx` - Role-based filtering and access control

---

## ✅ Testing Checklist

- [ ] ADMIN can access all pages and see all data
- [ ] CENTRE can only see producteurs and achats from their centre
- [ ] AGENT can see all producteurs but cannot access achats
- [ ] Navigation menu shows correct items for each role
- [ ] Dashboards display correct statistics for each role
- [ ] RLS policies prevent unauthorized data access
- [ ] Frontend redirects prevent UI access to restricted pages

---

**System Status**: ✅ Complete and ready for testing
