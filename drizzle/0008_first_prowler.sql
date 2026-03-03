CREATE TYPE "public"."call_status_enum" AS ENUM('pending', 'called', 'no_answer', 'interested', 'not_interested');--> statement-breakpoint
CREATE TYPE "public"."outreach_module_enum" AS ENUM('module_1', 'module_2', 'both');--> statement-breakpoint
ALTER TYPE "public"."attendance_status_enum" ADD VALUE 'Potential';--> statement-breakpoint
ALTER TYPE "public"."attendance_status_enum" ADD VALUE 'Confirmed';--> statement-breakpoint
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
ALTER TABLE "golden_members" RENAME COLUMN "full_name" TO "name";--> statement-breakpoint
ALTER TABLE "golden_members" RENAME COLUMN "contact_no" TO "phone";--> statement-breakpoint
ALTER TABLE "golden_members" RENAME COLUMN "city_center" TO "center";--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ALTER COLUMN "sewa_area" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ALTER COLUMN "sewa_area" SET DEFAULT 'Promotion'::text;--> statement-breakpoint
ALTER TABLE "sewadar_core" ALTER COLUMN "sewa_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sewadar_core" ALTER COLUMN "sewa_type" SET DEFAULT 'Promotion'::text;--> statement-breakpoint
DROP TYPE "public"."sewa_type_enum";--> statement-breakpoint
CREATE TYPE "public"."sewa_type_enum" AS ENUM('Trainer', 'Promotion', 'Both');--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ALTER COLUMN "sewa_area" SET DEFAULT 'Promotion'::"public"."sewa_type_enum";--> statement-breakpoint
ALTER TABLE "sewadar_attendance" ALTER COLUMN "sewa_area" SET DATA TYPE "public"."sewa_type_enum" USING "sewa_area"::"public"."sewa_type_enum";--> statement-breakpoint
ALTER TABLE "sewadar_core" ALTER COLUMN "sewa_type" SET DEFAULT 'Promotion'::"public"."sewa_type_enum";--> statement-breakpoint
ALTER TABLE "sewadar_core" ALTER COLUMN "sewa_type" SET DATA TYPE "public"."sewa_type_enum" USING "sewa_type"::"public"."sewa_type_enum";--> statement-breakpoint
ALTER TABLE "golden_members" ALTER COLUMN "innergy_email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "golden_members" ALTER COLUMN "preferred_language" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "golden_members" ALTER COLUMN "preferred_language" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "golden_members" ADD COLUMN "gender" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "golden_members" ADD COLUMN "address" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "qualification" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "qualification_other" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "profession" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "profession_other" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_event_id_training_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."training_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_member_id_golden_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."golden_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outreach" ADD CONSTRAINT "event_outreach_updated_by_sewadar_core_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sewadar_core"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "golden_members" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "golden_members" ADD CONSTRAINT "golden_members_phone_unique" UNIQUE("phone");--> statement-breakpoint
ALTER TABLE "golden_members" ADD CONSTRAINT "golden_members_innergy_email_unique" UNIQUE("innergy_email");