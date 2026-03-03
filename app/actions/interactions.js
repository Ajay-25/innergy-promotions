'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import {
  sewadarCore,
  promotionLogs,
  goldenMembers,
} from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { hasPermission } from '@/lib/permissions'

/**
 * Look up sewadar_core.id by Clerk user id (clerk_id column). Used for attribution when caller is linked.
 */
export async function getLinkedSewadarId(clerkUserId) {
  if (!clerkUserId) return null
  const [row] = await db
    .select({ id: sewadarCore.id })
    .from(sewadarCore)
    .where(eq(sewadarCore.clerkId, clerkUserId))
    .limit(1)
  return row?.id ?? null
}

export async function getMySewadarId() {
  const user = await currentUser()
  if (!user) return null
  const byClerkId = await getLinkedSewadarId(user.id)
  if (byClerkId) return byClerkId
  const email = user.emailAddresses?.[0]?.emailAddress
  if (!email) return null
  const row = await db.select({ id: sewadarCore.id }).from(sewadarCore).where(eq(sewadarCore.email, email)).limit(1)
  return row[0]?.id ?? null
}

/**
 * Get promotions (and golden-member-style entries). Users with promotions:view or system:manage_access see all; others see only their own.
 */
export async function getPromotions() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  const canViewAll = hasPermission(perms, 'promotions:view') || hasPermission(perms, 'system:manage_access')
  const mySewadarId = await getMySewadarId()

  const rows = await db
    .select({
      id: promotionLogs.id,
      interactionType: promotionLogs.interactionType,
      citizenName: promotionLogs.citizenName,
      contactNumber: promotionLogs.contactNumber,
      emailUsed: promotionLogs.emailUsed,
      appStatus: promotionLogs.appStatus,
      techIssueNotes: promotionLogs.techIssueNotes,
      createdAt: promotionLogs.createdAt,
      registeredBy: promotionLogs.registeredBy,
      sewadarName: sewadarCore.name,
      goldenMemberId: goldenMembers.id,
      citizenZone: goldenMembers.zone,
    })
    .from(promotionLogs)
    .leftJoin(sewadarCore, eq(promotionLogs.registeredBy, sewadarCore.id))
    .leftJoin(goldenMembers, eq(promotionLogs.contactNumber, goldenMembers.phone))
    .orderBy(desc(promotionLogs.createdAt))

  const filtered = canViewAll ? rows : rows.filter((r) => r.registeredBy === mySewadarId)

  return {
    data: filtered.map((r) => ({
      id: r.id,
      interaction_type: r.interactionType || 'Standard',
      citizen_name: r.citizenName || '',
      contact_number: r.contactNumber || '',
      email_used: r.emailUsed || '',
      app_status: r.appStatus || '',
      tech_issue_notes: r.techIssueNotes || '',
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      registered_by: r.registeredBy,
      sewadar_name: (r.sewadarName && r.sewadarName.trim()) || '—',
      registered_by_name: (r.sewadarName && r.sewadarName.trim()) || '—',
      golden_member_id: r.goldenMemberId ?? null,
      citizen_zone: (r.citizenZone && r.citizenZone.trim()) || '',
    })),
  }
}

/**
 * Get golden members. Users with golden_members:view or system:manage_access see all; others see only their own.
 */
export async function getGoldenMembers() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const perms = Array.isArray(user.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  const canViewAll = hasPermission(perms, 'golden_members:view') || hasPermission(perms, 'system:manage_access')
  const mySewadarId = await getMySewadarId()

  const rows = await db
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
      sewadarName: sewadarCore.name,
    })
    .from(goldenMembers)
    .leftJoin(sewadarCore, eq(goldenMembers.registeredBy, sewadarCore.id))
    .orderBy(desc(goldenMembers.createdAt))

  const filtered = canViewAll ? rows : rows.filter((r) => r.registeredBy === mySewadarId)

  return {
    data: filtered.map((r) => ({
      id: r.id,
      name: r.name || '',
      phone: r.phone || '',
      innergy_email: r.innergyEmail || '',
      gender: r.gender || '',
      preferred_language: r.preferredLanguage || '',
      dob: r.dob || '',
      address: r.address || '',
      zone: r.zone || '',
      center: r.center || '',
      remarks: r.remarks || '',
      registered_by: r.registeredBy,
      registered_by_name: (r.sewadarName && r.sewadarName.trim()) || '—',
      created_at: r.createdAt,
    })),
  }
}

/**
 * Log a standard promotion. Optional sewadar_id for proxy (admin) attribution; else uses getLinkedSewadarId(userId).
 * Requires promotions:log (or system:manage_access).
 */
export async function logStandardPromotion(data) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const user = await currentUser()
  const perms = Array.isArray(user?.publicMetadata?.permissions) ? user.publicMetadata.permissions : []
  if (!hasPermission(perms, 'promotions:log') && !hasPermission(perms, 'system:manage_access')) {
    return { error: 'Forbidden' }
  }

  let sewadarId = data.sewadar_id ?? null
  if (!sewadarId) sewadarId = await getLinkedSewadarId(userId)
  if (!sewadarId) return { error: 'Could not resolve sewadar (link your account in Access or provide sewadar_id)' }

  await db.insert(promotionLogs).values({
    registeredBy: sewadarId,
    interactionType: 'Standard',
    citizenName: data.citizen_name ?? '',
    contactNumber: data.contact_number ?? '',
    emailUsed: data.email_used ?? '',
    appStatus: data.app_status || null,
    techIssueNotes: data.tech_issue_notes ?? '',
  })

  return { ok: true }
}

// Golden member registration is handled by upsertGoldenMember in @/app/actions/golden-members.js
