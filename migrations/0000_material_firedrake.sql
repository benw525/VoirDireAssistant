CREATE TABLE "cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"area_of_law" text NOT NULL,
	"summary" text NOT NULL,
	"side" text NOT NULL,
	"favorable_traits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_traits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_phase" integer DEFAULT 1 NOT NULL,
	"completed_phases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions_locked" boolean DEFAULT false NOT NULL,
	"user_id" varchar,
	"mattrmindr_case_id" text,
	"strikes_for_cause" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"batson_analysis" jsonb DEFAULT 'null'::jsonb,
	"saved_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "juror_enrichments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"juror_number" integer NOT NULL,
	"juror_id" varchar DEFAULT '' NOT NULL,
	"enrichment_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_request" jsonb,
	"raw_response" jsonb,
	"enriched_data" jsonb,
	"created_at" bigint NOT NULL,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "jurors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city_state_zip" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT 'Unknown' NOT NULL,
	"sex" text DEFAULT 'U' NOT NULL,
	"race" text DEFAULT 'U' NOT NULL,
	"birth_date" text DEFAULT '' NOT NULL,
	"occupation" text DEFAULT '' NOT NULL,
	"employer" text DEFAULT '' NOT NULL,
	"lean" text DEFAULT 'unknown' NOT NULL,
	"risk_tier" text DEFAULT 'unassessed' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"ai_summary" text DEFAULT '' NOT NULL,
	"ai_analysis" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"question_number" integer NOT NULL,
	"original_text" text NOT NULL,
	"rephrase" text DEFAULT '' NOT NULL,
	"follow_ups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"juror_number" integer NOT NULL,
	"question_id" integer,
	"response_text" text NOT NULL,
	"side" text DEFAULT 'yours' NOT NULL,
	"question_summary" text,
	"follow_ups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"mattrmindr_url" text,
	"mattrmindr_token" text,
	"mattrmindr_email" text,
	"mattrmindr_password" text,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"cases_used" integer DEFAULT 0 NOT NULL,
	"cases_purchased" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "juror_enrichments" ADD CONSTRAINT "juror_enrichments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurors" ADD CONSTRAINT "jurors_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;