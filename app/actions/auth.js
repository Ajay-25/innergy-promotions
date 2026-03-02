'use server'

import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { sewadarCore } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Just-In-Time sync: when a user logs in, if Clerk publicMetadata.synced is not true,
 * look up sewadar_core by email, store clerk_id, and copy DB permissions into Clerk
 * publicMetadata so the session reflects pre-provisioned permissions.
 */
export async function syncUserPermissions() {
  const { userId } = await auth()
  const user = await currentUser()
  if (!userId || !user) return { ok: false, error: 'Unauthorized' }

  const synced = user.publicMetadata?.synced === true
  if (synced) return { ok: true }

  const email = user.emailAddresses?.[0]?.emailAddress
  if (!email) return { ok: false, error: 'No email' }

  const [row] = await db
    .select({ id: sewadarCore.id, permissions: sewadarCore.permissions, systemRole: sewadarCore.systemRole })
    .from(sewadarCore)
    .where(eq(sewadarCore.email, email))
    .limit(1)

  if (!row) {
    return { ok: true }
  }

  const permissions = Array.isArray(row.permissions) ? row.permissions : []
  const systemRole = row.systemRole || 'volunteer'

  await db
    .update(sewadarCore)
    .set({ clerkId: userId, updatedAt: new Date() })
    .where(eq(sewadarCore.id, row.id))

  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        permissions,
        role: systemRole,
        synced: true,
      },
    })
  } catch (e) {
    return { ok: false, error: 'Failed to sync Clerk metadata' }
  }

  return { ok: true }
}
