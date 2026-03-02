import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  cases, jurors, questions, responses,
  type Case, type InsertCase,
  type Juror, type InsertJuror,
  type Question, type InsertQuestion,
  type JurorResponse, type InsertResponse,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const db = drizzle(process.env.DATABASE_URL);

export interface IStorage {
  getCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(data: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string): Promise<void>;

  getJurorsByCase(caseId: string): Promise<Juror[]>;
  createJuror(data: InsertJuror): Promise<Juror>;
  createJurors(data: InsertJuror[]): Promise<Juror[]>;
  updateJuror(id: string, data: Partial<InsertJuror>): Promise<Juror | undefined>;
  deleteJurorsByCase(caseId: string): Promise<void>;

  getQuestionsByCase(caseId: string): Promise<Question[]>;
  createQuestion(data: InsertQuestion): Promise<Question>;
  createQuestions(data: InsertQuestion[]): Promise<Question[]>;
  updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestionsByCase(caseId: string): Promise<void>;

  getResponsesByCase(caseId: string): Promise<JurorResponse[]>;
  createResponse(data: InsertResponse): Promise<JurorResponse>;
  addFollowUpToResponse(responseId: string, followUp: {question: string, answer: string}): Promise<JurorResponse | undefined>;
  deleteResponsesByCase(caseId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getCases(): Promise<Case[]> {
    return db.select().from(cases).orderBy(cases.savedAt);
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [result] = await db.select().from(cases).where(eq(cases.id, id));
    return result;
  }

  async createCase(data: InsertCase): Promise<Case> {
    const [result] = await db.insert(cases).values(data).returning();
    return result;
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const [result] = await db.update(cases).set(data).where(eq(cases.id, id)).returning();
    return result;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  async getJurorsByCase(caseId: string): Promise<Juror[]> {
    return db.select().from(jurors).where(eq(jurors.caseId, caseId)).orderBy(jurors.number);
  }

  async createJuror(data: InsertJuror): Promise<Juror> {
    const [result] = await db.insert(jurors).values(data).returning();
    return result;
  }

  async createJurors(data: InsertJuror[]): Promise<Juror[]> {
    if (data.length === 0) return [];
    return db.insert(jurors).values(data).returning();
  }

  async updateJuror(id: string, data: Partial<InsertJuror>): Promise<Juror | undefined> {
    const [result] = await db.update(jurors).set(data).where(eq(jurors.id, id)).returning();
    return result;
  }

  async deleteJurorsByCase(caseId: string): Promise<void> {
    await db.delete(jurors).where(eq(jurors.caseId, caseId));
  }

  async getQuestionsByCase(caseId: string): Promise<Question[]> {
    return db.select().from(questions).where(eq(questions.caseId, caseId)).orderBy(questions.questionNumber);
  }

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const [result] = await db.insert(questions).values(data).returning();
    return result;
  }

  async createQuestions(data: InsertQuestion[]): Promise<Question[]> {
    if (data.length === 0) return [];
    return db.insert(questions).values(data).returning();
  }

  async updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [result] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return result;
  }

  async deleteQuestionsByCase(caseId: string): Promise<void> {
    await db.delete(questions).where(eq(questions.caseId, caseId));
  }

  async getResponsesByCase(caseId: string): Promise<JurorResponse[]> {
    return db.select().from(responses).where(eq(responses.caseId, caseId)).orderBy(responses.timestamp);
  }

  async createResponse(data: InsertResponse): Promise<JurorResponse> {
    const [result] = await db.insert(responses).values(data).returning();
    return result;
  }

  async addFollowUpToResponse(responseId: string, followUp: {question: string, answer: string}): Promise<JurorResponse | undefined> {
    const [existing] = await db.select().from(responses).where(eq(responses.id, responseId));
    if (!existing) return undefined;
    const currentFollowUps = existing.followUps || [];
    const [result] = await db.update(responses)
      .set({ followUps: [...currentFollowUps, followUp] })
      .where(eq(responses.id, responseId))
      .returning();
    return result;
  }

  async deleteResponsesByCase(caseId: string): Promise<void> {
    await db.delete(responses).where(eq(responses.caseId, caseId));
  }
}

export const storage = new DatabaseStorage();
