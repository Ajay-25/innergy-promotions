'use server'

import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import {
  sewadarCore,
  sewadarAttendance,
  sewadarRoster,
} from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { hasPermission, ALL_PERMISSIONS, ROLE_PERMISSIONS_MAP } from '@/lib/permissions'

function isAdmin(user) {
  const perms = Array.isArray(user?.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  return hasPermission(perms, 'system:manage_access')
}

/**
 * Fetch all sewadars from sewadar_core only (join-free). Returns permissions and sewa_type.
 */
export async function getSewadars() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarCore.id,
      name: sewadarCore.name,
      email: sewadarCore.email,
      clerkId: sewadarCore.clerkId,
      systemRole: sewadarCore.systemRole,
      permissions: sewadarCore.permissions,
      phone: sewadarCore.phone,
      gender: sewadarCore.gender,
      dob: sewadarCore.dob,
      zone: sewadarCore.zone,
      center: sewadarCore.center,
      qualification: sewadarCore.qualification,
      qualificationOther: sewadarCore.qualificationOther,
      profession: sewadarCore.profession,
      professionOther: sewadarCore.professionOther,
      createdAt: sewadarCore.createdAt,
      sewaType: sewadarCore.sewaType,
    })
    .from(sewadarCore)
    .where(eq(sewadarCore.status, 'approved'))
    .orderBy(sewadarCore.email)

  return {
    data: rows.map((r) => ({
      id: r.id,
      email: r.email || '',
      clerk_id: r.clerkId || null,
      system_role: r.systemRole || 'volunteer',
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      full_name: (r.name && r.name.trim()) || r.email || '—',
      phone: r.phone || '',
      gender: r.gender || '',
      dob: r.dob || null,
      zone: r.zone || '',
      center: r.center || '',
      qualification: r.qualification || '',
      qualification_other: r.qualificationOther || '',
      profession: r.profession || '',
      profession_other: r.professionOther || '',
      created_at: r.createdAt || null,
      sewa_type: r.sewaType || 'Promotion',
    })),
  }
}

/**
 * Get a single volunteer/sewadar by id. Requires sewadars:view or sewadars:edit or system:manage_access.
 */
export async function getSewadarById(id) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: null }

  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'sewadars:view') && !hasPermission(perms, 'sewadars:edit') && !hasPermission(perms, 'system:manage_access')) {
    return { error: 'Forbidden', data: null }
  }

  const [row] = await db
    .select({
      id: sewadarCore.id,
      name: sewadarCore.name,
      email: sewadarCore.email,
      phone: sewadarCore.phone,
      gender: sewadarCore.gender,
      dob: sewadarCore.dob,
      address: sewadarCore.address,
      zone: sewadarCore.zone,
      center: sewadarCore.center,
      qualification: sewadarCore.qualification,
      qualificationOther: sewadarCore.qualificationOther,
      profession: sewadarCore.profession,
      professionOther: sewadarCore.professionOther,
      sewaType: sewadarCore.sewaType,
      createdAt: sewadarCore.createdAt,
    })
    .from(sewadarCore)
    .where(eq(sewadarCore.id, id))
    .limit(1)

  if (!row) return { error: 'Not found', data: null }

  return {
    data: {
      id: row.id,
      full_name: (row.name && row.name.trim()) || row.email || '—',
      email: row.email || '',
      phone: row.phone || '',
      gender: row.gender || '',
      dob: row.dob ?? '',
      address: row.address || '',
      zone: row.zone || '',
      center: row.center || '',
      qualification: row.qualification || '',
      qualification_other: row.qualificationOther || '',
      profession: row.profession || '',
      profession_other: row.professionOther || '',
      sewa_type: row.sewaType || 'Promotion',
      created_at: row.createdAt,
    },
  }
}

/**
 * Update volunteer profile (name, phone, gender, dob, address, zone, center, qualification, profession, sewa_type).
 * Requires sewadars:edit or system:manage_access.
 */
export async function updateVolunteerProfile(id, data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'sewadars:edit') && !hasPermission(perms, 'system:manage_access')) {
    return { error: 'Forbidden' }
  }

  const [row] = await db.select({ id: sewadarCore.id }).from(sewadarCore).where(eq(sewadarCore.id, id)).limit(1)
  if (!row) return { error: 'Not found' }

  const name = typeof data.full_name === 'string' ? data.full_name.trim() : undefined
  const phone = typeof data.phone === 'string' ? data.phone.trim() || null : undefined
  const gender = data.gender && ['Male', 'Female', 'Other'].includes(data.gender) ? data.gender : undefined
  const dob = data.dob || undefined
  const address = typeof data.address === 'string' ? data.address.trim() || null : undefined
  const zone = typeof data.zone === 'string' ? data.zone.trim() || null : undefined
  const center = typeof data.center === 'string' ? data.center.trim() || null : undefined
  const qualification = typeof data.qualification === 'string' ? data.qualification.trim() || null : undefined
  const qualificationOther = typeof data.qualification_other === 'string' ? data.qualification_other.trim() || null : undefined
  const profession = typeof data.profession === 'string' ? data.profession.trim() || null : undefined
  const professionOther = typeof data.profession_other === 'string' ? data.profession_other.trim() || null : undefined
  const sewaType = ['Trainer', 'Promotion', 'Both'].includes(data.sewa_type) ? data.sewa_type : undefined

  const updatePayload = {}
  if (name !== undefined) updatePayload.name = name
  if (phone !== undefined) updatePayload.phone = phone
  if (gender !== undefined) updatePayload.gender = gender
  if (dob !== undefined) updatePayload.dob = dob
  if (address !== undefined) updatePayload.address = address
  if (zone !== undefined) updatePayload.zone = zone
  if (center !== undefined) updatePayload.center = center
  if (qualification !== undefined) updatePayload.qualification = qualification
  if (qualificationOther !== undefined) updatePayload.qualificationOther = qualificationOther
  if (profession !== undefined) updatePayload.profession = profession
  if (professionOther !== undefined) updatePayload.professionOther = professionOther
  if (sewaType !== undefined) updatePayload.sewaType = sewaType
  if (Object.keys(updatePayload).length === 0) return { ok: true }

  updatePayload.updatedAt = new Date()

  await db.update(sewadarCore).set(updatePayload).where(eq(sewadarCore.id, id))
  return { ok: true }
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
        status: sewadarCore.status,
        permissions: sewadarCore.permissions,
        isFieldVolunteer: sewadarCore.isFieldVolunteer,
        phone: sewadarCore.phone,
        zone: sewadarCore.zone,
        center: sewadarCore.center,
        name: sewadarCore.name,
      })
      .from(sewadarCore)
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
      full_name: (r.name && r.name.trim()) || r.email || '—',
      clerk_id: r.clerkId || null,
      system_role: r.systemRole || 'volunteer',
      status: (r.status || 'approved'),
      is_field_volunteer: r.isFieldVolunteer ?? true,
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

/**
 * Field volunteers only (for Volunteer Directory tab). Returns sewadar_core rows where is_field_volunteer === true.
 */
export async function getFieldVolunteers() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarCore.id,
      name: sewadarCore.name,
      email: sewadarCore.email,
      phone: sewadarCore.phone,
      zone: sewadarCore.zone,
      center: sewadarCore.center,
      gender: sewadarCore.gender,
      dob: sewadarCore.dob,
    })
    .from(sewadarCore)
    .where(and(eq(sewadarCore.isFieldVolunteer, true), eq(sewadarCore.status, 'approved')))
    .orderBy(sewadarCore.name)

  return {
    data: rows.map((r) => ({
      id: r.id,
      full_name: (r.name && r.name.trim()) || r.email || 'Unnamed',
      email: r.email || '',
      phone: r.phone || '',
      zone: r.zone || '',
      center: r.center || '',
      gender: r.gender || '',
      dob: r.dob ?? null,
    })),
  }
}

/** Hierarchy: admin > moderator > volunteer. Moderators cannot edit admins. */
function canEditTarget(currentRole, targetRole) {
  if (!currentRole || currentRole === 'volunteer') return false
  if (currentRole === 'admin') return true
  if (currentRole === 'moderator') return targetRole !== 'admin'
  return false
}

/**
 * Update user access: system_role, permissions, and is_field_volunteer. Single source of truth (DB), then sync to Clerk.
 * Enforces hierarchy: moderators cannot modify admins.
 * Caller must have system:manage_access.
 */
export async function updateUserAccess(email, role, permissions, isFieldVolunteer) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }
  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'system:manage_access')) return { error: 'Forbidden' }

  const currentRole = (user.publicMetadata?.role ?? 'volunteer').toLowerCase()
  const validRoles = ['admin', 'moderator', 'volunteer', 'pending']
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

  const updatePayload = {
    systemRole: newRole,
    permissions,
    updatedAt: new Date(),
  }
  if (typeof isFieldVolunteer === 'boolean') {
    updatePayload.isFieldVolunteer = isFieldVolunteer
  }

  await db
    .update(sewadarCore)
    .set(updatePayload)
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

const SEWADAR_STATUSES = ['pending', 'approved', 'inactive', 'suspended']

/**
 * Update a sewadar's status (e.g. deactivate without deleting). Caller must have system:manage_access.
 * @param {string} sewadarId - sewadar_core.id (UUID)
 * @param {string} newStatus - one of: pending, approved, inactive, suspended
 */
export async function updateUserStatus(sewadarId, newStatus) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }
  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'system:manage_access')) return { error: 'Forbidden' }

  const status = typeof newStatus === 'string' ? newStatus.toLowerCase().trim() : ''
  if (!SEWADAR_STATUSES.includes(status)) return { error: 'Invalid status' }

  const [row] = await db
    .select({ id: sewadarCore.id })
    .from(sewadarCore)
    .where(eq(sewadarCore.id, sewadarId))
    .limit(1)

  if (!row) return { error: 'Sewadar not found' }

  await db
    .update(sewadarCore)
    .set({ status, updatedAt: new Date() })
    .where(eq(sewadarCore.id, sewadarId))

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
 * Register a new volunteer/sewadar (sewadar_core only). All profile fields stored on core.
 */
export async function registerVolunteer(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const existing = await db.select({ id: sewadarCore.id }).from(sewadarCore).where(eq(sewadarCore.email, data.email)).limit(1)
  if (existing.length > 0) return { error: 'A sewadar with this email already exists' }

  const systemRole = ['admin', 'moderator', 'volunteer', 'pending'].includes((data.system_role || '').toLowerCase())
    ? (data.system_role || 'pending').toLowerCase()
    : 'pending'
  const permissions = Array.isArray(data.permissions) && data.permissions.length > 0
    ? data.permissions
    : (ROLE_PERMISSIONS_MAP[systemRole] ?? ROLE_PERMISSIONS_MAP.pending ?? [])
  const isFieldVolunteer =
    typeof data.is_field_volunteer === 'boolean'
      ? data.is_field_volunteer
      : systemRole === 'admin'
        ? false
        : true

  const phone = typeof data.phone === 'string' ? data.phone.trim() : ''
  const name = typeof data.full_name === 'string' ? data.full_name.trim() : ''
  const clerkId = typeof data.clerk_id === 'string' && data.clerk_id.trim() ? data.clerk_id.trim() : null
  const sewaType = ['Trainer', 'Promotion', 'Both'].includes(data.sewa_type) ? data.sewa_type : 'Promotion'

  const qualification = typeof data.qualification === 'string' ? data.qualification.trim() || null : null
  const qualificationOther = typeof data.qualification_other === 'string' ? data.qualification_other.trim() || null : null
  const profession = typeof data.profession === 'string' ? data.profession.trim() || null : null
  const professionOther = typeof data.profession_other === 'string' ? data.profession_other.trim() || null : null

  const [inserted] = await db.insert(sewadarCore).values({
    email: data.email,
    name: name || data.email || 'Unnamed',
    clerkId: clerkId || undefined,
    systemRole,
    status: 'approved',
    permissions,
    isFieldVolunteer,
    phone: phone || null,
    gender: (data.gender && ['Male', 'Female', 'Other'].includes(data.gender)) ? data.gender : null,
    dob: data.dob || null,
    zone: (data.zone && typeof data.zone === 'string') ? data.zone.trim() || null : null,
    center: (data.center && typeof data.center === 'string') ? data.center.trim() || null : null,
    qualification: qualification ?? undefined,
    qualificationOther: qualificationOther ?? undefined,
    profession: profession ?? undefined,
    professionOther: professionOther ?? undefined,
    sewaType,
  }).returning({ id: sewadarCore.id })

  if (!inserted) return { error: 'Insert failed' }

  if (clerkId) {
    try {
      const client = await clerkClient()
      const clerkUser = await client.users.getUser(clerkId)
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          role: systemRole,
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

/** @deprecated Use registerVolunteer. Kept for backward compatibility. */
export async function registerSewadar(data) {
  return registerVolunteer(data)
}

/**
 * Get attendance records (optionally filtered by date). Returns marked_by and current_user_sewadar_id for edit gating.
 */
export async function getAttendance(dateFilter) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  const [myRow] = email
    ? await db
        .select({ id: sewadarCore.id })
        .from(sewadarCore)
        .where(eq(sewadarCore.email, email))
        .limit(1)
    : []

  const rows = await db
    .select({
      id: sewadarAttendance.id,
      sewadarId: sewadarAttendance.sewadarId,
      markedBy: sewadarAttendance.markedBy,
      date: sewadarAttendance.date,
      timeOfSewa: sewadarAttendance.timeOfSewa,
      sewaArea: sewadarAttendance.sewaArea,
      name: sewadarCore.name,
      email: sewadarCore.email,
    })
    .from(sewadarAttendance)
    .innerJoin(sewadarCore, eq(sewadarAttendance.sewadarId, sewadarCore.id))
    .orderBy(desc(sewadarAttendance.createdAt))

  const filtered = dateFilter ? rows.filter((r) => String(r.date) === dateFilter) : rows

  return {
    data: filtered.map((r) => ({
      id: r.id,
      sewadar_id: r.sewadarId,
      sewadar_name: (r.name && r.name.trim()) || r.email || '—',
      email: r.email || '—',
      marked_by: r.markedBy ?? null,
      date: r.date,
      time_of_sewa: r.timeOfSewa,
      sewa_area: r.sewaArea,
      sewa_performed: `${r.sewaArea || ''} - Logged`,
    })),
    current_user_sewadar_id: myRow?.id ?? null,
  }
}

/**
 * Get roster: per-volunteer from sewadar_core only (weekly_routine, next_sunday_date, is_available_on_date).
 * Returns { data: [ { sewadar_id, sewadar_name, weekly_routine, specific_entries } ], nextSunday }.
 * No sewadar_data join for roster; all availability lives on core.
 */
export async function getRoster() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const rows = await db
    .select({
      id: sewadarCore.id,
      name: sewadarCore.name,
      weeklyRoutine: sewadarCore.weeklyRoutine,
      nextSundayDate: sewadarCore.nextSundayDate,
      isAvailableOnDate: sewadarCore.isAvailableOnDate,
    })
    .from(sewadarCore)
    .where(and(eq(sewadarCore.isFieldVolunteer, true), eq(sewadarCore.status, 'approved')))
    .orderBy(sewadarCore.name)

  const nextSunday = getNextSundayDateString()

  const data = rows.map((r) => {
    const weekly_routine = Array.isArray(r.weeklyRoutine) ? r.weeklyRoutine : []
    const specific_entries = []
    if (r.nextSundayDate != null) {
      const rawAvailable = r.isAvailableOnDate
      specific_entries.push({
        id: null,
        planned_date: r.nextSundayDate,
        is_available_on_date: rawAvailable,
        event_remarks: '',
        availability_status:
          rawAvailable === true ? 'Available' : rawAvailable === false ? 'Unavailable' : 'Pending',
      })
    }
    return {
      sewadar_id: r.id,
      sewadar_name: (r.name && r.name.trim()) || '—',
      weekly_routine,
      specific_entries,
    }
  })

  return {
    data,
    nextSunday,
  }
}

function getNextSundayDateString() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  d.setDate(d.getDate() + daysUntilSunday)
  return d.toISOString().slice(0, 10)
}

/**
 * Log daily attendance for a volunteer. Sets marked_by to current user's sewadar id when available.
 */
export async function logAttendance(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  const [myRow] = email
    ? await db
        .select({ id: sewadarCore.id })
        .from(sewadarCore)
        .where(eq(sewadarCore.email, email))
        .limit(1)
    : []

  await db.insert(sewadarAttendance).values({
    sewadarId: data.sewadar_id,
    markedBy: myRow?.id ?? null,
    date: data.date,
    timeOfSewa: data.time_of_sewa,
    sewaArea: data.sewa_area,
  })

  return { ok: true }
}

/**
 * Update an existing attendance record. Allowed only if user has sewadars:edit_attendance OR is the record's marked_by author.
 */
export async function updateAttendance(attendanceId, data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  const [myRow] = email
    ? await db
        .select({ id: sewadarCore.id })
        .from(sewadarCore)
        .where(eq(sewadarCore.email, email))
        .limit(1)
    : []
  const mySewadarId = myRow?.id ?? null

  const [record] = await db
    .select({ id: sewadarAttendance.id, markedBy: sewadarAttendance.markedBy })
    .from(sewadarAttendance)
    .where(eq(sewadarAttendance.id, attendanceId))
    .limit(1)

  if (!record) return { error: 'Attendance record not found' }

  const isAuthor = mySewadarId && record.markedBy && String(record.markedBy) === String(mySewadarId)
  const canEdit = hasPermission(perms, 'sewadars:edit_attendance')
  if (!canEdit && !isAuthor) return { error: 'You do not have permission to edit this attendance record' }

  const updates = {}
  if (data.date != null) updates.date = data.date
  if (data.time_of_sewa != null) updates.timeOfSewa = data.time_of_sewa
  if (data.sewa_area != null) updates.sewaArea = data.sewa_area
  if (Object.keys(updates).length === 0) return { ok: true }

  await db
    .update(sewadarAttendance)
    .set(updates)
    .where(eq(sewadarAttendance.id, attendanceId))

  return { ok: true }
}

/**
 * Save roster: update sewadar_core only (weekly_routine, next_sunday_date, is_available_on_date).
 * Optionally append to sewadar_roster for historical tracking.
 * No sewadar_data used; all availability lives on core.
 */
export async function logRoster(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }

  const hasSpecific = data.specific_date != null && data.specific_date !== ''
  const hasRoutine = Array.isArray(data.weekly_routine)

  if (!hasSpecific && !hasRoutine) return { error: 'Provide at least specific_date or weekly_routine' }

  const updates = { updatedAt: new Date() }
  if (hasSpecific) {
    updates.nextSundayDate = data.specific_date
    updates.isAvailableOnDate = data.is_available_on_date !== false
  }
  if (hasRoutine) {
    updates.weeklyRoutine = data.weekly_routine
  }

  await db
    .update(sewadarCore)
    .set(updates)
    .where(eq(sewadarCore.id, data.sewadar_id))

  if (hasSpecific) {
    const isAvailable = data.is_available_on_date !== false
    const existing = await db
      .select({ id: sewadarRoster.id })
      .from(sewadarRoster)
      .where(
        and(
          eq(sewadarRoster.sewadarId, data.sewadar_id),
          eq(sewadarRoster.plannedDate, data.specific_date)
        )
      )
      .limit(1)
    if (existing.length > 0) {
      await db
        .update(sewadarRoster)
        .set({
          isAvailableOnDate: isAvailable,
          eventRemarks: data.event_remarks ?? '',
          availabilityStatus: isAvailable ? (data.availability_status || 'Available') : 'Unavailable',
        })
        .where(eq(sewadarRoster.id, existing[0].id))
    } else {
      await db.insert(sewadarRoster).values({
        sewadarId: data.sewadar_id,
        plannedDate: data.specific_date,
        isAvailableOnDate: isAvailable,
        eventRemarks: data.event_remarks || '',
        availabilityStatus: isAvailable ? (data.availability_status || 'Available') : 'Unavailable',
      })
    }
  }

  return { ok: true }
}
