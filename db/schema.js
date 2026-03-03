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
} from 'drizzle-orm/pg-core'

// ============================================================
// ENUMS (Drizzle does not create PostgreSQL ENUMs by default; we use text + check in app or createEnum in migration)
// ============================================================

export const sewaTypeEnum = pgEnum('sewa_type_enum', ['Trainer', 'Promoter', 'Both'])
export const appStatusEnum = pgEnum('app_status_enum', ['Already Installed', 'New Installation'])
export const moduleTypeEnum = pgEnum('module_type_enum', ['Module 1', 'Module 2', 'Both'])
export const attendanceStatusEnum = pgEnum('attendance_status_enum', ['Present', 'Absent'])
export const availabilityStatusEnum = pgEnum('availability_status_enum', ['Available', 'Unavailable', 'Tentative'])

// ============================================================
// 1. SEWADAR MANAGEMENT (email as primary identifier for sewadars)
// ============================================================

export const sewadarCore = pgTable('sewadar_core', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  clerkId: text('clerk_id').unique(),
  systemRole: text('system_role').notNull().default('pending'),
  permissions: text('permissions').array().notNull().default(sql`'{}'::text[]`),
  isFieldVolunteer: boolean('is_field_volunteer').notNull().default(true),
  phone: text('phone').default(''),
  gender: text('gender').default(''),
  dob: date('dob'),
  address: text('address').default(''),
  zone: text('zone').default(''),
  center: text('center').default(''),
  profileCompleted: boolean('profile_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sewadarData = pgTable('sewadar_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  sewadarId: uuid('sewadar_id').notNull().unique().references(() => sewadarCore.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull().default(''),
  phone: text('phone').default(''),
  sewaType: sewaTypeEnum('sewa_type').notNull().default('Promoter'),
  address: text('address').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sewadarAttendance = pgTable('sewadar_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  sewadarId: uuid('sewadar_id').notNull().references(() => sewadarCore.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  timeOfSewa: time('time_of_sewa').notNull(),
  sewaArea: sewaTypeEnum('sewa_area').notNull().default('Promoter'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sewadarRoster = pgTable('sewadar_roster', {
  id: uuid('id').primaryKey().defaultRandom(),
  sewadarId: uuid('sewadar_id').notNull().references(() => sewadarCore.id, { onDelete: 'cascade' }),
  plannedDate: date('planned_date').notNull(),
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
// 3. GOLDEN MEMBERS (CRM)
// ============================================================

export const goldenMembers = pgTable('golden_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  registeredBy: uuid('registered_by').references(() => sewadarCore.id, { onDelete: 'set null' }),
  fullName: text('full_name').notNull().default(''),
  contactNo: text('contact_no').default(''),
  innergyEmail: text('innergy_email').default(''),
  cityCenter: text('city_center').default(''),
  zone: text('zone').default(''),
  dob: date('dob'),
  preferredLanguage: text('preferred_language').notNull().default('Hindi'),
  remarks: text('remarks').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
