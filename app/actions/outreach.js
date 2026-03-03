'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import {
  goldenMembers,
  eventOutreach,
  eventAttendance,
  trainingEvents,
} from '@/db/schema'
import { eq, and, gte, ne } from 'drizzle-orm'
import { getLinkedSewadarId } from '@/app/actions/interactions'

const MODULE_MAP = {
  module_1: 'Module 1',
  module_2: 'Module 2',
  both: 'Both',
}

/**
 * Get all golden members with their outreach status for a given event.
 * Members without an outreach row show call_status 'pending'.
 */
export async function getEventOutreachList(eventId) {
  const user = await auth()
  if (!user?.userId) return { error: 'Unauthorized', data: [] }

  const members = await db
    .select({
      id: goldenMembers.id,
      name: goldenMembers.name,
      phone: goldenMembers.phone,
      zone: goldenMembers.zone,
    })
    .from(goldenMembers)
    .orderBy(goldenMembers.name)

  const outreachRows = await db
    .select({
      memberId: eventOutreach.memberId,
      id: eventOutreach.id,
      callStatus: eventOutreach.callStatus,
      trainingModule: eventOutreach.trainingModule,
      notes: eventOutreach.notes,
      updatedAt: eventOutreach.updatedAt,
    })
    .from(eventOutreach)
    .where(eq(eventOutreach.eventId, eventId))

  const byMember = Object.fromEntries(outreachRows.map((r) => [r.memberId, r]))

  return {
    data: members.map((m) => {
      const o = byMember[m.id]
      return {
        id: m.id,
        name: m.name ?? '',
        phone: m.phone ?? '',
        zone: m.zone ?? '',
        outreach_id: o?.id ?? null,
        call_status: o?.callStatus ?? 'pending',
        training_module: o?.trainingModule ?? null,
        notes: o?.notes ?? '',
        updated_at: o?.updatedAt ?? null,
      }
    }),
  }
}

/**
 * Derive training_module from available_module_1 and available_module_2.
 */
function deriveTrainingModule(availableModule1, availableModule2) {
  if (availableModule1 && availableModule2) return 'both'
  if (availableModule1) return 'module_1'
  if (availableModule2) return 'module_2'
  return null
}

/**
 * Log or update outreach result for a member. If call_status is 'interested',
 * creates or updates event_attendance with status 'Potential'.
 * If available_module_1 or available_module_2 are true, also upserts outreach
 * (and Potential attendance) for any upcoming event matching that module type.
 */
export async function logOutreachResult(data) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const sewadarId = await getLinkedSewadarId(userId)
  const currentEventId = data.event_id
  const memberId = data.member_id
  const callStatus = data.call_status
  const notes = data.notes ?? ''
  const availableModule1 = !!data.available_module_1
  const availableModule2 = !!data.available_module_2
  const trainingModule = data.training_module ?? deriveTrainingModule(availableModule1, availableModule2)

  if (!currentEventId || !memberId || !callStatus) {
    return { error: 'event_id, member_id, and call_status are required' }
  }

  const validStatuses = ['pending', 'called', 'no_answer', 'interested', 'not_interested']
  if (!validStatuses.includes(callStatus)) {
    return { error: 'Invalid call_status' }
  }

  const now = new Date()
  const today = new Date().toISOString().slice(0, 10)

  async function upsertOutreachForEvent(evId, mod, status = callStatus) {
    const [ex] = await db
      .select({ id: eventOutreach.id })
      .from(eventOutreach)
      .where(and(eq(eventOutreach.eventId, evId), eq(eventOutreach.memberId, memberId)))
      .limit(1)
    const payload = {
      callStatus: status,
      trainingModule: mod,
      notes,
      updatedBy: sewadarId,
      updatedAt: now,
    }
    if (ex) {
      await db.update(eventOutreach).set(payload).where(eq(eventOutreach.id, ex.id))
    } else {
      await db.insert(eventOutreach).values({
        eventId: evId,
        memberId,
        callStatus: status,
        trainingModule: mod,
        notes,
        updatedBy: sewadarId,
        updatedAt: now,
      })
    }
    if (status === 'interested') {
      const [att] = await db
        .select({ id: eventAttendance.id })
        .from(eventAttendance)
        .where(and(eq(eventAttendance.eventId, evId), eq(eventAttendance.goldenMemberId, memberId)))
        .limit(1)
      const moduleAttended = mod ? MODULE_MAP[mod] ?? null : null
      if (att) {
        await db.update(eventAttendance).set({ status: 'Potential', ...(moduleAttended && { moduleAttended }) }).where(eq(eventAttendance.id, att.id))
      } else {
        await db.insert(eventAttendance).values({ eventId: evId, goldenMemberId: memberId, moduleAttended: moduleAttended ?? null, status: 'Potential' })
      }
    }
  }

  await upsertOutreachForEvent(currentEventId, trainingModule)

  if ((availableModule1 || availableModule2) && callStatus === 'interested') {
    const upcoming = await db
      .select({ id: trainingEvents.id, moduleType: trainingEvents.moduleType })
      .from(trainingEvents)
      .where(and(gte(trainingEvents.eventDate, today), ne(trainingEvents.id, currentEventId)))
      .orderBy(trainingEvents.eventDate)

    for (const ev of upcoming) {
      const match1 = availableModule1 && (ev.moduleType === 'Module 1' || ev.moduleType === 'Both')
      const match2 = availableModule2 && (ev.moduleType === 'Module 2' || ev.moduleType === 'Both')
      if (!match1 && !match2) continue
      const mod = match1 && match2 ? 'both' : match1 ? 'module_1' : 'module_2'
      await upsertOutreachForEvent(ev.id, mod, 'interested')
    }
  }

  return { ok: true }
}
