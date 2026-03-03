/**
 * Permission-Based Access Control (PBAC) constants and helpers.
 * Admins can pre-provision permissions for sewadars by email; Clerk syncs on first login.
 */

export const PERMISSION_GROUPS = {
  System: [
    { key: 'system:manage_access', label: 'Manage Access' },
  ],
  Sewadars: [
    { key: 'sewadars:view', label: 'View Sewadars' },
    { key: 'sewadars:register', label: 'Register Sewadar' },
    { key: 'sewadars:mark_attendance', label: 'Mark Attendance' },
    { key: 'sewadars:manage_roster', label: 'Manage Roster' },
  ],
  Events: [
    { key: 'events:view', label: 'View Events' },
    { key: 'events:create', label: 'Create Event' },
    { key: 'events:manage_attendance', label: 'Manage Event Attendance' },
  ],
  Promotions: [
    { key: 'promotions:view', label: 'View Promotions' },
    { key: 'promotions:log', label: 'Log Promotion' },
    { key: 'golden_members:view', label: 'View Golden Members' },
    { key: 'golden_members:register', label: 'Register Golden Member' },
  ],
}

/** Flat list of all permission keys for validation and UI. */
export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flatMap((group) =>
  group.map((p) => p.key)
)

/** Role-to-permissions presets. Roles act as presets; permissions can still be fine-tuned manually. */
export const ROLE_PERMISSIONS_MAP = {
  admin: [...ALL_PERMISSIONS],
  moderator: [...ALL_PERMISSIONS],
  volunteer: [
    'promotions:view',
    'promotions:log',
    'golden_members:view',
    'golden_members:register',
    'sewadars:view',
  ],
  pending: [],
}

/**
 * Check if a user's permission array includes the required permission (or system:manage_access for full access).
 * @param {string[]} userPermissionsArray - Array of permission strings from session/DB
 * @param {string} requiredPermission - e.g. 'promotions:log'
 * @returns {boolean}
 */
export function hasPermission(userPermissionsArray, requiredPermission) {
  if (!Array.isArray(userPermissionsArray)) return false
  if (userPermissionsArray.includes('system:manage_access')) return true
  return userPermissionsArray.includes(requiredPermission)
}

/** Route pathname to required permission (first matching segment). */
const ROUTE_PERMISSIONS = {
  '/dashboard/admin/access': 'system:manage_access',
  '/dashboard/sewadars': 'sewadars:view',
  '/dashboard/events': 'events:view',
  '/dashboard/promotions': 'promotions:view',
  '/dashboard/golden-members': 'golden_members:view',
}

/**
 * Check if user can access the given route. Uses permissions (PBAC) or legacy role/accessibleModules.
 * @param {{ role?: string, permissions?: string[], accessibleModules?: string[] }} userCtx
 * @param {string} pathname - e.g. '/dashboard/admin/access'
 */
export function canAccessRoute(userCtx, pathname) {
  const perms = userCtx?.permissions ?? []
  if (hasPermission(perms, 'system:manage_access')) return true
  const required = ROUTE_PERMISSIONS[pathname]
  if (!required) return true
  if (hasPermission(perms, required)) return true
  if (userCtx?.role === 'admin') return true
  return false
}
