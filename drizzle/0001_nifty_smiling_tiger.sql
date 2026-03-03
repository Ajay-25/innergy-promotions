ALTER TABLE "sewadar_core" ALTER COLUMN "system_role" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "is_field_volunteer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "address" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "profile_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sewadar_data" ADD COLUMN "address" text DEFAULT '';