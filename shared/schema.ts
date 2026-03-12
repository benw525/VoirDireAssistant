import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, bigint, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  mattrmindrUrl: text("mattrmindr_url"),
  mattrmindrToken: text("mattrmindr_token"),
  mattrmindrEmail: text("mattrmindr_email"),
  mattrmindrPassword: text("mattrmindr_password"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  casesUsed: integer("cases_used").notNull().default(0),
  casesPurchased: integer("cases_purchased").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  areaOfLaw: text("area_of_law").notNull(),
  summary: text("summary").notNull(),
  side: text("side").notNull(),
  favorableTraits: jsonb("favorable_traits").$type<string[]>().notNull().default([]),
  riskTraits: jsonb("risk_traits").$type<string[]>().notNull().default([]),
  lastPhase: integer("last_phase").notNull().default(1),
  completedPhases: jsonb("completed_phases").$type<number[]>().notNull().default([]),
  questionsLocked: boolean("questions_locked").notNull().default(false),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  mattrmindrCaseId: text("mattrmindr_case_id"),
  strikesForCause: jsonb("strikes_for_cause").$type<Array<{ jurorNumber: number; category: string; basis: string; reasoning: string; argument: string }>>().notNull().default([]),
  batsonAnalysis: jsonb("batson_analysis").$type<{
    overallRisk: string;
    summary: string;
    defensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; riskLevel: string; statisticalFlag: string; comparativeConcern: string; currentJustification: string; recommendedArticulation: string; warning?: string }>;
    offensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; strengthOfChallenge: string; statisticalPattern: string; comparativeEvidence: string; suggestedArgument: string }>;
  } | null>().default(null),
  savedAt: bigint("saved_at", { mode: "number" }).notNull(),
});

export const jurors = pgTable("jurors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  cityStateZip: text("city_state_zip").notNull().default(""),
  sex: text("sex").notNull().default("U"),
  race: text("race").notNull().default("U"),
  birthDate: text("birth_date").notNull().default(""),
  occupation: text("occupation").notNull().default(""),
  employer: text("employer").notNull().default(""),
  lean: text("lean").notNull().default("unknown"),
  riskTier: text("risk_tier").notNull().default("unassessed"),
  notes: text("notes").notNull().default(""),
  aiSummary: text("ai_summary").notNull().default(""),
  aiAnalysis: text("ai_analysis").notNull().default(""),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  originalText: text("original_text").notNull(),
  rephrase: text("rephrase").notNull().default(""),
  followUps: jsonb("follow_ups").$type<string[]>().notNull().default([]),
  locked: boolean("locked").notNull().default(false),
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  jurorNumber: integer("juror_number").notNull(),
  questionId: integer("question_id"),
  responseText: text("response_text").notNull(),
  side: text("side").notNull().default("yours"),
  questionSummary: text("question_summary"),
  followUps: jsonb("follow_ups").$type<Array<{question: string, answer: string}>>().notNull().default([]),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true });
export const insertJurorSchema = createInsertSchema(jurors).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Juror = typeof jurors.$inferSelect;
export type InsertJuror = z.infer<typeof insertJurorSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type JurorResponse = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
