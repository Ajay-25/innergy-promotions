'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import {
  trainingEvents,
  eventAttendance,
  eventOutreach,
  goldenMembers,
} from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

/**
 * Fetch all training events.
 */
export async function getEvents() {
  const rows = await db
    .select()
    .from(trainingEvents)
    .orderBy(desc(trainingEvents.eventDate))

  return {
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      module_type: r.moduleType,
      event_date: r.eventDate,
      timing: r.timing,
      venue: r.venue,
      trainer_ids: r.trainerIds ?? [],
      support_sewadar_ids: r.supportSewadarIds ?? [],
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
  }
}

/**
 * Fetch a single event by id.
 */
export async function getEvent(id) {
  if (!id) return { error: 'Missing event id', data: null }
  const [row] = await db
    .select()
    .from(trainingEvents)
    .where(eq(trainingEvents.id, id))
    .limit(1)
  if (!row) return { error: 'Event not found', data: null }
  return {
    data: {
      id: row.id,
      title: row.title,
      module_type: row.moduleType,
      event_date: row.eventDate,
      timing: row.timing,
      venue: row.venue,
      trainer_ids: row.trainerIds ?? [],
      support_sewadar_ids: row.supportSewadarIds ?? [],
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    },
  }
}

/**
 * Create a new training event.
 */
export async function createEvent(eventData) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const [inserted] = await db
    .insert(trainingEvents)
    .values({
      title: eventData.title ?? '',
      moduleType: eventData.module_type ?? 'Module 1',
      eventDate: eventData.event_date,
      timing: eventData.timing ?? '',
      venue: eventData.venue ?? '',
      trainerIds: eventData.trainer_ids ?? [],
      supportSewadarIds: eventData.support_sewadar_ids ?? [],
    })
    .returning({ id: trainingEvents.id })

  if (!inserted) return { error: 'Insert failed' }
  return { ok: true, id: inserted.id }
}

/**
 * Get attendance rows for an event (for event detail page).
 */
export async function getEventAttendance(eventId) {
  const rows = await db
    .select({
      id: eventAttendance.id,
      eventId: eventAttendance.eventId,
      goldenMemberId: eventAttendance.goldenMemberId,
      moduleAttended: eventAttendance.moduleAttended,
      status: eventAttendance.status,
      name: goldenMembers.name,
      phone: goldenMembers.phone,
    })
    .from(eventAttendance)
    .innerJoin(goldenMembers, eq(eventAttendance.goldenMemberId, goldenMembers.id))
    .where(eq(eventAttendance.eventId, eventId))
    .orderBy(goldenMembers.name)

  return {
    data: rows.map((r) => ({
      id: r.id,
      event_id: r.eventId,
      golden_member_id: r.goldenMemberId,
      full_name: r.name ?? '—',
      contact_no: r.phone ?? '—',
      module_attended: r.moduleAttended,
      status: r.status,
    })),
  }
}

/**
 * Log or update attendance for one member at an event.
 * If a row exists, we could add an update path; for now we only insert.
 */
export async function logEventAttendance(attendanceData) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  await db.insert(eventAttendance).values({
    eventId: attendanceData.event_id,
    goldenMemberId: attendanceData.golden_member_id,
    moduleAttended: attendanceData.module_attended ?? null,
    status: attendanceData.status ?? 'Absent',
  })

  return { ok: true }
}

/**
 * Update existing attendance row (for event detail "Save Attendance").
 */
export async function updateEventAttendance(id, updates) {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const payload = {}
  if (updates.status != null) payload.status = updates.status
  if (updates.module_attended != null) payload.moduleAttended = updates.module_attended
  if (Object.keys(payload).length === 0) return { ok: true }

  await db
    .update(eventAttendance)
    .set(payload)
    .where(eq(eventAttendance.id, id))

  return { ok: true }
}

/**
 * Full-list attendance: all golden members with their outreach and attendance for this event.
 * Used for event detail page to show every CRM member with call status and Present toggle.
 */
export async function getEventFullAttendanceList(eventId) {
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

  const attendanceRows = await db
    .select({
      id: eventAttendance.id,
      goldenMemberId: eventAttendance.goldenMemberId,
      status: eventAttendance.status,
    })
    .from(eventAttendance)
    .where(eq(eventAttendance.eventId, eventId))

  const outreachRows = await db
    .select({
      memberId: eventOutreach.memberId,
      callStatus: eventOutreach.callStatus,
    })
    .from(eventOutreach)
    .where(eq(eventOutreach.eventId, eventId))

  const attByMember = Object.fromEntries(attendanceRows.map((r) => [r.goldenMemberId, r]))
  const outreachByMember = Object.fromEntries(outreachRows.map((r) => [r.memberId, r]))

  return {
    data: members.map((m) => {
      const att = attByMember[m.id]
      const o = outreachByMember[m.id]
      return {
        id: m.id,
        name: m.name ?? '',
        phone: m.phone ?? '',
        zone: m.zone ?? '',
        attendance_id: att?.id ?? null,
        attendance_status: att?.status ?? null,
        call_status: o?.callStatus ?? 'pending',
      }
    }),
  }
}

/**
 * Set one member's attendance status for an event (insert or update).
 */
export async function setEventAttendanceStatus(eventId, memberId, status) {
  const user = await auth()
  if (!user?.userId) return { error: 'Unauthorized' }

  const [existing] = await db
    .select({ id: eventAttendance.id })
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.goldenMemberId, memberId)))
    .limit(1)

  const validStatuses = ['Present', 'Absent', 'Potential', 'Confirmed']
  if (!validStatuses.includes(status)) return { error: 'Invalid status' }

  if (existing) {
    await db.update(eventAttendance).set({ status }).where(eq(eventAttendance.id, existing.id))
  } else {
    await db.insert(eventAttendance).values({
      eventId,
      goldenMemberId: memberId,
      status,
    })
  }
  return { ok: true }
}
