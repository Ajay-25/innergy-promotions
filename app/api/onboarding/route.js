import { NextResponse } from 'next/server'
import { createAdminSupabase, getUserFromToken } from '@/lib/api-auth'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

/**
 * GET /api/onboarding — Check if the authenticated user's email matches a profiles_core row.
 * Returns { found: true, member_id } if a match exists (unlinked profile), or { found: false }.
 */
export async function GET(request) {
  const user = await getUserFromToken(request)
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const adminSupabase = createAdminSupabase()

  try {
    const email = user.email
    if (!email) return cors(NextResponse.json({ found: false }))

    const { data, error } = await adminSupabase
      .from('profiles_core')
      .select('id, member_id, user_id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    if (error) {
      return cors(NextResponse.json({ error: error.message }, { status: 500 }))
    }

    if (data && !data.user_id) {
      return cors(NextResponse.json({ found: true, member_id: data.member_id }))
    }

    if (data && data.user_id) {
      return cors(NextResponse.json({ found: true, member_id: data.member_id, already_linked: true }))
    }

    return cors(NextResponse.json({ found: false }))
  } catch (err) {
    console.error('Onboarding lookup error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

/**
 * POST /api/onboarding — Link the authenticated user to a profiles_core record by Member ID.
 * Body: { member_id: string }
 * Verifies the Member ID exists and is unlinked, then sets user_id and email.
 */
export async function POST(request) {
  const user = await getUserFromToken(request)
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const adminSupabase = createAdminSupabase()

  try {
    const { member_id } = await request.json()
    if (!member_id || typeof member_id !== 'string' || !member_id.trim()) {
      return cors(NextResponse.json({ error: 'Member ID is required' }, { status: 400 }))
    }

    const trimmedId = member_id.trim()

    const { data: profile, error: findError } = await adminSupabase
      .from('profiles_core')
      .select('id, user_id, member_id')
      .ilike('member_id', trimmedId)
      .maybeSingle()

    if (findError) {
      return cors(NextResponse.json({ error: findError.message }, { status: 500 }))
    }

    if (!profile) {
      return cors(NextResponse.json({ error: 'No profile found with this Member ID' }, { status: 404 }))
    }

    if (profile.user_id && profile.user_id !== user.id) {
      return cors(NextResponse.json({ error: 'This profile is already linked to another account' }, { status: 409 }))
    }

    if (profile.user_id === user.id) {
      return cors(NextResponse.json({ success: true, message: 'Already linked' }))
    }

    // Link: set user_id and email on the profiles_core row
    const { error: updateError } = await adminSupabase
      .from('profiles_core')
      .update({ user_id: user.id, email: user.email })
      .eq('id', profile.id)

    if (updateError) {
      return cors(NextResponse.json({ error: updateError.message }, { status: 500 }))
    }

    return cors(NextResponse.json({ success: true }))
  } catch (err) {
    console.error('Onboarding link error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
