import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  isOCQ: boolean("is_ocq").notNull().default(false),
  ocqSummary: text("ocq_summary"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({ id: true });
export const insertJurorSchema = createInsertSchema(jurors).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true });

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Juror = typeof jurors.$inferSelect;
export type InsertJuror = z.infer<typeof insertJurorSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type JurorResponse = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
