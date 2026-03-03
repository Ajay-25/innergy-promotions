'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goldenMembers, eventAttendance, promotionLogs } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasPermission } from '@/lib/permissions'
import { getMySewadarId } from '@/app/actions/interactions'

/**
 * Upsert a golden member by phone. If phone exists, update; else create with registered_by = current user's sewadar.
 * If eventId is passed, inserts (or skips if exists) an event_attendance row with status Present.
 * Requires golden_members:register (or system:manage_access).
 * @param {Object} data - all GoldenMemberForm fields + optional sewadar_id
 * @param {string} [eventId] - optional; when set, member is marked Present for this event
 */
export async function upsertGoldenMember(data, eventId) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const user = await currentUser()
  const perms = Array.isArray(user?.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'golden_members:register') && !hasPermission(perms, 'golden_members:edit') && !hasPermission(perms, 'system:manage_access')) {
    return { error: 'Forbidden' }
  }

  const phone = (data.phone ?? '').toString().trim()
  const name = (data.name ?? '').toString().trim()
  if (!phone || !name) return { error: 'Name and phone are required' }

  let sewadarId = data.sewadar_id ?? null
  if (!sewadarId) sewadarId = await getLinkedSewadarId(userId)
  if (!sewadarId) return { error: 'Could not resolve sewadar (link your account in Access or provide sewadar_id)' }

  const innergyEmail = (data.innergy_email ?? '').toString().trim() || null

  const [existing] = await db
    .select({ id: goldenMembers.id })
    .from(goldenMembers)
    .where(eq(goldenMembers.phone, phone))
    .limit(1)

  const updatePayload = {
    name,
    innergyEmail,
    gender: data.gender ?? '',
    preferredLanguage: data.preferred_language ?? '',
    dob: data.dob || null,
    address: data.address ?? '',
    zone: data.zone ?? '',
    center: data.center ?? '',
    remarks: data.remarks ?? '',
  }

  let memberId
  try {
    if (existing) {
      memberId = existing.id
      await db
        .update(goldenMembers)
        .set(updatePayload)
        .where(eq(goldenMembers.id, memberId))
    } else {
      const [inserted] = await db
        .insert(goldenMembers)
        .values({
          name,
          phone,
          innergyEmail,
          gender: data.gender ?? '',
          preferredLanguage: data.preferred_language ?? 'Hindi',
          dob: data.dob || null,
          address: data.address ?? '',
          zone: data.zone ?? '',
          center: data.center ?? '',
          remarks: data.remarks ?? '',
          registeredBy: sewadarId,
        })
        .returning({ id: goldenMembers.id })
      if (!inserted) return { error: 'Insert failed' }
      memberId = inserted.id
    }
  } catch (err) {
    if (err?.code === '23505') return { error: 'Innergy email is already registered for another member.' }
    throw err
  }

  if (eventId) {
    const [existingAtt] = await db
      .select({ id: eventAttendance.id })
      .from(eventAttendance)
      .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.goldenMemberId, memberId)))
      .limit(1)
    if (!existingAtt) {
      await db.insert(eventAttendance).values({
        eventId,
        goldenMemberId: memberId,
        status: 'Present',
      })
    }
  }

  await db.insert(promotionLogs).values({
    registeredBy: sewadarId,
    interactionType: 'Golden Member',
    citizenName: name,
    contactNumber: phone,
  })

  return { ok: true, id: memberId }
}

/**
 * Get a single golden member by id. Allowed if user has golden_members:view or system:manage_access,
 * or if the member was registered by the current user (same rule as list visibility).
 */
export async function getGoldenMemberById(id) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized', data: null }

  const [row] = await db
    .select({
      id: goldenMembers.id,
      name: goldenMembers.name,
      phone: goldenMembers.phone,
      innergyEmail: goldenMembers.innergyEmail,
      gender: goldenMembers.gender,
      preferredLanguage: goldenMembers.preferredLanguage,
      dob: goldenMembers.dob,
      address: goldenMembers.address,
      zone: goldenMembers.zone,
      center: goldenMembers.center,
      remarks: goldenMembers.remarks,
      registeredBy: goldenMembers.registeredBy,
      createdAt: goldenMembers.createdAt,
    })
    .from(goldenMembers)
    .where(eq(goldenMembers.id, id))
    .limit(1)

  if (!row) return { error: 'Not found', data: null }

  const current = await currentUser()
  const perms = Array.isArray(current?.publicMetadata?.permissions) ? current.publicMetadata.permissions : []
  const canViewAll = hasPermission(perms, 'golden_members:view') || hasPermission(perms, 'system:manage_access')
  const mySewadarId = await getMySewadarId()
  const canViewOwn = row.registeredBy !== null && row.registeredBy === mySewadarId
  if (!canViewAll && !canViewOwn) {
    return { error: 'Forbidden', data: null }
  }

  return {
    data: {
      id: row.id,
      name: row.name ?? '',
      phone: row.phone ?? '',
      innergy_email: row.innergyEmail ?? '',
      gender: row.gender ?? '',
      preferred_language: row.preferredLanguage ?? '',
      dob: row.dob ?? '',
      address: row.address ?? '',
      zone: row.zone ?? '',
      center: row.center ?? '',
      remarks: row.remarks ?? '',
      registered_by: row.registeredBy,
      created_at: row.createdAt,
    },
  }
}
