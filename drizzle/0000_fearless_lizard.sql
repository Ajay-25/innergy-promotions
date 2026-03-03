-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."app_status_enum" AS ENUM('Already Installed', 'New Installation');--> statement-breakpoint
CREATE TYPE "public"."attendance_status_enum" AS ENUM('Present', 'Absent', 'Potential', 'Confirmed');--> statement-breakpoint
CREATE TYPE "public"."availability_status_enum" AS ENUM('Available', 'Unavailable', 'Tentative');--> statement-breakpoint
CREATE TYPE "public"."call_status_enum" AS ENUM('pending', 'called', 'no_answer', 'interested', 'not_interested');--> statement-breakpoint
CREATE TYPE "public"."module_type_enum" AS ENUM('Module 1', 'Module 2', 'Both');--> statement-breakpoint
CREATE TYPE "public"."outreach_module_enum" AS ENUM('module_1', 'module_2', 'both');--> statement-breakpoint
CREATE TYPE "public"."sewa_type_enum" AS ENUM('Trainer', 'Promotion', 'Both');--> statement-breakpoint
CREATE TABLE "training_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"module_type" "module_type_enum" DEFAULT 'Module 1' NOT NULL,
	"event_date" date NOT NULL,
	"timing" text DEFAULT '',
	"venue" text DEFAULT '',
	"trainer_ids" uuid[] DEFAULT '{""}',
	"support_sewadar_ids" uuid[] DEFAULT '{""}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registered_by" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"center" text DEFAULT '',
	"zone" text DEFAULT '',
	"dob" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gender" text DEFAULT '',
	"address" text DEFAULT '',
	"innergy_email" text,
	"preferred_language" text DEFAULT '',
	"remarks" text DEFAULT '',
	CONSTRAINT "golden_members_phone_unique" UNIQUE("phone"),
	CONSTRAINT "golden_members_innergy_email_unique" UNIQUE("innergy_email")
);
--> statement-breakpoint
CREATE TABLE "event_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"photo_url" text DEFAULT '' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sewadar_core" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"clerk_id" text,
	"permissions" text[] DEFAULT '{""}' NOT NULL,
	"system_role" text DEFAULT 'pending' NOT NULL,
	"phone" text DEFAULT '',
	"gender" text DEFAULT '',
	"dob" date,
	"zone" text DEFAULT '',
	"center" text DEFAULT '',
	"name" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '',
	"is_field_volunteer" boolean DEFAULT true NOT NULL,
	"profile_completed" boolean DEFAULT false NOT NULL,
	"weekly_routine" text[] DEFAULT '{""}' NOT NULL,
	"next_sunday_date" date,
	"is_available_on_date" boolean,
	"sewa_type" text DEFAULT 'Promotion' NOT NULL,
	"qualification" text DEFAULT '',
	"qualification_other" text DEFAULT '',
	"profession" text DEFAULT '',
	"profession_other" text DEFAULT '',
	CONSTRAINT "sewadar_core_email_unique" UNIQUE("email"),
	CONSTRAINT "sewadar_core_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "promotion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registered_by" uuid,
	"interaction_type" text DEFAULT 'Standard',
	"citizen_name" text DEFAULT '',
	"contact_number" text DEFAULT '',
	"email_used" text DEFAULT '',
	"app_status" "app_status_enum",
	"tech_issue_notes" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sewadar_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sewadar_id" uuid NOT NULL,
	"planned_date" date NOT NULL,
	"event_remarks" text DEFAULT '',
	"availability_status" "availability_status_enum" DEFAULT 'Available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_available_on_date" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"golden_member_id" uuid NOT NULL,
	"module_attended" "module_type_enum",
	"status" "attendance_status_enum" DEFAULT 'Absent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sewadar_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sewadar_id" uuid NOT NULL,
	"date" date NOT NULL,
	"time_of_sewa" time NOT NULL,
	"sewa_area" "sewa_type_enum" DEFAULT 'Promotion' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"marked_by" uuid
);
--> statement-breakpoint
CREATE TABLE "event_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"call_status" "call_status_enum" DEFAULT 'pending' NOT NULL,
	"training_module" "outreach_module_enum",
	"notes" text DEFAULT '',
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_outreach_event_member_unique" UNIQUE("event_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "golden_members" ADD CONSTRAINT "golden_members_registered_by_sewadar_core_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."sewadar_core"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_event_id_training_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."training_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_logs" ADD CONSTRAINT "promotion_logs_registered_by_sewadar_core_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."sewadar_core"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sewadar_roster" ADD CONSTRAINT "sewadar_roster_sewadar_id_sewadar_core_id_fk" FOREIGN KEY ("sewadar_id") REFERENCES "public"."sewadar_core"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_event_id_training_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."training_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_golden_member_id_golden_members_id_fk" FOREIGN KEY ("golden_member_id") REFERENCES "public"."golden_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ADD CONSTRAINT "sewadar_attendance_sewadar_id_sewadar_core_id_fk" FOREIGN KEY ("sewadar_id") REFERENCES "public"."sewadar_core"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ADD CONSTRAINT "sewadar_attendance_marked_by_sewadar_core_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."sewadar_core"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_event_id_training_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."training_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_member_id_golden_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."golden_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_updated_by_sewadar_core_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sewadar_core"("id") ON DELETE set null ON UPDATE no action;
*/