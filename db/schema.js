import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  time,
  boolean,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core'

// ============================================================
// ENUMS (Drizzle does not create PostgreSQL ENUMs by default; we use text + check in app or createEnum in migration)
// ============================================================

export const sewaTypeEnum = pgEnum('sewa_type_enum', ['Trainer', 'Promotion', 'Both'])
export const appStatusEnum = pgEnum('app_status_enum', ['Already Installed', 'New Installation'])
export const moduleTypeEnum = pgEnum('module_type_enum', ['Module 1', 'Module 2', 'Both'])
export const attendanceStatusEnum = pgEnum('attendance_status_enum', ['Present', 'Absent', 'Potential', 'Confirmed'])
export const availabilityStatusEnum = pgEnum('availability_status_enum', ['Available', 'Unavailable', 'Tentative'])
export const callStatusEnum = pgEnum('call_status_enum', ['pending', 'called', 'no_answer', 'interested', 'not_interested'])
export const outreachModuleEnum = pgEnum('outreach_module_enum', ['module_1', 'module_2', 'both'])

// ============================================================
// 1. SEWADAR MANAGEMENT (email as primary identifier for sewadars)
// ============================================================

export const sewadarCore = pgTable('sewadar_core', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  clerkId: text('clerk_id').unique(),
  systemRole: text('system_role').notNull().default('pending'),
  status: text('status').notNull().default('approved'),
  permissions: text('permissions').array().notNull().default(sql`'{}'::text[]`),
  isFieldVolunteer: boolean('is_field_volunteer').notNull().default(true),
  phone: text('phone').default(''),
  gender: text('gender').default(''),
  dob: date('dob'),
  address: text('address').default(''),
  zone: text('zone').default(''),
  center: text('center').default(''),
  qualification: text('qualification').default(''),
  qualificationOther: text('qualification_other').default(''),
  profession: text('profession').default(''),
  professionOther: text('profession_other').default(''),
  profileCompleted: boolean('profile_completed').notNull().default(false),
  sewaType: sewaTypeEnum('sewa_type').notNull().default('Promotion'),
  weeklyRoutine: text('weekly_routine').array().notNull().default(sql`'{}'::text[]`),
  nextSundayDate: date('next_sunday_date'),
  isAvailableOnDate: boolean('is_available_on_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sewadarAttendance = pgTable('sewadar_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  sewadarId: uuid('sewadar_id').notNull().references(() => sewadarCore.id, { onDelete: 'cascade' }),
  markedBy: uuid('marked_by').references(() => sewadarCore.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  timeOfSewa: time('time_of_sewa').notNull(),
  sewaArea: sewaTypeEnum('sewa_area').notNull().default('Promotion'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sewadarRoster = pgTable('sewadar_roster', {
  id: uuid('id').primaryKey().defaultRandom(),
  sewadarId: uuid('sewadar_id').notNull().references(() => sewadarCore.id, { onDelete: 'cascade' }),
  plannedDate: date('planned_date').notNull(),
  isAvailableOnDate: boolean('is_available_on_date').notNull().default(true),
  eventRemarks: text('event_remarks').default(''),
  availabilityStatus: availabilityStatusEnum('availability_status').notNull().default('Available'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// 2. APP PROMOTIONS TRACKING
// ============================================================

export const promotionLogs = pgTable('promotion_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  registeredBy: uuid('registered_by').references(() => sewadarCore.id, { onDelete: 'set null' }),
  interactionType: text('interaction_type').default('Standard'),
  citizenName: text('citizen_name').default(''),
  contactNumber: text('contact_number').default(''),
  emailUsed: text('email_used').default(''),
  appStatus: appStatusEnum('app_status'),
  techIssueNotes: text('tech_issue_notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// 3. GOLDEN MEMBERS (CRM) — citizens 50+, single lifecycle
// ============================================================

export const goldenMembers = pgTable('golden_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  innergyEmail: text('innergy_email').unique(),
  gender: text('gender').default(''),
  preferredLanguage: text('preferred_language').default(''),
  dob: date('dob'),
  address: text('address').default(''),
  zone: text('zone').default(''),
  center: text('center').default(''),
  remarks: text('remarks').default(''),
  registeredBy: uuid('registered_by').references(() => sewadarCore.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// 4. TRAINING EVENTS
// ============================================================

export const trainingEvents = pgTable('training_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default(''),
  moduleType: moduleTypeEnum('module_type').notNull().default('Module 1'),
  eventDate: date('event_date').notNull(),
  timing: text('timing').default(''),
  venue: text('venue').default(''),
  trainerIds: uuid('trainer_ids').array().default([]),
  supportSewadarIds: uuid('support_sewadar_ids').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventAttendance = pgTable('event_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => trainingEvents.id, { onDelete: 'cascade' }),
  goldenMemberId: uuid('golden_member_id').notNull().references(() => goldenMembers.id, { onDelete: 'cascade' }),
  moduleAttended: moduleTypeEnum('module_attended'),
  status: attendanceStatusEnum('status').notNull().default('Absent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventPhotos = pgTable('event_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => trainingEvents.id, { onDelete: 'cascade' }),
  photoUrl: text('photo_url').notNull().default(''),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================================
// 5. EVENT OUTREACH (calling / availability for training events)
// ============================================================

export const eventOutreach = pgTable('event_outreach', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => trainingEvents.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => goldenMembers.id, { onDelete: 'cascade' }),
  callStatus: callStatusEnum('call_status').notNull().default('pending'),
  trainingModule: outreachModuleEnum('training_module'),
  notes: text('notes').default(''),
  updatedBy: uuid('updated_by').references(() => sewadarCore.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventMemberUnique: unique('event_outreach_event_member_unique').on(t.eventId, t.memberId),
}))
