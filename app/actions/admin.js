'use server'

import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import {
  sewadarCore,
  sewadarData,
  sewadarAttendance,
  sewadarRoster,
} from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { hasPermission, ALL_PERMISSIONS, ROLE_PERMISSIONS_MAP } from '@/lib/permissions'

function isAdmin(user) {
  const perms = Array.isArray(user?.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  return hasPermission(perms, 'system:manage_access')
}

/**
 * Fetch all sewadars (core + data) for Directory and dropdowns. Returns permissions array per sewadar.
 */
export async function getSewadars() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarCore.id,
      email: sewadarCore.email,
      clerkId: sewadarCore.clerkId,
      systemRole: sewadarCore.systemRole,
      permissions: sewadarCore.permissions,
      phone: sewadarCore.phone,
      gender: sewadarCore.gender,
      dob: sewadarCore.dob,
      zone: sewadarCore.zone,
      center: sewadarCore.center,
      fullName: sewadarData.fullName,
      dataPhone: sewadarData.phone,
      sewaType: sewadarData.sewaType,
    })
    .from(sewadarCore)
    .leftJoin(sewadarData, eq(sewadarCore.id, sewadarData.sewadarId))
    .orderBy(sewadarCore.email)

  return {
    data: rows.map((r) => ({
      id: r.id,
      email: r.email || '',
      clerk_id: r.clerkId || null,
      system_role: r.systemRole || 'volunteer',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      full_name: r.fullName || '',
      phone: r.phone || r.dataPhone || '',
      gender: r.gender || '',
      dob: r.dob || null,
      zone: r.zone || '',
      center: r.center || '',
      sewa_type: r.sewaType || 'Promoter',
    })),
  }
}

/**
 * Unified Access Directory: merged list of DB Sewadars and Clerk users who have logged in.
 * Caller must have system:manage_access.
 * Returns array of { id, email, full_name, clerk_id, permissions, isSewadar } sorted by name/email.
 */
export async function getUnifiedAccessDirectory() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }
  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'system:manage_access')) return { error: 'Forbidden', data: [] }

  const [dbRows, clerkResponse] = await Promise.all([
    db
      .select({
        id: sewadarCore.id,
        email: sewadarCore.email,
        clerkId: sewadarCore.clerkId,
        systemRole: sewadarCore.systemRole,
        permissions: sewadarCore.permissions,
        phone: sewadarCore.phone,
        zone: sewadarCore.zone,
        center: sewadarCore.center,
        fullName: sewadarData.fullName,
      })
      .from(sewadarCore)
      .leftJoin(sewadarData, eq(sewadarCore.id, sewadarData.sewadarId))
      .orderBy(sewadarCore.email),
    (async () => {
      try {
        const client = await clerkClient()
        const res = await client.users.getUserList({ limit: 500, offset: 0 })
        return res.data ?? []
      } catch {
        return []
      }
    })(),
  ])

  const emailToSewadar = new Map()
  const unified = []

  for (const r of dbRows) {
    const email = (r.email || '').toLowerCase().trim()
    const entry = {
      id: r.id,
      email: r.email || '',
      full_name: r.fullName || '',
      clerk_id: r.clerkId || null,
      system_role: r.systemRole || 'volunteer',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      phone: r.phone || '',
      zone: r.zone || '',
      center: r.center || '',
      isSewadar: true,
    }
    unified.push(entry)
    if (email) emailToSewadar.set(email, entry)
  }

  for (const clerkUser of clerkResponse) {
    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
    const emailNorm = primaryEmail.toLowerCase().trim()
    if (emailToSewadar.has(emailNorm)) continue
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() || primaryEmail || 'User'
    unified.push({
      id: `clerk_${clerkUser.id}`,
      email: primaryEmail,
      full_name: fullName,
      clerk_id: clerkUser.id,
      system_role: null,
      permissions: [],
      isSewadar: false,
    })
  }

  unified.sort((a, b) => {
    const na = (a.full_name || a.email || '').toLowerCase()
    const nb = (b.full_name || b.email || '').toLowerCase()
    return na.localeCompare(nb)
  })

  return { data: unified }
}

/** Hierarchy: admin > moderator > volunteer. Moderators cannot edit admins. */
function canEditTarget(currentRole, targetRole) {
  if (!currentRole || currentRole === 'volunteer') return false
  if (currentRole === 'admin') return true
  if (currentRole === 'moderator') return targetRole !== 'admin'
  return false
}

/**
 * Update user access: system_role and permissions. Single source of truth (DB), then sync to Clerk.
 * Enforces hierarchy: moderators cannot modify admins.
 * Caller must have system:manage_access.
 */
export async function updateUserAccess(email, role, permissions) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }
  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'system:manage_access')) return { error: 'Forbidden' }

  const currentRole = (user.publicMetadata?.role ?? 'volunteer').toLowerCase()
  const validRoles = ['admin', 'moderator', 'volunteer']
  const newRole = (role || 'volunteer').toLowerCase()
  if (!validRoles.includes(newRole)) return { error: 'Invalid system role' }

  const validPerms = Array.isArray(permissions) && permissions.every((p) => ALL_PERMISSIONS.includes(p))
  if (!validPerms) return { error: 'Invalid permissions' }

  const [row] = await db
    .select({ id: sewadarCore.id, clerkId: sewadarCore.clerkId, systemRole: sewadarCore.systemRole })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)

  if (!row) return { error: 'Sewadar not found' }

  const targetRole = (row.systemRole ?? 'volunteer').toLowerCase()
  if (!canEditTarget(currentRole, targetRole)) {
    return { error: 'You cannot modify an Admin. Managed by Admins only.' }
  }
  if (currentRole === 'moderator' && newRole === 'admin') {
    return { error: 'Moderators cannot assign Admin role.' }
  }

  await db
    .update(sewadarCore)
    .set({
      systemRole: newRole,
      permissions,
      updatedAt: new Date(),
    })
    .where(eq(sewadarCore.email, email))

  if (row.clerkId) {
    try {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(row.clerkId)
      await client.users.updateUserMetadata(row.clerkId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          role: newRole,
          permissions,
          synced: true,
        },
      })
    } catch (_) {
      // DB is source of truth
    }
  }

  return { ok: true }
}

/** @deprecated Use updateUserAccess(email, role, permissions) instead. */
export async function updateSewadarPermissions(email, newPermissions) {
  const [row] = await db
    .select({ systemRole: sewadarCore.systemRole })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)
  const role = row?.systemRole ?? 'volunteer'
  return updateUserAccess(email, role, newPermissions)
}

/** @deprecated Use updateUserAccess(email, role, permissions) instead. */
export async function updateSewadarSystemRole(email, newSystemRole) {
  const [row] = await db
    .select({ permissions: sewadarCore.permissions })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)
  const permissions = Array.isArray(row?.permissions) ? row.permissions : []
  return updateUserAccess(email, newSystemRole, permissions)
}

/**
 * Register a new volunteer/sewadar (core + data). Accepts demographic and organizational fields.
 * Phone stored in sewadar_core (+91 format); also synced to sewadar_data for backward compatibility.
 */
export async function registerVolunteer(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const existing = await db.select({ id: sewadarCore.id }).from(sewadarCore).where(eq(sewadarCore.email, data.email)).limit(1)
  if (existing.length > 0) return { error: 'A sewadar with this email already exists' }

  const systemRole = ['admin', 'moderator', 'volunteer'].includes((data.system_role || '').toLowerCase())
    ? (data.system_role || 'volunteer').toLowerCase()
    : 'volunteer'
  const permissions = Array.isArray(data.permissions) && data.permissions.length > 0
    ? data.permissions
    : (ROLE_PERMISSIONS_MAP[systemRole] ?? ROLE_PERMISSIONS_MAP.volunteer)

  const phone = typeof data.phone === 'string' ? data.phone.trim() : ''
  const [inserted] = await db.insert(sewadarCore).values({
    email: data.email,
    systemRole,
    permissions,
    phone: phone || null,
    gender: (data.gender && ['Male', 'Female', 'Other'].includes(data.gender)) ? data.gender : null,
    dob: data.dob || null,
    zone: (data.zone && typeof data.zone === 'string') ? data.zone.trim() || null : null,
    center: (data.center && typeof data.center === 'string') ? data.center.trim() || null : null,
  }).returning({ id: sewadarCore.id })

  if (!inserted) return { error: 'Insert failed' }

  await db.insert(sewadarData).values({
    sewadarId: inserted.id,
    fullName: data.full_name || '',
    phone: phone || '',
    sewaType: data.sewa_type || 'Promoter',
  })

  return { ok: true }
}

/** @deprecated Use registerVolunteer. Kept for backward compatibility. */
export async function registerSewadar(data) {
  return registerVolunteer(data)
}

/**
 * Get attendance records (optionally filtered by date).
 */
export async function getAttendance(dateFilter) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarAttendance.id,
      sewadarId: sewadarAttendance.sewadarId,
      date: sewadarAttendance.date,
      timeOfSewa: sewadarAttendance.timeOfSewa,
      sewaArea: sewadarAttendance.sewaArea,
      fullName: sewadarData.fullName,
      email: sewadarCore.email,
    })
    .from(sewadarAttendance)
    .innerJoin(sewadarCore, eq(sewadarAttendance.sewadarId, sewadarCore.id))
    .leftJoin(sewadarData, eq(sewadarCore.id, sewadarData.sewadarId))
    .orderBy(desc(sewadarAttendance.createdAt))

  const filtered = dateFilter ? rows.filter((r) => String(r.date) === dateFilter) : rows

  return {
    data: filtered.map((r) => ({
      id: r.id,
      sewadar_id: r.sewadarId,
      sewadar_name: r.fullName || '—',
      email: r.email || '—',
      date: r.date,
      time_of_sewa: r.timeOfSewa,
      sewa_area: r.sewaArea,
      sewa_performed: `${r.sewaArea || ''} - Logged`,
    })),
  }
}

/**
 * Get roster (upcoming availability) records.
 */
export async function getRoster() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarRoster.id,
      sewadarId: sewadarRoster.sewadarId,
      plannedDate: sewadarRoster.plannedDate,
      eventRemarks: sewadarRoster.eventRemarks,
      availabilityStatus: sewadarRoster.availabilityStatus,
      fullName: sewadarData.fullName,
    })
    .from(sewadarRoster)
    .innerJoin(sewadarCore, eq(sewadarRoster.sewadarId, sewadarCore.id))
    .leftJoin(sewadarData, eq(sewadarCore.id, sewadarData.sewadarId))
    .orderBy(sewadarRoster.plannedDate)

  return {
    data: rows.map((r) => ({
      id: r.id,
      sewadar_id: r.sewadarId,
      sewadar_name: r.fullName || '—',
      planned_date: r.plannedDate,
      event_remarks: r.eventRemarks || '',
      availability_status: r.availabilityStatus,
    })),
  }
}

/**
 * Log daily attendance for a sewadar.
 */
export async function logAttendance(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  await db.insert(sewadarAttendance).values({
    sewadarId: data.sewadar_id,
    date: data.date,
    timeOfSewa: data.time_of_sewa,
    sewaArea: data.sewa_area,
  })

  return { ok: true }
}

/**
 * Log upcoming availability (roster).
 */
export async function logRoster(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  await db.insert(sewadarRoster).values({
    sewadarId: data.sewadar_id,
    plannedDate: data.planned_date,
    eventRemarks: data.event_remarks || '',
    availabilityStatus: data.availability_status || 'Available',
  })

  return { ok: true }
}
