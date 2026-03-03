ALTER TABLE "sewadar_core" ADD COLUMN "weekly_routine" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "next_sunday_date" date;--> statement-breakpoint
ALTER TABLE "sewadar_core" ADD COLUMN "is_available_on_date" boolean;--> statement-breakpoint
ALTER TABLE "sewadar_data" DROP COLUMN "weekly_routine";