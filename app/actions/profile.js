'use server'

import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { sewadarCore } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Get the current user's profile from sewadar_core only (by email).
 * Single source of truth; no joins.
 */
export async function getMyProfile() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized', profile: null }
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  const clerkName = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'User'

  const [row] = await db
    .select()
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)

  if (!row) {
    return {
      profile: {
        name: clerkName,
        phone: '',
        email,
        gender: '',
        dob: null,
        address: '',
        zone: '',
        center: '',
        system_role: 'volunteer',
        permissions: [],
      },
    }
  }

  return {
    profile: {
      name: (row.name && row.name.trim()) || clerkName,
      phone: row.phone || '',
      email: row.email,
      gender: row.gender || '',
      dob: row.dob ?? null,
      address: row.address || '',
      zone: row.zone || '',
      center: row.center || '',
      system_role: row.systemRole ?? 'volunteer',
      permissions: row.permissions ?? [],
    },
  }
}

/**
 * Update the current user's profile. Writes only to sewadar_core and Clerk (firstName/lastName).
 * Email cannot be changed.
 */
export async function updateMyProfile(data) {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  if (!email) return { error: 'No email' }

  const [row] = await db
    .select({ id: sewadarCore.id })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)

  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const phone = typeof data.phone === 'string' ? data.phone.trim() : ''
  const gender = typeof data.gender === 'string' && ['Male', 'Female', 'Other'].includes(data.gender) ? data.gender : null
  const dob = data.dob || null
  const address = typeof data.address === 'string' ? data.address.trim() : ''

  if (row) {
    await db
      .update(sewadarCore)
      .set({
        name: name || 'Unnamed',
        phone: phone || null,
        gender,
        dob: dob || null,
        address: address || null,
        updatedAt: new Date(),
      })
      .where(eq(sewadarCore.id, row.id))
  }

  // Sync name to Clerk so nav/sidebar show correct name
  try {
    const client = await clerkClient()
    const parts = (name || '').trim().split(/\s+/)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ') || ''
    await client.users.updateUser(user.id, {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    })
  } catch (e) {
    // Non-fatal; DB is source of truth
  }

  return { ok: true }
}
