import { auth } from '@clerk/nextjs/server'

/** Extract Bearer token from request (for API routes that need a token). */
export function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7).trim() || null
}

/** Get the current Clerk user id in API routes. Returns null if unauthenticated. */
export async function getUserFromRequest() {
  const { userId } = await auth()
  return userId ? { id: userId } : null
}

/** Compatible with legacy callers that pass request. Uses Clerk auth() (request-scoped in App Router). */
export async function getUserFromToken(_request) {
  const { userId } = await auth()
  return userId ? { id: userId } : null
}

/** Stub: no Supabase admin client. Use Neon/Drizzle for DB operations. */
export function createAdminSupabase() {
  return null
}

/** Stub: permission check. Use Clerk + your own role store (e.g. Neon) when needed. */
export async function isAdmin(_adminClient, _userId) {
  return false
}

/** Stub: directory access. Implement via Clerk metadata or Neon profile when needed. */
export async function canAccessDirectory(_adminClient, _userId) {
  return false
}

/** Stub: profile edit. Implement via Clerk metadata or Neon when needed. */
export async function canEditVolunteerProfiles(_adminClient, _userId) {
  return false
}

/** Stub: stock manage. Implement when needed. */
export async function canManageStock(_adminClient, _userId) {
  return false
}

/** Stub: stock access. Implement when needed. */
export async function canAccessStock(_adminClient, _userId) {
  return false
}

/** No Supabase server client. Use Clerk auth() for request auth. */
export function createServerSupabaseClient(_accessToken) {
  return null
}
