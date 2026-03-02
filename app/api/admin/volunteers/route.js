import { NextResponse } from 'next/server'
import { createAdminSupabase, getUserFromToken, canAccessDirectory } from '@/lib/api-auth'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function GET(request) {
  const user = await getUserFromToken(request)
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const adminSupabase = createAdminSupabase()
  if (!(await canAccessDirectory(adminSupabase, user.id))) {
    return cors(NextResponse.json({ error: 'Unauthorized: Missing directory:view permission' }, { status: 403 }))
  }

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').trim()
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  const from = page * pageSize
  const to = from + pageSize - 1

  try {
    // Smart fetch: core + explicit profiles_data fields for list + sheet (zero-fetch on open). No profiles_sensitive.
    const profilesDataFields = 'contact_number, email_id, gender, date_of_birth, age, permanent_address, department, region, primary_duty_current, primary_duty_permanent, permanent_icard_status, uniform, date_of_joining, years_of_membership, active_status'
    let query = adminSupabase
      .from('profiles_core')
      .select(`id, user_id, full_name, member_id, photo_url, role, profiles_data(${profilesDataFields})`, { count: 'exact' })
      .order('full_name')
      .range(from, to)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,member_id.ilike.%${search}%`)
    }

    const { data, count, error } = await query

    if (error) {
      return cors(NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return cors(NextResponse.json({ data: data ?? [], total: count ?? 0 }))
  } catch (err) {
    console.error('Volunteers list error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
