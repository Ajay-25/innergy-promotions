import { NextResponse } from 'next/server'
import { createAdminSupabase, getUserFromToken, canAccessDirectory } from '@/lib/api-auth'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function GET(request, { params }) {
  const user = await getUserFromToken(request)
  if (!user) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const adminSupabase = createAdminSupabase()
  if (!(await canAccessDirectory(adminSupabase, user.id))) {
    return cors(NextResponse.json({ error: 'Unauthorized: Missing directory:view permission' }, { status: 403 }))
  }

  const paramId = params?.id
  if (!paramId) return cors(NextResponse.json({ error: 'ID required' }, { status: 400 }))

  try {
    const coreById = await adminSupabase.from('profiles_core').select('*').eq('id', paramId).single()
    const coreByUserId = coreById.data
      ? null
      : await adminSupabase.from('profiles_core').select('*').eq('user_id', paramId).single()
    const coreRes = coreById.data ? coreById : coreByUserId

    if (!coreRes.data) {
      return cors(NextResponse.json({ error: 'Profile not found' }, { status: 404 }))
    }

    const userId = coreRes.data.user_id
    const profileId = coreRes.data.id

    const [dataRes, sensitiveRes, inventoryRes] = await Promise.all([
      adminSupabase.from('profiles_data').select('*').eq('user_id', userId).single(),
      adminSupabase.from('profiles_sensitive').select('*').eq('user_id', userId).single(),
      adminSupabase.from('inventory_logs').select('*, inventory_items(item_name, variant)').eq('volunteer_id', profileId).order('created_at', { ascending: false }),
    ])

    return cors(NextResponse.json({
      core: coreRes.data,
      data: dataRes.data,
      sensitive: sensitiveRes.data,
      inventory: inventoryRes.data || [],
    }))
  } catch (err) {
    console.error('Volunteer detail error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
