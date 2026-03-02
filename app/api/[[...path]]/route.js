import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if ((route === '/' || route === '/health') && method === 'GET') {
      return cors(NextResponse.json({ status: 'ok', app: 'People & Attendance App' }))
    }

    const { userId } = await auth()
    if (!userId) {
      return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    return cors(
      NextResponse.json(
        { error: 'Endpoint migration in progress', message: 'API is moving to Clerk + Neon/Drizzle. Reimplement this route when ready.' },
        { status: 501 }
      )
    )
  } catch (err) {
    console.error('API Error:', err)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
