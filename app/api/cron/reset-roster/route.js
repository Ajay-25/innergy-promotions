import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sewadarCore } from '@/db/schema'
import { sql } from 'drizzle-orm'

function getNextSundayDateString() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  d.setDate(d.getDate() + daysUntilSunday)
  return d.toISOString().slice(0, 10)
}

/**
 * GET /api/cron/reset-roster
 * Resets is_available_on_date to null for all sewadar_core rows (weekly run).
 * Secured by CRON_SECRET. Do NOT touch weekly_routine.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Cron not configured: CRON_SECRET missing' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const querySecret = request.nextUrl?.searchParams?.get('cron_secret') ?? null
  const provided = bearerToken ?? querySecret
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const nextSunday = getNextSundayDateString()
    await db
      .update(sewadarCore)
      .set({
        nextSundayDate: nextSunday,
        isAvailableOnDate: null,
        updatedAt: new Date(),
      })
      .where(sql`1 = 1`)

    return NextResponse.json({
      ok: true,
      message: 'Sunday availability reset for all volunteers. weekly_routine unchanged.',
      nextSunday,
    })
  } catch (err) {
    console.error('reset-roster cron error:', err)
    return NextResponse.json(
      { error: err?.message || 'Reset failed' },
      { status: 500 }
    )
  }
}
