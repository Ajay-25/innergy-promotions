import { pgTable, uuid, text, date, timestamp, foreignKey, unique, boolean, time, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const appStatusEnum = pgEnum("app_status_enum", ['Already Installed', 'New Installation'])
export const attendanceStatusEnum = pgEnum("attendance_status_enum", ['Present', 'Absent', 'Potential', 'Confirmed'])
export const availabilityStatusEnum = pgEnum("availability_status_enum", ['Available', 'Unavailable', 'Tentative'])
export const callStatusEnum = pgEnum("call_status_enum", ['pending', 'called', 'no_answer', 'interested', 'not_interested'])
export const moduleTypeEnum = pgEnum("module_type_enum", ['Module 1', 'Module 2', 'Both'])
export const outreachModuleEnum = pgEnum("outreach_module_enum", ['module_1', 'module_2', 'both'])
export const sewaTypeEnum = pgEnum("sewa_type_enum", ['Trainer', 'Promotion', 'Both'])


export const trainingEvents = pgTable("training_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().default(').notNull(),
	moduleType: moduleTypeEnum("module_type").default('Module 1').notNull(),
	eventDate: date("event_date").notNull(),
	timing: text().default('),
	venue: text().default('),
	trainerIds: uuid("trainer_ids").array().default([""]),
	supportSewadarIds: uuid("support_sewadar_ids").array().default([""]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const goldenMembers = pgTable("golden_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	registeredBy: uuid("registered_by"),
	name: text().notNull(),
	phone: text().notNull(),
	center: text().default('),
	zone: text().default('),
	dob: date(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	gender: text().default('),
	address: text().default('),
	innergyEmail: text("innergy_email"),
	preferredLanguage: text("preferred_language").default('),
	remarks: text().default('),
}, (table) => [
	foreignKey({
			columns: [table.registeredBy],
			foreignColumns: [sewadarCore.id],
			name: "golden_members_registered_by_sewadar_core_id_fk"
		}).onDelete("set null"),
	unique("golden_members_phone_unique").on(table.phone),
	unique("golden_members_innergy_email_unique").on(table.innergyEmail),
]);

export const eventPhotos = pgTable("event_photos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	photoUrl: text("photo_url").default(').notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [trainingEvents.id],
			name: "event_photos_event_id_training_events_id_fk"
		}).onDelete("cascade"),
]);

export const sewadarCore = pgTable("sewadar_core", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clerkId: text("clerk_id"),
	permissions: text().array().default([""]).notNull(),
	systemRole: text("system_role").default('pending').notNull(),
	phone: text().default('),
	gender: text().default('),
	dob: date(),
	zone: text().default('),
	center: text().default('),
	name: text().default(').notNull(),
	address: text().default('),
	isFieldVolunteer: boolean("is_field_volunteer").default(true).notNull(),
	profileCompleted: boolean("profile_completed").default(false).notNull(),
	weeklyRoutine: text("weekly_routine").array().default([""]).notNull(),
	nextSundayDate: date("next_sunday_date"),
	isAvailableOnDate: boolean("is_available_on_date"),
	sewaType: text("sewa_type").default('Promotion').notNull(),
	qualification: text().default('),
	qualificationOther: text("qualification_other").default('),
	profession: text().default('),
	professionOther: text("profession_other").default('),
}, (table) => [
	unique("sewadar_core_email_unique").on(table.email),
	unique("sewadar_core_clerk_id_unique").on(table.clerkId),
]);

export const promotionLogs = pgTable("promotion_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	registeredBy: uuid("registered_by"),
	interactionType: text("interaction_type").default('Standard'),
	citizenName: text("citizen_name").default('),
	contactNumber: text("contact_number").default('),
	emailUsed: text("email_used").default('),
	appStatus: appStatusEnum("app_status"),
	techIssueNotes: text("tech_issue_notes").default('),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.registeredBy],
			foreignColumns: [sewadarCore.id],
			name: "promotion_logs_registered_by_sewadar_core_id_fk"
		}).onDelete("set null"),
]);

export const sewadarRoster = pgTable("sewadar_roster", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sewadarId: uuid("sewadar_id").notNull(),
	plannedDate: date("planned_date").notNull(),
	eventRemarks: text("event_remarks").default('),
	availabilityStatus: availabilityStatusEnum("availability_status").default('Available').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isAvailableOnDate: boolean("is_available_on_date").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sewadarId],
			foreignColumns: [sewadarCore.id],
			name: "sewadar_roster_sewadar_id_sewadar_core_id_fk"
		}).onDelete("cascade"),
]);

export const eventAttendance = pgTable("event_attendance", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	goldenMemberId: uuid("golden_member_id").notNull(),
	moduleAttended: moduleTypeEnum("module_attended"),
	status: attendanceStatusEnum().default('Absent').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [trainingEvents.id],
			name: "event_attendance_event_id_training_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.goldenMemberId],
			foreignColumns: [goldenMembers.id],
			name: "event_attendance_golden_member_id_golden_members_id_fk"
		}).onDelete("cascade"),
]);

export const sewadarAttendance = pgTable("sewadar_attendance", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sewadarId: uuid("sewadar_id").notNull(),
	date: date().notNull(),
	timeOfSewa: time("time_of_sewa").notNull(),
	sewaArea: sewaTypeEnum("sewa_area").default('Promotion').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	markedBy: uuid("marked_by"),
}, (table) => [
	foreignKey({
			columns: [table.sewadarId],
			foreignColumns: [sewadarCore.id],
			name: "sewadar_attendance_sewadar_id_sewadar_core_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.markedBy],
			foreignColumns: [sewadarCore.id],
			name: "sewadar_attendance_marked_by_sewadar_core_id_fk"
		}).onDelete("set null"),
]);

export const eventOutreach = pgTable("event_outreach", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	memberId: uuid("member_id").notNull(),
	callStatus: callStatusEnum("call_status").default('pending').notNull(),
	trainingModule: outreachModuleEnum("training_module"),
	notes: text().default('),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [trainingEvents.id],
			name: "event_outreach_event_id_training_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [goldenMembers.id],
			name: "event_outreach_member_id_golden_members_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [sewadarCore.id],
			name: "event_outreach_updated_by_sewadar_core_id_fk"
		}).onDelete("set null"),
	unique("event_outreach_event_member_unique").on(table.eventId, table.memberId),
]);
