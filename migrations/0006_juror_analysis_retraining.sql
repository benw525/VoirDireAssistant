ALTER TABLE "jurors" ADD COLUMN IF NOT EXISTS "analysis_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN IF NOT EXISTS "information_level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN IF NOT EXISTS "analysis_provisional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN IF NOT EXISTS "key_follow_up" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN IF NOT EXISTS "damages_anchor" text DEFAULT '' NOT NULL;