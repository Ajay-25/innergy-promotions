# Innergy Promotions - Architecture Reference

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | React 18, standalone output |
| Styling | Tailwind CSS + ShadCN UI (new-york, slate) | `components/ui/*` |
| Data Layer | Supabase (Auth + Postgres + RLS) | Service-role for admin ops |
| Server State | `@tanstack/react-query` | `useQuery`, `useMutation`, `queryClient` cache |
| Forms | `react-hook-form` + `zod` | Resolver-based validation |
| Icons | `lucide-react` | |
| Charts | `recharts` | |
| Toasts | `sonner` | |
| QR | `react-qr-code` + `html5-qrcode` | Generate & scan |

## Project Structure

```
app/
├── api/
│   ├── [[...path]]/route.js   # Catch-all API (health, profile, inventory, search)
│   ├── admin/                  # Dedicated admin endpoints
│   │   ├── access/route.js     # Role & module management
│   │   ├── volunteer/[id]/     # Single member detail
│   │   └── volunteers/route.js # Members list (smart-fetch)
│   └── onboarding/route.js     # Email→profile linking
├── auth/callback/page.js       # Supabase OAuth callback
├── dashboard/
│   ├── layout.js               # Auth shell, BottomNav, RBAC guard
│   ├── admin/access/page.js    # Access management
│   ├── attendance/page.js      # Attendance tracking
│   ├── id-cards/page.js        # ID card generation
│   ├── profile/page.js         # Personal profile (Digital ID)
│   ├── qr/page.js              # QR code view
│   ├── stock/page.js           # Inventory / POS
│   └── volunteers/page.js      # Member directory
├── onboarding/link-profile/    # First-time profile linking
├── globals.css
├── layout.js                   # Root layout + metadata
└── page.js                     # Auth page (sign-in / sign-up)

components/
├── dashboard/
│   ├── BottomNav.jsx           # Tab navigation (role-aware)
│   └── form-fields.jsx         # Reusable form field components
├── ui/                         # ShadCN primitives (40+ components)
└── Providers.js                # QueryClient + theme provider

contexts/
└── DashboardContext.js          # Session, role, modules, profile state

hooks/
├── use-mobile.jsx               # Mobile breakpoint detection
└── use-toast.js                 # Toast hook

lib/
├── api-auth.js                  # Supabase admin client, token helpers, RBAC checks
├── field-configs.js             # Form field definitions (personal, contact, address, etc.)
├── permissions.js               # Permission constants, role presets, route guards
├── (auth via Clerk; DB via Neon + Drizzle in db/)
└── utils.js                     # cn() and utilities
```

## Authentication & RBAC

### Auth Flow
1. User signs up/in via email+password (Supabase Auth)
2. On first login, onboarding flow links user to an existing `profiles_core` record by Member ID
3. `DashboardContext` provides `session`, `role`, `accessibleModules`, `profileCore`, `profileData`

### Permission Model
- **Permissions** use `resource:action` format (e.g. `stock:manage`, `directory:view`)
- **Role presets** map roles to permission sets: `admin`, `operations_manager`, `desk_moderator`, `attendance_scanner`, `custom`, `volunteer`
- **Admin** implicitly has all permissions
- **Route guards** via `canAccessRoute()` check pathname against `ROUTE_PERMISSIONS` map
- **API guards** via `isAdmin()`, `canEditVolunteerProfiles()`, `canManageStock()` in `lib/api-auth.js`

### Database Schema (Supabase Postgres)
| Table | Purpose |
|-------|---------|
| `profiles_core` | Core identity: `user_id`, `member_id`, `full_name`, `role`, `qr_code_url` |
| `profiles_data` | Extended data: contact, address, department, education, status |
| `profiles_sensitive` | Admin-only: ID proof, background checks, admin notes |
| `inventory_items` | Stock catalog with unit types and pricing |
| `inventory_logs` | POS issuance records |
| `stock_audit_logs` | Warehouse adjustment trail |

All tables use Row Level Security (RLS).

## Reusable Patterns

### API Pattern
- Catch-all route at `app/api/[[...path]]/route.js` handles most endpoints
- Bearer token auth via `getUserFromToken(request)`
- Admin operations use `createAdminSupabase()` (service-role key)
- Dedicated routes for complex admin operations

### Data Fetching
- "Smart fetch" pattern: list APIs return enough data for both list view and detail sheet (zero-fetch on detail open)
- `profiles_data` normalization: handle Supabase 1:1 join returning object or single-element array
- Optimistic updates with rollback on API failure

### UI Patterns
- Mobile-first layout with `BottomNav` for navigation
- ShadCN `Sheet` for detail views (slide-over panels)
- Read-only / Edit toggle pattern with `isEditing` state
- Field configs drive forms dynamically via `PROFILE_TABS` → `FieldGroup` → `FormField`

## Path Aliases
```json
{
  "@/*": ["./*"],
  "@/components/*": ["./components/*"],
  "@/lib/*": ["./lib/*"],
  "@/app/*": ["./app/*"]
}
```

## New Domain Mapping (from legacy YA-Core)

| Legacy Term | New Generic Term |
|-------------|-----------------|
| YA Core / YA-Core / VRP | People & Attendance App |
| `ya_id` | `member_id` |
| Sewa Center / `sewa_center` | Department / `department` |
| Sewa Zone / `sewa_zone` | Region / `region` |
| Sewa Details | Department Details |
| YA Status | Membership Status |
| `years_in_ya` | `years_of_membership` |
