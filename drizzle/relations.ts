import { relations } from "drizzle-orm/relations";
import { sewadarCore, goldenMembers, trainingEvents, eventPhotos, promotionLogs, sewadarRoster, eventAttendance, sewadarAttendance, eventOutreach } from "./schema";

export const goldenMembersRelations = relations(goldenMembers, ({one, many}) => ({
	sewadarCore: one(sewadarCore, {
		fields: [goldenMembers.registeredBy],
		references: [sewadarCore.id]
	}),
	eventAttendances: many(eventAttendance),
	eventOutreaches: many(eventOutreach),
}));

export const sewadarCoreRelations = relations(sewadarCore, ({many}) => ({
	goldenMembers: many(goldenMembers),
	promotionLogs: many(promotionLogs),
	sewadarRosters: many(sewadarRoster),
	sewadarAttendances_sewadarId: many(sewadarAttendance, {
		relationName: "sewadarAttendance_sewadarId_sewadarCore_id"
	}),
	sewadarAttendances_markedBy: many(sewadarAttendance, {
		relationName: "sewadarAttendance_markedBy_sewadarCore_id"
	}),
	eventOutreaches: many(eventOutreach),
}));

export const eventPhotosRelations = relations(eventPhotos, ({one}) => ({
	trainingEvent: one(trainingEvents, {
		fields: [eventPhotos.eventId],
		references: [trainingEvents.id]
	}),
}));

export const trainingEventsRelations = relations(trainingEvents, ({many}) => ({
	eventPhotos: many(eventPhotos),
	eventAttendances: many(eventAttendance),
	eventOutreaches: many(eventOutreach),
}));

export const promotionLogsRelations = relations(promotionLogs, ({one}) => ({
	sewadarCore: one(sewadarCore, {
		fields: [promotionLogs.registeredBy],
		references: [sewadarCore.id]
	}),
}));

export const sewadarRosterRelations = relations(sewadarRoster, ({one}) => ({
	sewadarCore: one(sewadarCore, {
		fields: [sewadarRoster.sewadarId],
		references: [sewadarCore.id]
	}),
}));

export const eventAttendanceRelations = relations(eventAttendance, ({one}) => ({
	trainingEvent: one(trainingEvents, {
		fields: [eventAttendance.eventId],
		references: [trainingEvents.id]
	}),
	goldenMember: one(goldenMembers, {
		fields: [eventAttendance.goldenMemberId],
		references: [goldenMembers.id]
	}),
}));

export const sewadarAttendanceRelations = relations(sewadarAttendance, ({one}) => ({
	sewadarCore_sewadarId: one(sewadarCore, {
		fields: [sewadarAttendance.sewadarId],
		references: [sewadarCore.id],
		relationName: "sewadarAttendance_sewadarId_sewadarCore_id"
	}),
	sewadarCore_markedBy: one(sewadarCore, {
		fields: [sewadarAttendance.markedBy],
		references: [sewadarCore.id],
		relationName: "sewadarAttendance_markedBy_sewadarCore_id"
	}),
}));

export const eventOutreachRelations = relations(eventOutreach, ({one}) => ({
	trainingEvent: one(trainingEvents, {
		fields: [eventOutreach.eventId],
		references: [trainingEvents.id]
	}),
	goldenMember: one(goldenMembers, {
		fields: [eventOutreach.memberId],
		references: [goldenMembers.id]
	}),
	sewadarCore: one(sewadarCore, {
		fields: [eventOutreach.updatedBy],
		references: [sewadarCore.id]
	}),
}));