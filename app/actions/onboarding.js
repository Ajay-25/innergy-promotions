'use server'

import { redirect } from 'next/navigation'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { sewadarCore } from '@/db/schema'
import { eq } from 'drizzle-orm'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

/**
 * Returns whether the current user should be sent to /onboarding.
 * If the user has no sewadar_core row, we create one (profile_completed: false) so they can complete onboarding.
 */
export async function getOnboardingStatus() {
  const user = await currentUser()
  if (!user) return { shouldRedirectToOnboarding: false }
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  if (!email) return { shouldRedirectToOnboarding: false }

  const [row] = await db
    .select({
      id: sewadarCore.id,
      profileCompleted: sewadarCore.profileCompleted,
      systemRole: sewadarCore.systemRole,
    })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)

  if (!row) {
    const clerkName = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'User'
    await db.insert(sewadarCore).values({
      email,
      clerkId: user.id,
      name: clerkName,
      profileCompleted: false,
      systemRole: 'pending',
    })
    return { shouldRedirectToOnboarding: true, systemRole: 'pending' }
  }

  const systemRole = (row.systemRole ?? 'volunteer').toLowerCase()
  return {
    shouldRedirectToOnboarding: row.profileCompleted === false,
    systemRole,
  }
}

/**
 * Save onboarding form data and set profile_completed = true, then redirect to /dashboard.
 */
export async function completeOnboarding(data) {
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
  const gender = typeof data.gender === 'string' && GENDER_OPTIONS.includes(data.gender) ? data.gender : null
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
        profileCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(sewadarCore.id, row.id))
  }

  try {
    const client = await clerkClient()
    const parts = (name || '').trim().split(/\s+/)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ') || ''
    await client.users.updateUser(user.id, {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    })
  } catch {
    // Non-fatal
  }

  redirect('/dashboard')
}

/**
 * Set profile_completed = true without changing other fields, then redirect to /dashboard.
 */
export async function skipOnboarding() {
  const user = await currentUser()
  if (!user) return { error: 'Unauthorized' }
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  if (!email) return { error: 'No email' }

  await db
    .update(sewadarCore)
    .set({
      profileCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(sewadarCore.email, email))

  redirect('/dashboard')
}
