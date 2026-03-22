CREATE TABLE "collaborative_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"session_code" text NOT NULL,
	"created_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_participants" integer DEFAULT 10 NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "collaborative_sessions_session_code_unique" UNIQUE("session_code")
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"display_name" text NOT NULL,
	"joined_at" bigint NOT NULL,
	"last_active_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "demographics_changed_at" bigint;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "batson_analyzed_at" bigint;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "cause_analyzed_at" bigint;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN "lean_confidence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN "ai_risk_tier" text DEFAULT 'unassessed' NOT NULL;--> statement-breakpoint
ALTER TABLE "jurors" ADD COLUMN "risk_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "recorded_by" text;--> statement-breakpoint
ALTER TABLE "collaborative_sessions" ADD CONSTRAINT "collaborative_sessions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborative_sessions" ADD CONSTRAINT "collaborative_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_collaborative_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."collaborative_sessions"("id") ON DELETE cascade ON UPDATE no action;