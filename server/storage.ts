import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  users, cases, jurors, questions, responses, jurorEnrichments,
  collaborativeSessions, sessionParticipants,
  type User, type InsertUser,
  type Case, type InsertCase,
  type Juror, type InsertJuror,
  type Question, type InsertQuestion,
  type JurorResponse, type InsertResponse,
  type JurorEnrichment, type InsertJurorEnrichment,
  type CollaborativeSession, type InsertCollaborativeSession,
  type SessionParticipant, type InsertSessionParticipant,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const db = drizzle(process.env.DATABASE_URL);

export interface IStorage {
  createUser(data: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  getCasesByUser(userId: string): Promise<Case[]>;
  getCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(data: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string): Promise<void>;

  getJurorsByCase(caseId: string): Promise<Juror[]>;
  getJurorById(id: string): Promise<Juror | undefined>;
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
  getResponseById(id: string): Promise<JurorResponse | undefined>;
  createResponse(data: InsertResponse): Promise<JurorResponse>;
  addFollowUpToResponse(responseId: string, followUp: {question: string, answer: string}): Promise<JurorResponse | undefined>;
  deleteResponsesByCase(caseId: string): Promise<void>;

  createJurorEnrichment(data: InsertJurorEnrichment): Promise<JurorEnrichment>;
  getJurorEnrichmentById(enrichmentId: string): Promise<JurorEnrichment | undefined>;
  getJurorEnrichmentsByCase(caseId: string): Promise<JurorEnrichment[]>;
  updateJurorEnrichment(enrichmentId: string, data: Partial<InsertJurorEnrichment>): Promise<JurorEnrichment | undefined>;
  deleteJurorEnrichmentsByCase(caseId: string): Promise<void>;

  createCollaborativeSession(data: InsertCollaborativeSession): Promise<CollaborativeSession>;
  getCollaborativeSessionById(id: string): Promise<CollaborativeSession | undefined>;
  getCollaborativeSessionByCode(code: string): Promise<CollaborativeSession | undefined>;
  getActiveSessionByCase(caseId: string): Promise<CollaborativeSession | undefined>;
  deactivateSession(id: string): Promise<CollaborativeSession | undefined>;

  createSessionParticipant(data: InsertSessionParticipant): Promise<SessionParticipant>;
  getSessionParticipants(sessionId: string): Promise<SessionParticipant[]>;
  getSessionParticipantCount(sessionId: string): Promise<number>;
  updateParticipantActivity(id: string): Promise<void>;
  removeSessionParticipant(id: string): Promise<void>;
  removeAllSessionParticipants(sessionId: string): Promise<void>;

  getRecentResponseForDuplicate(caseId: string, jurorNumber: number, questionId: number | null, windowMs: number): Promise<JurorResponse | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createUser(data: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(data).returning();
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return result;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async updateUser(id: string, data: Partial<InsertUser> & { casesUsed?: number; casesPurchased?: number; subscriptionTier?: string; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null }): Promise<User | undefined> {
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }

  async getCasesByUser(userId: string): Promise<Case[]> {
    return db.select().from(cases).where(eq(cases.userId, userId)).orderBy(cases.savedAt);
  }

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

  async getJurorById(id: string): Promise<Juror | undefined> {
    const [result] = await db.select().from(jurors).where(eq(jurors.id, id));
    return result;
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

  async getResponseById(id: string): Promise<JurorResponse | undefined> {
    const [result] = await db.select().from(responses).where(eq(responses.id, id));
    return result;
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

  async createJurorEnrichment(data: InsertJurorEnrichment): Promise<JurorEnrichment> {
    const [result] = await db.insert(jurorEnrichments).values(data).returning();
    return result;
  }

  async getJurorEnrichmentById(enrichmentId: string): Promise<JurorEnrichment | undefined> {
    const [result] = await db.select().from(jurorEnrichments).where(eq(jurorEnrichments.enrichmentId, enrichmentId));
    return result;
  }

  async getJurorEnrichmentsByCase(caseId: string): Promise<JurorEnrichment[]> {
    return db.select().from(jurorEnrichments).where(eq(jurorEnrichments.caseId, caseId));
  }

  async updateJurorEnrichment(enrichmentId: string, data: Partial<InsertJurorEnrichment>): Promise<JurorEnrichment | undefined> {
    const [result] = await db.update(jurorEnrichments).set(data).where(eq(jurorEnrichments.enrichmentId, enrichmentId)).returning();
    return result;
  }

  async deleteJurorEnrichmentsByCase(caseId: string): Promise<void> {
    await db.delete(jurorEnrichments).where(eq(jurorEnrichments.caseId, caseId));
  }

  async createCollaborativeSession(data: InsertCollaborativeSession): Promise<CollaborativeSession> {
    const [result] = await db.insert(collaborativeSessions).values(data).returning();
    return result;
  }

  async getCollaborativeSessionById(id: string): Promise<CollaborativeSession | undefined> {
    const [result] = await db.select().from(collaborativeSessions).where(eq(collaborativeSessions.id, id));
    return result;
  }

  async getCollaborativeSessionByCode(code: string): Promise<CollaborativeSession | undefined> {
    const [result] = await db.select().from(collaborativeSessions)
      .where(and(eq(collaborativeSessions.sessionCode, code), eq(collaborativeSessions.isActive, true)));
    return result;
  }

  async getActiveSessionByCase(caseId: string): Promise<CollaborativeSession | undefined> {
    const [result] = await db.select().from(collaborativeSessions)
      .where(and(eq(collaborativeSessions.caseId, caseId), eq(collaborativeSessions.isActive, true)));
    return result;
  }

  async deactivateSession(id: string): Promise<CollaborativeSession | undefined> {
    const [result] = await db.update(collaborativeSessions)
      .set({ isActive: false })
      .where(eq(collaborativeSessions.id, id))
      .returning();
    return result;
  }

  async createSessionParticipant(data: InsertSessionParticipant): Promise<SessionParticipant> {
    const [result] = await db.insert(sessionParticipants).values(data).returning();
    return result;
  }

  async createSessionParticipantAtomic(data: InsertSessionParticipant, maxParticipants: number): Promise<SessionParticipant> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM collaborative_sessions WHERE id = ${data.sessionId} FOR UPDATE`);
      const countResult = await tx.select({ count: sql<number>`count(*)::int` })
        .from(sessionParticipants)
        .where(and(eq(sessionParticipants.sessionId, data.sessionId), eq(sessionParticipants.isActive, true)));
      const currentCount = countResult[0]?.count ?? 0;
      if (currentCount >= maxParticipants) {
        throw new Error(`Session is full (max ${maxParticipants} participants)`);
      }
      const [result] = await tx.insert(sessionParticipants).values(data).returning();
      return result;
    });
  }

  async setParticipantActive(participantId: string, isActive: boolean): Promise<void> {
    await db.update(sessionParticipants)
      .set({ isActive, lastActiveAt: Date.now() })
      .where(eq(sessionParticipants.id, participantId));
  }

  async getActiveSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return db.select().from(sessionParticipants)
      .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.isActive, true)))
      .orderBy(sessionParticipants.joinedAt);
  }

  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return db.select().from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId))
      .orderBy(sessionParticipants.joinedAt);
  }

  async getSessionParticipantCount(sessionId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));
    return result[0]?.count ?? 0;
  }

  async updateParticipantActivity(id: string): Promise<void> {
    await db.update(sessionParticipants)
      .set({ lastActiveAt: Date.now() })
      .where(eq(sessionParticipants.id, id));
  }

  async removeSessionParticipant(id: string): Promise<void> {
    await db.delete(sessionParticipants).where(eq(sessionParticipants.id, id));
  }

  async removeAllSessionParticipants(sessionId: string): Promise<void> {
    await db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
  }

  async getRecentResponseForDuplicate(caseId: string, jurorNumber: number, questionId: number | null, windowMs: number): Promise<JurorResponse | undefined> {
    const cutoff = Date.now() - windowMs;
    const conditions = [
      eq(responses.caseId, caseId),
      eq(responses.jurorNumber, jurorNumber),
      sql`${responses.timestamp} > ${cutoff}`,
    ];
    if (questionId !== null && questionId !== undefined) {
      conditions.push(eq(responses.questionId, questionId));
    }
    const [result] = await db.select().from(responses)
      .where(and(...conditions))
      .orderBy(sql`${responses.timestamp} DESC`)
      .limit(1);
    return result;
  }

  async createCaseWithBilling(data: InsertCase, userId: string): Promise<Case> {
    return db.transaction(async (tx) => {
      await tx.update(users)
        .set({ casesUsed: sql`${users.casesUsed} + 1` })
        .where(eq(users.id, userId));
      const [result] = await tx.insert(cases).values(data).returning();
      return result;
    });
  }
}

export const storage = new DatabaseStorage();
