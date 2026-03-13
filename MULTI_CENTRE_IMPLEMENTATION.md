# Multi-Centre Cooperative Management System

## 📋 Overview

Complete multi-tenant architecture where each centre only sees its own data. Implements strict data isolation using Row Level Security (RLS) policies and role-based filtering.

---

## 🗄️ Database Schema

### Tables Structure

#### `centres`
- `id` (UUID, PRIMARY KEY)
- `nom` (TEXT)
- `code` (TEXT, UNIQUE)
- `ville`, `responsable`, `adresse`, `telephone`, `email` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `utilisateurs`
- `id` (UUID, PRIMARY KEY, references auth.users.id)
- `email` (TEXT, UNIQUE)
- `nom` (TEXT)
- `role` (TEXT) - ADMIN | AGENT | CENTRE
- `centre_id` (UUID, references centres.id)
- `actif` (BOOLEAN, default true)
- `status` (TEXT) - active | suspended | banned
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `producteurs`
- `id` (UUID, PRIMARY KEY)
- `nom` (TEXT)
- `code` (TEXT, UNIQUE)
- `telephone` (TEXT)
- `centre_id` (UUID, references centres.id)
- `photo`, `photo_cni_recto`, `photo_cni_verso`, `carte_planteur` (TEXT)
- `localite`, `ville` (TEXT)
- `statut` (TEXT, default 'actif')
- `created_by` (UUID, references utilisateurs.id)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `achats`
- `id` (UUID, PRIMARY KEY)
- `producteur_id` (UUID, references producteurs.id)
- `centre_id` (UUID, references centres.id)
- `poids` (NUMERIC)
- `sacs` (INTEGER)
- `prix_unitaire` (NUMERIC)
- `montant` (NUMERIC)
- `date_pesee` (TIMESTAMPTZ)
- `utilisateur_id` (UUID, references utilisateurs.id)
- `nom_producteur`, `code_producteur`, `nom_agent` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `parcelles`
- `id` (UUID, PRIMARY KEY)
- `producteur_id` (UUID, references producteurs.id)
- `centre_id` (UUID, references centres.id)
- `superficie` (NUMERIC)
- `localisation` (TEXT)
- `coordonnees` (TEXT)
- `type_cacao` (TEXT)
- `annee_plantation` (INTEGER)
- `statut` (TEXT, default 'active')
- `created_by` (UUID, references utilisateurs.id)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `livraisons`
- `id` (UUID, PRIMARY KEY)
- `centre_id` (UUID, references centres.id)
- `poids_total` (NUMERIC)
- `nombre_sacs` (INTEGER)
- `statut` (TEXT) - EN_ATTENTE | VALIDE
- `date_livraison` (TIMESTAMPTZ)
- `utilisateur_id` (UUID, references utilisateurs.id)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

---

## 🔐 RLS Security Policies

### Helper Functions (Avoid Recursion)

```sql
-- Check if user is admin
CREATE FUNCTION public.is_admin(user_id UUID) RETURNS BOOLEAN
SECURITY DEFINER;

-- Check if user is agent
CREATE FUNCTION public.is_agent(user_id UUID) RETURNS BOOLEAN
SECURITY DEFINER;

-- Get user's centre_id
CREATE FUNCTION public.get_user_centre_id(user_id UUID) RETURNS UUID
SECURITY DEFINER;
```

### Policy Rules

#### ADMIN
- ✅ Full access to all tables
- ✅ Can read/write all centres, users, producteurs, achats, parcelles, livraisons

#### CENTRE
- ✅ Can only read/write data where `centre_id = their centre_id`
- ✅ Can manage: producteurs, achats, parcelles (read), livraisons
- ❌ Cannot access other centres' data

#### AGENT
- ✅ Can only read/write data where `centre_id = their centre_id`
- ✅ Can manage: producteurs, parcelles
- ❌ Cannot access: achats, livraisons

---

## 📊 Centre Dashboard

### Statistics Cards

1. **Nombre de Producteurs** - Count of producteurs in centre
2. **Nombre de Pesées** - Count of achats in centre
3. **Nombre de Tickets** - Same as pesées (each achat = 1 ticket)
4. **Poids Total Acheté** - Sum of poids from achats
5. **Livraisons Validées** - Count of livraisons with statut = 'VALIDE'
6. **Livraisons en Attente** - Count of livraisons with statut = 'EN_ATTENTE'

### Charts

1. **Monthly Cocoa Purchases** - Line chart showing poids over last 12 months
2. **Top 10 Producteurs** - Bar chart showing top producers by weight
3. **Livraisons Status** - Pie chart showing validated vs pending deliveries
4. **Stock by Centre** - Bar chart showing stock levels (achats - livraisons)

---

## 🧭 Navigation Menu

### CENTRE Role Menu

```
Dashboard
Producteurs
Achats
Gestion Parcelles
Livraisons
Paramètres
```

### Data Filtering

All queries automatically filter by `centre_id`:

```javascript
// Example: Fetch producteurs
const query = getProducteursQuery(user)
// For CENTRE: automatically adds .eq("centre_id", user.centre_id)
```

---

## 💻 Frontend Implementation

### Query Utilities

**File**: `src/utils/rolePermissions.js`

Functions:
- `getProducteursQuery(user)` - Filtered producteurs query
- `getAchatsQuery(user)` - Filtered achats query
- `getParcellesQuery(user)` - Filtered parcelles query
- `getLivraisonsQuery(user)` - Filtered livraisons query
- `canPerformAction(user, action, resource)` - Permission checks
- `filterDataByRole(data, user, dataType)` - Client-side filtering

### Dashboard Component

**File**: `src/pages/dashboards/CentreDashboardEnhanced.jsx`

Features:
- 6 statistics cards
- 4 interactive charts using Recharts
- Real-time data loading
- Responsive design

### Chart Components

**File**: `src/components/charts/CentreCharts.jsx`

Components:
- `MonthlyPurchasesChart` - Line chart
- `TopProducteursChart` - Horizontal bar chart
- `LivraisonsStatusChart` - Pie chart
- `StockByCentreChart` - Bar chart

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Execute in Supabase SQL Editor:

```sql
-- Run: database/create_multi_centre_schema.sql
```

This creates:
- All tables with proper structure
- RLS policies for multi-centre isolation
- Helper functions to avoid recursion
- Indexes for performance

### Step 2: Install Dependencies

```bash
npm install recharts
```

### Step 3: Verify Environment Variables

Ensure `.env.local` contains:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Test Multi-Centre Isolation

1. Create two centres
2. Create CENTRE users for each centre
3. Create producteurs linked to different centres
4. Login as CENTRE user from centre 1
5. Verify only centre 1 data is visible
6. Login as CENTRE user from centre 2
7. Verify only centre 2 data is visible

---

## 📝 Example Queries

### Fetch Producteurs (CENTRE user)

```javascript
const { data } = await supabase
  .from("producteurs")
  .select("*")
  .eq("centre_id", user.centre_id) // Automatically filtered by RLS
  .order("nom", { ascending: true })
```

### Fetch Achats (CENTRE user)

```javascript
const { data } = await supabase
  .from("achats")
  .select("*")
  .eq("centre_id", user.centre_id) // Automatically filtered by RLS
  .order("date_pesee", { ascending: false })
```

### Fetch Livraisons (CENTRE user)

```javascript
const { data } = await supabase
  .from("livraisons")
  .select("*")
  .eq("centre_id", user.centre_id) // Automatically filtered by RLS
  .order("date_livraison", { ascending: false })
```

### Monthly Purchases Query

```javascript
const { data } = await supabase
  .from("achats")
  .select("poids, date_pesee")
  .eq("centre_id", user.centre_id)
  .gte("date_pesee", twelveMonthsAgo)
  .order("date_pesee", { ascending: true })
```

---

## ✅ Testing Checklist

- [ ] Database schema created successfully
- [ ] RLS policies applied correctly
- [ ] CENTRE user can only see their centre's data
- [ ] AGENT user can only see their centre's data
- [ ] ADMIN user can see all data
- [ ] Dashboard loads with correct statistics
- [ ] Charts display correctly
- [ ] Navigation menu shows correct items for CENTRE role
- [ ] All queries filter by centre_id automatically
- [ ] No data leakage between centres

---

## 🔒 Security Notes

1. **RLS Policies**: All tables have RLS enabled with centre-based filtering
2. **Helper Functions**: Use SECURITY DEFINER to avoid recursion
3. **Frontend Filtering**: Additional client-side checks for extra security
4. **Role Checks**: Application layer verifies permissions before operations

---

## 📚 Files Created/Modified

### New Files
- `database/create_multi_centre_schema.sql` - Complete schema with RLS
- `src/pages/dashboards/CentreDashboardEnhanced.jsx` - Enhanced dashboard
- `src/components/charts/CentreCharts.jsx` - Chart components
- `MULTI_CENTRE_IMPLEMENTATION.md` - This documentation

### Modified Files
- `src/components/Navbar.jsx` - Updated CENTRE menu
- `src/components/Layout.jsx` - Added routing for parcelles/livraisons
- `src/utils/rolePermissions.js` - Added parcelles/livraisons queries

---

**System Status**: ✅ Complete multi-centre architecture ready for deployment
