import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertJurorSchema, insertQuestionSchema, insertResponseSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { extractTextFromPdf, parseStrikeListWithAI, parseStrikeListFromImage, parseStrikeListFromPdf, isAllowedFileType, isImageFile, isPdfFile } from "./parseStrikeList";
import { generateFullVoirDire, refineUserQuestions } from "./generateVoirDire";
import { analyzeJuror, generateBriefSummary, analyzeStrikesForCause, analyzeBatson } from "./analyzeJuror";
import { authMiddleware, hashPassword, comparePassword, createToken } from "./auth";
import { collabAuthMiddleware, createCollabToken, generateSessionCode } from "./collabAuth";
import { broadcastToSession, disconnectAllInSession, getConnectedParticipants } from "./collabWebSocket";
import { loginToMattrMindr, verifyMattrMindrToken, fetchMattrMindrCases, fetchMattrMindrCase, pushJuryAnalysis } from "./mattrmindr";
import { registerChatRoutes } from "./replit_integrations/chat";
import { canCreateCase, getUserBillingInfo, createCheckoutSession, createPortalSession, handleWebhook } from "./billing";
import { triggerEnrichmentForJurors, getEnrichedDataForCase, cancelEnrichmentForCase, applyMatchDecision, type EnrichedDataV2 } from "./perplexityEnrichment";
import { schedulePrewarmAnalysis, triggerStageCloseAnalyses } from "./analysisScheduler";
import { computeAnalysisInputHash } from "./analysisInputs";
import { getDocketCapability } from "./alacourtDocket";
import { getAnalysisTraits } from "./strategyModules";
import { claudeJson, CLAUDE_SONNET, respondWithAnthropicError } from "./anthropic";
import { computeCaseFlags, classifyResponseTopics, detectConcededOrWeakLiability } from "./jurorFlags";
import { computePanelMetrics } from "./panelMetrics";
import { generatePanelPrognosis } from "./panelPrognosis";
import { DAMAGES_LOCK_IN_QUESTIONS } from "./voirDireContract";

/**
 * When a new response or follow-up answer is recorded for a juror whose
 * analysis previously succeeded, mark that analysis 'stale' so every consumer
 * (juror cards, strike order, final report) knows it predates the new data.
 */
async function markJurorAnalysisStale(caseId: string, jurorNumber: number): Promise<void> {
  try {
    const jurorsForCase = await storage.getJurorsByCase(caseId);
    const juror = jurorsForCase.find(j => j.number === jurorNumber);
    if (juror && juror.analysisStatus === 'ok') {
      await storage.updateJuror(juror.id, { analysisStatus: 'stale' });
    }
  } catch (err) {
    console.error(`[AnalysisStatus] Failed to mark juror #${jurorNumber} analysis stale:`, err);
  }
}

/**
 * Canonical four-question valence set (Lewis/Whigham Section 5, verbatim).
 * For accident/claim raises these are ALWAYS included — appended
 * deterministically, never left to model compliance.
 */
const VALENCE_SET = [
  "Were you the driver who was struck, or the one who struck?",
  "Were you hurt — did you treat, and how soon?",
  "Did you or anyone make a claim or hire a lawyer?",
  "Were you satisfied with how it was handled?",
];

/**
 * Lawful commitment-style set for conceded/weak-liability cases.
 * Single-sourced from the voir dire contract's canonical damages lock-ins
 * (first two entries; the third is the treating-records question used only
 * in the generated voir dire document).
 */
const COMMITMENT_SET = DAMAGES_LOCK_IN_QUESTIONS.slice(0, 2);

async function generateFollowUpSuggestionsViaClaude(opts: {
  areaOfLaw: string;
  side: string;
  caseSummary: string;
  jurorNumber: number;
  jurorName: string;
  questionText: string;
  responseText: string;
}): Promise<string[]> {
  const { areaOfLaw, side, caseSummary, jurorNumber, jurorName, questionText, responseText } = opts;
  const concededOrWeak = detectConcededOrWeakLiability(caseSummary);
  const system = `You are a trial attorney assistant. Based on a juror's response during voir dire, suggest 2-3 brief follow-up questions that would help assess this juror further. The case is a ${areaOfLaw} case where you represent the ${side}. Keep each question to one sentence. Return ONLY a JSON array of strings, no other text.

For accident/claim raises, always include the four-question valence set:
(1) Were you the driver who was struck, or the one who struck?
(2) Were you hurt — did you treat, and how soon?
(3) Did you or anyone make a claim or hire a lawyer?
(4) Were you satisfied with how it was handled?

When liability is conceded or weak, include commitment-style follow-ups within
legal bounds: whether the juror can return a verdict for the defendant if
causation fails; whether they can award only the medical bills they find were
caused by the collision. Flag for counsel which jurors gave NO damages-posture
answer.

LIABILITY POSTURE for this case: ${concededOrWeak ? "conceded/weak — apply the commitment-style set" : "disputed — the commitment-style set does not apply"}.`;
  const userPrompt = `Juror #${jurorNumber} (${jurorName}) was asked: "${questionText}"\n\nTheir response: "${responseText}"\n\nSuggest 2-3 targeted follow-up questions.`;

  // Deterministic guarantee (Lewis/Whigham Section 5): accident/claim raises
  // ALWAYS carry the four-question valence set, and conceded/weak-liability
  // cases append the commitment set. These are doc-mandated questions computed
  // WITHOUT the model, so a model failure cannot erase them — model output is
  // optional enrichment only, never the carrier of the guarantee.
  const topics = classifyResponseTopics(questionText, responseText);
  const isAccidentOrClaim = topics.includes("accident-history") || topics.includes("injury-claim");
  const commitmentApplies =
    concededOrWeak &&
    (isAccidentOrClaim || topics.includes("medical-treatment") || topics.includes("disability-filing"));
  const canonical = [
    ...(isAccidentOrClaim ? VALENCE_SET : []),
    ...(commitmentApplies ? COMMITMENT_SET : []),
  ];

  type FollowUpJson = string[] | { questions?: unknown; followUps?: unknown; suggestions?: unknown };

  let modelSuggestions: string[] = [];
  try {
    const { parsed } = await claudeJson<FollowUpJson>({
      model: CLAUDE_SONNET,
      system,
      userPrompt,
      temperature: 0.6,
      maxTokens: 600,
    });

    const onlyStrings = (xs: unknown): string[] =>
      Array.isArray(xs) ? xs.filter((s): s is string => typeof s === 'string') : [];

    modelSuggestions = Array.isArray(parsed)
      ? onlyStrings(parsed)
      : parsed && typeof parsed === 'object'
        ? onlyStrings(parsed.questions ?? parsed.followUps ?? parsed.suggestions ?? [])
        : [];
  } catch (err) {
    // No canonical set applies → nothing deterministic to offer; fail loud
    // rather than fabricate suggestions.
    if (canonical.length === 0) throw err;
    console.error(
      `Follow-up model call failed for Juror #${jurorNumber}; returning the canonical Lewis/Whigham set without model extras:`,
      err,
    );
    return canonical;
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const canonicalNorms = new Set(canonical.map(normalize));
  const extras = modelSuggestions.filter((s) => !canonicalNorms.has(normalize(s)));
  const maxExtras = canonicalNorms.size > 0 ? 2 : 6;
  return [
    ...(isAccidentOrClaim ? VALENCE_SET : []),
    ...extras.slice(0, maxExtras),
    ...(commitmentApplies ? COMMITMENT_SET : []),
  ];
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

function parseCSVFull(text: string): string[][] {
  const stripped = text.replace(/^\ufeff/, "");
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inQuotes) {
      if (ch === '"' && stripped[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = "";
      } else if (ch === '\r' && stripped[i + 1] === '\n') {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\n') {
        row.push(current);
        current = "";
        rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Auth (public) ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });

      const existing = await storage.getUserByEmail(parsed.data.email.toLowerCase());
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const passwordHash = await hashPassword(parsed.data.password);
      const user = await storage.createUser({
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        name: parsed.data.name,
        createdAt: Date.now(),
      });

      const token = createToken(user.id, user.email);
      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid email or password" });

      const user = await storage.getUserByEmail(parsed.data.email.toLowerCase());
      if (!user) return res.status(401).json({ message: "Invalid email or password" });

      const valid = await comparePassword(parsed.data.password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      const token = createToken(user.id, user.email);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const user = await storage.getUserById(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      hasMattrMindr: !!(user.mattrmindrUrl && user.mattrmindrToken),
    });
  });

  // --- Change Password ---
  app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const parsed = z.object({
        name: z.string().min(1).max(100),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Name is required" });

      const updated = await storage.updateUser(req.user!.id, { name: parsed.data.name });
      if (!updated) return res.status(404).json({ message: "User not found" });

      res.json({ user: { id: updated.id, email: updated.email, name: updated.name } });
    } catch (err: any) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/change-email", authMiddleware, async (req, res) => {
    try {
      const parsed = z.object({
        newEmail: z.string().email(),
        password: z.string().min(1),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "A valid email and your password are required" });

      const user = await storage.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const valid = await comparePassword(parsed.data.password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Password is incorrect" });

      const newEmail = parsed.data.newEmail.toLowerCase();
      if (newEmail === user.email) {
        return res.json({ user: { id: user.id, email: user.email, name: user.name } });
      }

      const existing = await storage.getUserByEmail(newEmail);
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const updated = await storage.updateUser(req.user!.id, { email: newEmail });
      if (!updated) return res.status(404).json({ message: "User not found" });

      const token = createToken(updated.id, updated.email);
      res.json({ token, user: { id: updated.id, email: updated.email, name: updated.name } });
    } catch (err: any) {
      console.error("Change email error:", err);
      res.status(500).json({ message: "Failed to change email" });
    }
  });

  app.patch("/api/auth/change-password", authMiddleware, async (req, res) => {
    try {
      const parsed = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "New password must be at least 6 characters" });

      const user = await storage.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

      const newHash = await hashPassword(parsed.data.newPassword);
      await storage.updateUser(req.user!.id, { passwordHash: newHash });

      res.json({ message: "Password changed successfully" });
    } catch (err: any) {
      console.error("Change password error:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // --- Billing (protected) ---
  app.get("/api/billing/status", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(getUserBillingInfo(user));
    } catch (err: any) {
      console.error("Billing status error:", err);
      res.status(500).json({ message: "Failed to get billing status" });
    }
  });

  app.post("/api/billing/checkout", authMiddleware, async (req, res) => {
    try {
      const parsed = z.object({
        plan: z.enum(["monthly", "per_case"]),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid plan" });

      const user = await storage.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const session = await createCheckoutSession(user, parsed.data.plan);
      res.json(session);
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/billing/portal", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const session = await createPortalSession(user);
      res.json(session);
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.post("/api/billing/webhook", async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody as Buffer;

      if (!rawBody) {
        return res.status(400).json({ message: "Missing raw body" });
      }

      await handleWebhook(rawBody, signature || "");
      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err);
      res.status(400).json({ message: err.message || "Webhook processing failed" });
    }
  });

  app.get("/api/cases/:caseId/enrichment-status", authMiddleware, async (req, res) => {
    try {
      const caseId = String(req.params.caseId);
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord || caseRecord.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }
      const enrichments = await storage.getJurorEnrichmentsByCase(caseId);
      const jurorsList = await storage.getJurorsByCase(caseId);
      const jurorNamesById: Record<string, string> = {};
      const jurorNamesByNumber: Record<number, string> = {};
      for (const j of jurorsList) {
        jurorNamesById[j.id] = j.name;
        jurorNamesByNumber[j.number] = j.name;
      }
      const allItems = enrichments.map(e => {
        const ed: any = e.enrichedData || {};
        const matches = Array.isArray(ed.candidateMatches)
          ? ed.candidateMatches.map((m: any) => ({
              id: m.id,
              category: m.category,
              name: m.name,
              confidence: m.confidence,
              discriminator: m.discriminator,
              evidence: m.evidence,
              sourceUrl: m.sourceUrl ?? null,
              decision: m.decision ?? null,
            }))
          : [];
        const leads = {
          confirmed: matches.filter((m: any) => m.decision === "confirmed" || (m.confidence === "confirmed" && m.decision !== "rejected")).length,
          pendingReview: matches.filter((m: any) => !m.decision && m.confidence !== "confirmed").length,
        };
        return {
          jurorNumber: e.jurorNumber,
          jurorName: (e.jurorId && jurorNamesById[e.jurorId]) || jurorNamesByNumber[e.jurorNumber] || `Juror #${e.jurorNumber}`,
          status: e.status,
          enrichmentId: e.enrichmentId,
          createdAt: e.createdAt,
          completedAt: e.completedAt,
          hasData: !!(e.enrichedData && (e.enrichedData as any).text),
          matches,
          leads,
        };
      });
      const statusPriority: Record<string, number> = { completed: 0, dispatched: 1, pending: 2, failed: 3, error: 4, cancelled: 5 };
      allItems.sort((a, b) => (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99));
      const seenNames = new Set<string>();
      const items = allItems.filter(item => {
        const key = item.jurorName.trim().toUpperCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });
      const docket = getDocketCapability();
      const summary = {
        total: items.length,
        pending: items.filter(i => i.status === "pending").length,
        dispatched: items.filter(i => i.status === "dispatched").length,
        completed: items.filter(i => i.status === "completed").length,
        failed: items.filter(i => i.status === "failed").length,
        error: items.filter(i => i.status === "error").length,
        pendingReview: items.reduce((acc, i) => acc + (i.leads?.pendingReview || 0), 0),
        docketAvailable: docket.available,
        docketNote: docket.available ? null : docket.note,
      };
      res.json({ items, summary });
    } catch (err: any) {
      console.error("[EnrichmentStatus] Error:", err);
      res.status(500).json({ message: "Failed to fetch enrichment status" });
    }
  });

  app.get("/api/cases/:caseId/enrichment-data", authMiddleware, async (req, res) => {
    try {
      const caseId = String(req.params.caseId);
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord || caseRecord.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }
      const enrichedMap = await getEnrichedDataForCase(caseId);
      res.json({ enrichments: enrichedMap });
    } catch (err: any) {
      console.error("[EnrichmentData] Error:", err);
      res.status(500).json({ message: "Failed to fetch enrichment data" });
    }
  });

  // Attorney one-tap confirm/reject of a candidate match. Confirming promotes
  // the lead into the analysis-facing text; rejecting removes it everywhere.
  app.post("/api/cases/:caseId/enrichments/:enrichmentId/match-decision", authMiddleware, async (req, res) => {
    try {
      const caseId = String(req.params.caseId);
      const enrichmentId = String(req.params.enrichmentId);
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord || caseRecord.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }
      const parsed = z.object({
        matchId: z.string().min(1),
        decision: z.enum(["confirmed", "rejected", "clear"]),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid decision payload" });

      const enrichment = await storage.getJurorEnrichmentById(enrichmentId);
      if (!enrichment || enrichment.caseId !== caseId) {
        return res.status(404).json({ message: "Enrichment not found" });
      }
      const data = enrichment.enrichedData as EnrichedDataV2 | null;
      if (!data || !Array.isArray(data.candidateMatches)) {
        return res.status(409).json({ message: "This enrichment has no reviewable candidate matches" });
      }
      const updated = applyMatchDecision(data, parsed.data.matchId, parsed.data.decision);
      if (!updated) return res.status(404).json({ message: "Candidate match not found" });

      await storage.updateJurorEnrichment(enrichmentId, { enrichedData: updated as unknown as Record<string, any> });
      res.json({ candidateMatches: updated.candidateMatches, text: updated.text });
    } catch (err: any) {
      console.error("[Enrichment] Match decision error:", err);
      res.status(500).json({ message: "Failed to record match decision" });
    }
  });

  app.post("/api/cases/:caseId/stop-enrichment", authMiddleware, async (req, res) => {
    try {
      const caseId = String(req.params.caseId);
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord || caseRecord.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }
      cancelEnrichmentForCase(caseId);
      const enrichments = await storage.getJurorEnrichmentsByCase(caseId);
      let cancelled = 0;
      for (const e of enrichments) {
        if (e.status === "pending" || e.status === "dispatched") {
          await storage.updateJurorEnrichment(e.enrichmentId, {
            status: "cancelled",
            completedAt: Date.now(),
          });
          cancelled++;
        }
      }
      console.log(`[Enrichment] Stopped enrichment for case ${caseId}: ${cancelled} items cancelled`);
      res.json({ success: true, cancelled });
    } catch (err: any) {
      console.error("[Enrichment] Stop error:", err);
      res.status(500).json({ message: "Failed to stop enrichment" });
    }
  });

  app.use("/api/cases", authMiddleware);
  app.use("/api/jurors", authMiddleware);
  app.use("/api/questions", authMiddleware);
  app.use("/api/responses", authMiddleware);
  app.use("/api/parse-strike-list", authMiddleware);
  app.use("/api/transcribe", authMiddleware);
  app.use("/api/generate-voir-dire", authMiddleware);
  app.use("/api/parse-questions-document", authMiddleware);
  app.use("/api/refine-questions", authMiddleware);
  app.use("/api/suggest-followups", authMiddleware);
  app.use("/api/analyze-juror", authMiddleware);
  app.use("/api/analyze-jurors-batch", authMiddleware);
  app.use("/api/analyze-strikes-for-cause", authMiddleware);
  app.use("/api/analyze-batson", authMiddleware);
  app.use("/api/mattrmindr", authMiddleware);
  app.use("/api/conversations", authMiddleware);

  app.get("/api/analysis-traits", authMiddleware, async (req, res) => {
    const areaOfLaw = req.query.areaOfLaw as string;
    const side = req.query.side as string;
    if (!areaOfLaw || !side || (side !== 'plaintiff' && side !== 'defense')) {
      return res.status(400).json({ message: "areaOfLaw and side (plaintiff|defense) are required" });
    }
    const traits = getAnalysisTraits(areaOfLaw, side);
    res.json(traits);
  });

  // --- Cases ---
  app.get("/api/cases", async (req, res) => {
    const cases = await storage.getCasesByUser(req.user!.id);
    res.json(cases);
  });

  app.get("/api/cases/:id", async (req, res) => {
    const c = await storage.getCase(req.params.id);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  });

  app.post("/api/cases", async (req, res) => {
    const user = await storage.getUserById(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const billingCheck = canCreateCase(user);
    if (!billingCheck.allowed) {
      return res.status(403).json({ message: billingCheck.reason || "Case limit reached", code: "CASE_LIMIT_REACHED" });
    }

    const parsed = insertCaseSchema.safeParse({ ...req.body, userId: req.user!.id });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const c = await storage.createCaseWithBilling(parsed.data, req.user!.id);
    res.status(201).json(c);
  });

  app.patch("/api/cases/:id", async (req, res) => {
    const existing = await storage.getCase(req.params.id);
    if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ message: "Case not found" });
    // panelPrognosis is server-written only (atomic merge in storage) — never
    // let a client payload overwrite it.
    const { panelPrognosis: _ignoredPanelPrognosis, ...patch } = (req.body ?? {}) as Record<string, unknown>;
    const c = await storage.updateCase(req.params.id, patch);

    if (req.body.lastPhase !== undefined && req.body.lastPhase !== existing.lastPhase) {
      const activeSession = await storage.getActiveSessionByCase(req.params.id);
      if (activeSession) {
        broadcastToSession(activeSession.id, {
          type: "phase:changed",
          data: { previousPhase: existing.lastPhase, currentPhase: req.body.lastPhase },
        });
      }
    }

    res.json(c);
  });

  app.delete("/api/cases/:id", async (req, res) => {
    const existing = await storage.getCase(req.params.id);
    if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ message: "Case not found" });
    await storage.deleteCase(req.params.id);
    res.status(204).send();
  });

  async function verifyCaseOwnership(req: any, res: any): Promise<boolean> {
    const caseId = req.params.caseId || req.params.id;
    if (!caseId) return false;
    const c = await storage.getCase(caseId);
    if (!c || c.userId !== req.user!.id) {
      res.status(404).json({ message: "Case not found" });
      return false;
    }
    return true;
  }

  // --- Jurors ---
  app.get("/api/cases/:caseId/jurors", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const jurors = await storage.getJurorsByCase(req.params.caseId);
    res.json(jurors);
  });

  // Cache-validity fields are server-owned everywhere, including creation:
  // a client may create jurors carrying legacy AI display values (the case
  // save flow does), but a created row must NEVER be born cache-valid — the
  // cached analysis path requires analysisStatus 'ok' + a hash the server
  // itself computed and persisted.
  const stripServerOwnedJurorFields = <T extends Record<string, any>>(
    j: T,
  ): Omit<T, "analysisStatus" | "analysisInputHash" | "id"> => {
    const { analysisStatus: _s, analysisInputHash: _h, id: _id, ...rest } = j;
    return rest;
  };

  app.post("/api/cases/:caseId/jurors", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const caseId = req.params.caseId;
    const body = req.body;

    if (Array.isArray(body)) {
      // Cast: bulk legacy saves are intentionally schema-free (any[]); the
      // strip helper narrows the spread type and TS drops the index
      // signature, so restore the pre-existing untyped semantics.
      const items = body.map((j: any) => ({ ...stripServerOwnedJurorFields(j), caseId })) as Parameters<typeof storage.createJurors>[0];
      const savedJurors = await storage.createJurors(items);
      res.status(201).json(savedJurors);

      const jurorData = savedJurors.map(j => ({
        id: j.id,
        number: j.number,
        name: j.name,
        phone: j.phone,
        sex: j.sex,
        race: j.race,
        birthDate: j.birthDate,
        occupation: j.occupation,
        employer: j.employer,
        address: j.address,
        cityStateZip: j.cityStateZip,
      }));
      triggerEnrichmentForJurors(caseId, jurorData).catch(err =>
        console.error("[PerplexityEnrichment] Background enrichment failed:", err.message)
      );
    } else {
      const data = { ...stripServerOwnedJurorFields(body), caseId };
      const parsed = insertJurorSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const juror = await storage.createJuror(parsed.data);
      res.status(201).json(juror);

      triggerEnrichmentForJurors(caseId, [{
        id: juror.id,
        number: juror.number,
        name: juror.name,
        phone: juror.phone,
        sex: juror.sex,
        race: juror.race,
        birthDate: juror.birthDate,
        occupation: juror.occupation,
        employer: juror.employer,
        address: juror.address,
        cityStateZip: juror.cityStateZip,
      }]).catch(err =>
        console.error("[PerplexityEnrichment] Background enrichment failed:", err.message)
      );
    }
  });

  // AI result fields a client may echo back (the legacy "save analysis
  // results" flow) but must never be able to FORGE as cache-verified.
  const AI_RESULT_FIELDS = [
    "aiAnalysis", "riskScore", "aiRiskTier", "informationLevel",
    "analysisProvisional", "keyFollowUp", "damagesAnchor",
    "aiSuggestedLean", "aiLeanConfidence",
  ] as const;
  // Juror fields that feed the analysis prompt/hash — editing any of them
  // makes the stored analysis stale.
  const ANALYSIS_INPUT_FIELDS = [
    "name", "sex", "race", "birthDate", "occupation", "employer",
    "lean", "riskTier", "notes",
  ] as const;

  app.patch("/api/jurors/:id", async (req, res) => {
    const existing = await storage.getJurorById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Juror not found" });
    const c = await storage.getCase(existing.caseId);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Juror not found" });

    // Cache-integrity fields are server-owned: strip them (and identity
    // fields) from client input unconditionally. If the client writes AI
    // result values that DIFFER from what the server stored, the row is
    // downgraded to 'stale' with no hash — the values still display (legacy
    // behavior) but the cache path can never serve them as verified.
    // Identical echo-backs keep the cache warm.
    const updates: Record<string, any> = { ...req.body };
    delete updates.analysisStatus;
    delete updates.analysisInputHash;
    delete updates.id;
    delete updates.caseId;
    const divergentAiWrite = AI_RESULT_FIELDS.some(
      (f) => updates[f] !== undefined && updates[f] !== (existing as any)[f],
    );
    const analysisInputChanged = ANALYSIS_INPUT_FIELDS.some(
      (f) => updates[f] !== undefined && updates[f] !== (existing as any)[f],
    );
    if (divergentAiWrite) {
      updates.analysisStatus = "stale";
      updates.analysisInputHash = "";
    } else if (analysisInputChanged && existing.analysisStatus === "ok") {
      updates.analysisStatus = "stale";
    }

    // Stripping server-owned fields can leave nothing to write (e.g. a
    // client sending ONLY forged cache fields) — that is a no-op, not an
    // error.
    const juror = Object.keys(updates).length > 0
      ? await storage.updateJuror(req.params.id, updates)
      : existing;
    if (!juror) return res.status(404).json({ message: "Juror not found" });

    // Profile/notes edits change the prompt inputs — re-warm in background.
    if (analysisInputChanged) {
      schedulePrewarmAnalysis(existing.caseId, existing.number);
    }

    if (req.body.race !== undefined || req.body.sex !== undefined) {
      try {
        await storage.updateCase(juror.caseId, { demographicsChangedAt: Date.now() } as any);
      } catch (e) {
        console.error("Failed to update demographicsChangedAt:", e);
      }
    }

    if (req.body.notes !== undefined) {
      const activeSession = await storage.getActiveSessionByCase(juror.caseId);
      if (activeSession) {
        broadcastToSession(activeSession.id, {
          type: "juror:notes-updated",
          data: { jurorNumber: juror.number, notes: juror.notes, updatedBy: req.user!.name },
        });
      }
    }

    res.json(juror);
  });

  app.delete("/api/cases/:caseId/jurors", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    await storage.deleteJurorsByCase(req.params.caseId);
    try { await storage.deleteJurorEnrichmentsByCase(req.params.caseId); } catch (e) { /* enrichment table may not exist yet */ }
    res.status(204).send();
  });

  // --- Import Enrichment CSV (removed) ---

  // --- Questions ---
  app.get("/api/cases/:caseId/questions", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const questions = await storage.getQuestionsByCase(req.params.caseId);
    res.json(questions);
  });

  app.post("/api/cases/:caseId/questions", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const caseId = req.params.caseId;
    const body = req.body;

    if (Array.isArray(body)) {
      const items = body.map((q: any) => ({ ...q, caseId }));
      const questions = await storage.createQuestions(items);
      res.status(201).json(questions);
    } else {
      const data = { ...body, caseId };
      const parsed = insertQuestionSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const question = await storage.createQuestion(parsed.data);
      res.status(201).json(question);
    }
  });

  app.patch("/api/questions/:id", async (req, res) => {
    const question = await storage.updateQuestion(req.params.id, req.body);
    if (!question) return res.status(404).json({ message: "Question not found" });
    const c = await storage.getCase(question.caseId);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Question not found" });
    res.json(question);
  });

  app.delete("/api/cases/:caseId/questions", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    await storage.deleteQuestionsByCase(req.params.caseId);
    res.status(204).send();
  });

  // --- Responses ---
  app.get("/api/cases/:caseId/responses", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const responses = await storage.getResponsesByCase(req.params.caseId);
    res.json(responses);
  });

  // --- Unresolved-flag queue (Lewis/Whigham Section 5) ---
  // Derives, deterministically, every raise/note on a case-critical topic that
  // still lacks a valence-resolving answer, plus the ranked panel rollup.
  app.get("/api/cases/:caseId/flag-rollup", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    try {
      const caseId = req.params.caseId;
      const c = await storage.getCase(caseId);
      if (!c) return res.status(404).json({ message: "Case not found" });
      const [jurorsForCase, responsesForCase, questionsForCase] = await Promise.all([
        storage.getJurorsByCase(caseId),
        storage.getResponsesByCase(caseId),
        storage.getQuestionsByCase(caseId),
      ]);
      const result = computeCaseFlags({
        caseSummary: c.summary || "",
        jurors: jurorsForCase.map((j) => ({ number: j.number, name: j.name })),
        questions: questionsForCase.map((q) => ({
          questionNumber: q.questionNumber,
          originalText: q.originalText,
          rephrase: q.rephrase,
        })),
        responses: responsesForCase.map((r) => ({
          jurorNumber: r.jurorNumber,
          questionId: r.questionId,
          responseText: r.responseText,
          questionSummary: r.questionSummary,
          followUps: r.followUps,
        })),
        courtDismissed: c.courtDismissed ?? [],
      });
      res.json(result);
    } catch (err: any) {
      console.error("Flag rollup error:", err);
      res.status(500).json({ message: err.message || "Failed to compute flag rollup" });
    }
  });

  // --- Panel prognosis (Lewis/Whigham Section 6) ---
  // Generated when the panel loads and again when responses close. Densities,
  // strike arithmetic, and the settlement-posture warning are computed in
  // code; the model writes reasoning from those numbers only.
  app.post("/api/cases/:caseId/panel-prognosis", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    try {
      const caseId = req.params.caseId;
      const stageParse = z.object({ stage: z.enum(["panel_load", "responses_closed"]) }).safeParse(req.body);
      if (!stageParse.success) {
        return res.status(400).json({ message: "stage must be 'panel_load' or 'responses_closed'" });
      }
      const stage = stageParse.data.stage;
      const c = await storage.getCase(caseId);
      if (!c) return res.status(404).json({ message: "Case not found" });
      const [jurorsForCase, responsesForCase, questionsForCase] = await Promise.all([
        storage.getJurorsByCase(caseId),
        storage.getResponsesByCase(caseId),
        storage.getQuestionsByCase(caseId),
      ]);
      if (jurorsForCase.length === 0) {
        return res.status(400).json({ message: "No jurors loaded for this case yet" });
      }

      const flagResult = computeCaseFlags({
        caseSummary: c.summary || "",
        jurors: jurorsForCase.map((j) => ({ number: j.number, name: j.name })),
        questions: questionsForCase.map((q) => ({
          questionNumber: q.questionNumber,
          originalText: q.originalText,
          rephrase: q.rephrase,
        })),
        responses: responsesForCase.map((r) => ({
          jurorNumber: r.jurorNumber,
          questionId: r.questionId,
          responseText: r.responseText,
          questionSummary: r.questionSummary,
          followUps: r.followUps,
        })),
        courtDismissed: c.courtDismissed ?? [],
      });

      const metrics = computePanelMetrics({
        jurors: jurorsForCase.map((j) => ({
          number: j.number,
          name: j.name,
          occupation: j.occupation,
          employer: j.employer,
        })),
        flags: flagResult.flags.map((f) => ({ jurorNumber: f.jurorNumber, topicId: f.topic, resolved: f.resolved })),
        courtDismissed: c.courtDismissed ?? [],
      });

      const flagLines = flagResult.flags.map(
        (f) => `#${f.jurorNumber} ${f.jurorName}: ${f.label}${f.resolved ? " (resolved)" : " (UNRESOLVED)"}`,
      );

      const prognosis = await generatePanelPrognosis({
        stage,
        caseInfo: {
          areaOfLaw: c.areaOfLaw,
          summary: c.summary,
          side: c.side,
          favorableTraits: c.favorableTraits || [],
          riskTraits: c.riskTraits || [],
        },
        jurors: jurorsForCase.map((j) => ({
          number: j.number,
          name: j.name,
          sex: j.sex,
          race: j.race,
          birthDate: j.birthDate,
          occupation: j.occupation,
          employer: j.employer,
        })),
        metrics,
        flagLines,
        courtDismissed: c.courtDismissed ?? [],
      });

      await storage.mergePanelPrognosis(caseId, stage === "panel_load" ? "panelLoad" : "responsesClosed", prognosis);

      if (stage === "responses_closed") {
        // Fire-and-forget (Section 8): the record is closed — pre-warm the
        // remaining juror analyses and auto-run the batched cause analysis
        // so the strike conference starts with results on the table.
        triggerStageCloseAnalyses(caseId);
      }

      res.json(prognosis);
    } catch (err: any) {
      console.error("Panel prognosis error:", err);
      respondWithAnthropicError(res, err, "Failed to generate panel prognosis");
    }
  });

  app.post("/api/cases/:caseId/responses", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const caseId = req.params.caseId;
    const data = {
      ...req.body,
      caseId,
      recordedBy: req.user!.name,
    };
    const parsed = insertResponseSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const response = await storage.createResponse(parsed.data);
    await markJurorAnalysisStale(caseId, response.jurorNumber);
    schedulePrewarmAnalysis(caseId, response.jurorNumber);

    const activeSession = await storage.getActiveSessionByCase(caseId);
    if (activeSession) {
      broadcastToSession(activeSession.id, {
        type: "response:new",
        data: response,
      });

      const questionId = response.questionId;
      const jurorNumber = response.jurorNumber;
      const responseText = response.responseText;
      if (questionId) {
        (async () => {
          try {
            const caseRecord = await storage.getCase(caseId);
            const allJurors = await storage.getJurorsByCase(caseId);
            const juror = allJurors.find((j) => j.number === jurorNumber);
            if (!juror || !caseRecord) return;
            const allQuestions = await storage.getQuestionsByCase(caseId);
            const question = allQuestions.find((q) => q.questionNumber === questionId);
            if (!question) return;
            const questionText = question.originalText || question.rephrase || "";
            console.log(`[Owner→Collab] Generating follow-up suggestions for Q#${questionId}, Juror #${jurorNumber}`);
            const suggestions = await generateFollowUpSuggestionsViaClaude({
              areaOfLaw: caseRecord.areaOfLaw,
              side: caseRecord.side,
              caseSummary: caseRecord.summary || "",
              jurorNumber,
              jurorName: juror.name,
              questionText,
              responseText,
            });
            console.log(`[Owner→Collab] Generated ${suggestions.length} follow-up suggestions for Q#${questionId}`);
            if (suggestions.length > 0) {
              broadcastToSession(activeSession.id, {
                type: "followup:suggestions",
                data: { questionId, jurorNumber, jurorName: juror.name, suggestions },
              });
              console.log(`[Owner→Collab] Broadcast followup:suggestions to session ${activeSession.id}`);
            }
          } catch (err) {
            console.log(`[Owner→Collab] Follow-up suggestion generation failed: ${err}`);
          }
        })();
      }
    }

    res.status(201).json(response);
  });

  app.post("/api/responses/:id/follow-ups", async (req, res) => {
    const { question, answer } = req.body;
    if (!answer) return res.status(400).json({ message: "answer is required" });

    const existing = await storage.getResponseById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Response not found" });
    const c = await storage.getCase(existing.caseId);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Response not found" });

    const updated = await storage.addFollowUpToResponse(req.params.id, { question: question || '', answer });
    if (!updated) return res.status(404).json({ message: "Response not found" });
    await markJurorAnalysisStale(updated.caseId, updated.jurorNumber);
    schedulePrewarmAnalysis(updated.caseId, updated.jurorNumber);

    const activeSession = await storage.getActiveSessionByCase(updated.caseId);
    if (activeSession) {
      broadcastToSession(activeSession.id, {
        type: "followup:new",
        data: { responseId: updated.id, followUp: { question: question || '', answer }, recordedBy: req.user!.name },
      });
    }

    res.json(updated);
  });

  // --- Voice Transcription ---
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }
      const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/flac'];
      if (req.file.mimetype && !allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: `Unsupported audio format: ${req.file.mimetype}` });
      }
      const OpenAI = (await import("openai")).default;
      const { toFile } = await import("openai/uploads");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const file = await toFile(req.file.buffer, req.file.originalname || "audio.webm", {
        type: req.file.mimetype || "audio/webm",
      });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
      });
      res.json({ text: transcription.text });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({ message: err.message || "Failed to transcribe audio" });
    }
  });

  // --- AI Strike List Parsing ---
  app.post("/api/parse-strike-list", upload.array("files", 20), async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Accel-Buffering', 'no');

    const keepAlive = setInterval(() => {
      try { res.write(' '); } catch {}
    }, 10000);

    try {
      const files = req.files as Express.Multer.File[] | undefined;
      let allJurors: any[] = [];

      if (files && files.length > 0) {
        for (const file of files) {
          if (!isAllowedFileType(file.mimetype, file.originalname)) {
            clearInterval(keepAlive);
            return res.end(JSON.stringify({ message: `Unsupported file type: ${file.originalname}. Please upload images, PDFs, TXT, or CSV files.` }));
          }
        }

        const parseFile = async (file: Express.Multer.File) => {
          if (isImageFile(file.mimetype, file.originalname)) {
            return parseStrikeListFromImage(file.buffer, file.mimetype, file.originalname);
          } else if (isPdfFile(file.mimetype, file.originalname)) {
            return parseStrikeListFromPdf(file.buffer);
          } else {
            const rawText = file.buffer.toString("utf-8");
            if (rawText.trim()) {
              return parseStrikeListWithAI(rawText);
            }
            return [];
          }
        };

        const results = await Promise.allSettled(files.map(f => parseFile(f)));
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === 'fulfilled') {
            allJurors.push(...r.value);
          } else {
            console.error(`Error processing file ${files[i].originalname}:`, r.reason);
            if (files.length === 1) {
              clearInterval(keepAlive);
              res.status(500);
              return res.end(JSON.stringify({ message: r.reason?.message || "Failed to parse strike list" }));
            }
          }
        }
      } else if (req.body.text) {
        const rawText = req.body.text;
        if (!rawText.trim()) {
          clearInterval(keepAlive);
          res.status(400);
          return res.end(JSON.stringify({ message: "The pasted text appears to be empty." }));
        }
        const jurors = await parseStrikeListWithAI(rawText);
        allJurors.push(...jurors);
      } else {
        clearInterval(keepAlive);
        res.status(400);
        return res.end(JSON.stringify({ message: "No files or text provided" }));
      }

      clearInterval(keepAlive);

      if (allJurors.length === 0) {
        res.status(400);
        return res.end(JSON.stringify({ message: "No jurors could be extracted from the uploaded files. Please check the content and try again." }));
      }

      allJurors.sort((a, b) => a.number - b.number);

      const { checkNameEthnicityPlausibility } = await import("./nameEthnicityCheck");
      const demographicFlags = checkNameEthnicityPlausibility(allJurors);

      res.end(JSON.stringify({ jurors: allJurors, demographicFlags }));
    } catch (err: any) {
      clearInterval(keepAlive);
      console.error("Strike list parse error:", err);
      res.status(500);
      res.end(JSON.stringify({ message: err.message || "Failed to parse strike list" }));
    }
  });

  // --- AI Voir Dire Generation ---
  const caseInfoSchema = z.object({
    areaOfLaw: z.string().min(1),
    summary: z.string().min(1),
    side: z.string().min(1),
    favorableTraits: z.array(z.string()),
    riskTraits: z.array(z.string()),
  });

  const jurorSummarySchema = z.object({
    id: z.string().optional(),
    number: z.number(),
    name: z.string(),
    sex: z.string(),
    race: z.string(),
    birthDate: z.string(),
    occupation: z.string(),
    employer: z.string(),
  });

  app.post("/api/generate-voir-dire", async (req, res) => {
    try {
      const parsed = z.object({
        caseInfo: caseInfoSchema,
        jurors: z.array(jurorSummarySchema),
        caseId: z.string().optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      let enrichmentMap: Record<string, Record<string, any>> = {};
      if (parsed.data.caseId) {
        try {
          const caseRecord = await storage.getCase(parsed.data.caseId);
          if (caseRecord && caseRecord.userId === req.user!.id) {
            enrichmentMap = await getEnrichedDataForCase(parsed.data.caseId);
          }
        } catch (err) {
          console.error("[VoirDire] Failed to fetch enrichment data:", err);
        }
      }

      const result = await generateFullVoirDire(parsed.data.caseInfo, parsed.data.jurors, enrichmentMap);
      res.json(result);
    } catch (err: any) {
      console.error("Voir dire generation error:", err);
      respondWithAnthropicError(res, err, "Failed to generate voir dire");
    }
  });

  function parseHtmlToStructuredItems(html: string): Array<{ text: string; children: string[] }> {
    const items: Array<{ text: string; children: string[] }> = [];

    function stripTags(s: string): string {
      return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').trim();
    }

    function findMatchingClose(s: string, tag: string, startPos: number): number {
      let depth = 1;
      const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
      const closeRegex = new RegExp(`</${tag}>`, 'gi');
      openRegex.lastIndex = startPos;
      closeRegex.lastIndex = startPos;
      const events: Array<{ pos: number; type: 'open' | 'close' }> = [];
      let m;
      while ((m = openRegex.exec(s)) !== null) events.push({ pos: m.index, type: 'open' });
      while ((m = closeRegex.exec(s)) !== null) events.push({ pos: m.index + m[0].length, type: 'close' });
      events.sort((a, b) => a.pos - b.pos);
      for (const ev of events) {
        if (ev.type === 'open') depth++;
        else { depth--; if (depth === 0) return ev.pos; }
      }
      return s.length;
    }

    function extractTopLevelLis(listContent: string): string[] {
      const lis: string[] = [];
      const liOpenRegex = /<li[^>]*>/gi;
      let m;
      while ((m = liOpenRegex.exec(listContent)) !== null) {
        const contentStart = m.index + m[0].length;
        const closePos = findMatchingClose(listContent, 'li', contentStart);
        const closingTagLen = '</li>'.length;
        const liInner = listContent.slice(contentStart, closePos - closingTagLen);
        lis.push(liInner);
        liOpenRegex.lastIndex = closePos;
      }
      return lis;
    }

    function parseLiContent(liHtml: string): { text: string; children: string[] } {
      const children: string[] = [];
      const listRanges: Array<{ start: number; end: number }> = [];
      const listOpenRegex = /<[uo]l[^>]*>/gi;
      let m;
      while ((m = listOpenRegex.exec(liHtml)) !== null) {
        const tag = liHtml.slice(m.index + 1, m.index + 3).replace(/[^a-z]/g, '') === 'ul' ? 'ul' : 'ol';
        const contentStart = m.index + m[0].length;
        const closePos = findMatchingClose(liHtml, tag, contentStart);
        listRanges.push({ start: m.index, end: closePos });
        const nestedContent = liHtml.slice(contentStart, closePos - `</${tag}>`.length);
        const nestedLis = extractTopLevelLis(nestedContent);
        for (const nli of nestedLis) {
          const childText = stripTags(nli.replace(/<[uo]l[^>]*>[\s\S]*?<\/[uo]l>/gi, ''));
          if (childText) children.push(childText);
        }
        listOpenRegex.lastIndex = closePos;
      }
      let parentHtml = '';
      let cursor = 0;
      for (const range of listRanges) {
        parentHtml += liHtml.slice(cursor, range.start);
        cursor = range.end;
      }
      parentHtml += liHtml.slice(cursor);
      const parentText = stripTags(parentHtml);
      return { text: parentText, children };
    }

    const topListOpenRegex = /<[uo]l[^>]*>/gi;
    let hasLists = false;
    let m;
    while ((m = topListOpenRegex.exec(html)) !== null) {
      hasLists = true;
      const tag = html.slice(m.index + 1, m.index + 3).replace(/[^a-z]/g, '') === 'ul' ? 'ul' : 'ol';
      const contentStart = m.index + m[0].length;
      const closePos = findMatchingClose(html, tag, contentStart);
      const listContent = html.slice(contentStart, closePos - `</${tag}>`.length);
      const lis = extractTopLevelLis(listContent);
      for (const li of lis) {
        const parsed = parseLiContent(li);
        if (parsed.text) items.push(parsed);
      }
      topListOpenRegex.lastIndex = closePos;
    }

    if (!hasLists) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(html)) !== null) {
        const text = stripTags(pMatch[1]);
        if (text) items.push({ text, children: [] });
      }
    }

    return items;
  }

  app.post("/api/parse-questions-document", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const ext = file.originalname.toLowerCase().split('.').pop() || '';
      let text = '';

      if (ext === 'txt' || ext === 'text') {
        text = file.buffer.toString('utf-8');
      } else if (ext === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(file.buffer);
        text = parsed.text;
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = await import('mammoth');
        const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });
        const html = htmlResult.value;

        const structuredItems = parseHtmlToStructuredItems(html);

        const rawResult = await mammoth.extractRawText({ buffer: file.buffer });
        text = rawResult.value;

        text = text.trim();
        if (!text) {
          return res.status(400).json({ message: "Could not extract any text from the uploaded file." });
        }

        return res.json({ text, filename: file.originalname, structuredItems });
      } else if (ext === 'rtf') {
        text = file.buffer.toString('utf-8').replace(/\{\\[^{}]*\}/g, '').replace(/\\[a-z]+\d*\s?/g, ' ').replace(/[{}]/g, '').trim();
      } else {
        return res.status(400).json({ message: `Unsupported file type: .${ext}. Please upload PDF, DOCX, TXT, or RTF files.` });
      }

      text = text.trim();
      if (!text) {
        return res.status(400).json({ message: "Could not extract any text from the uploaded file." });
      }

      res.json({ text, filename: file.originalname });
    } catch (err: any) {
      console.error("Document parse error:", err);
      res.status(500).json({ message: err.message || "Failed to parse document" });
    }
  });

  app.post("/api/suggest-followups", async (req, res) => {
    try {
      const parsed = z.object({
        questionText: z.string(),
        responseText: z.string(),
        jurorName: z.string(),
        jurorNumber: z.number(),
        caseInfo: caseInfoSchema,
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      const { questionText, responseText, jurorName, jurorNumber, caseInfo } = parsed.data;

      const suggestions = await generateFollowUpSuggestionsViaClaude({
        areaOfLaw: caseInfo.areaOfLaw,
        side: caseInfo.side,
        caseSummary: caseInfo.summary,
        jurorNumber,
        jurorName,
        questionText,
        responseText,
      });

      res.json({ suggestions });
    } catch (err: any) {
      console.error("Follow-up suggestion error:", err);
      res.status(500).json({ message: err.message || "Failed to generate follow-up suggestions" });
    }
  });

  app.post("/api/refine-questions", async (req, res) => {
    try {
      const parsed = z.object({
        rawQuestions: z.string().min(1),
        caseInfo: caseInfoSchema,
        jurors: z.array(jurorSummarySchema).default([]),
        caseId: z.string().optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      let enrichmentMap: Record<string, Record<string, any>> = {};
      if (parsed.data.caseId) {
        try {
          const caseRecord = await storage.getCase(parsed.data.caseId);
          if (caseRecord && caseRecord.userId === req.user!.id) {
            enrichmentMap = await getEnrichedDataForCase(parsed.data.caseId);
          }
        } catch (err) {
          console.error("[RefineQuestions] Failed to fetch enrichment data:", err);
        }
      }

      const result = await refineUserQuestions(parsed.data.rawQuestions, parsed.data.caseInfo, parsed.data.jurors, enrichmentMap);
      res.json({ questions: result });
    } catch (err: any) {
      console.error("Question refinement error:", err);
      respondWithAnthropicError(res, err, "Failed to refine questions");
    }
  });

  app.post("/api/analyze-juror", async (req, res) => {
    try {
      const parsed = z.object({
        caseInfo: z.object({
          name: z.string(),
          areaOfLaw: z.string(),
          summary: z.string(),
          side: z.string(),
          favorableTraits: z.array(z.string()),
          riskTraits: z.array(z.string()),
        }),
        juror: z.object({
          id: z.string().optional(),
          number: z.number(),
          name: z.string(),
          sex: z.string(),
          race: z.string(),
          birthDate: z.string(),
          occupation: z.string(),
          employer: z.string(),
          lean: z.string(),
          leanConfidence: z.string().default('none'),
          riskTier: z.string(),
          notes: z.string(),
        }),
        responses: z.array(z.object({
          questionText: z.string().nullable(),
          questionSummary: z.string().nullable(),
          responseText: z.string(),
          side: z.string(),
          followUps: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
        })),
        caseId: z.string().optional(),
        force: z.boolean().optional().default(false),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      let enrichedData: Record<string, any> | null = null;
      let jurorRecord: Awaited<ReturnType<typeof storage.getJurorsByCase>>[number] | null = null;
      let ownedCase: Awaited<ReturnType<typeof storage.getCase>> | null = null;
      if (parsed.data.caseId) {
        try {
          const caseRecord = await storage.getCase(parsed.data.caseId);
          if (caseRecord && caseRecord.userId === req.user!.id) {
            ownedCase = caseRecord;
            const allEnriched = await getEnrichedDataForCase(parsed.data.caseId);
            const jurorKey = parsed.data.juror.id || String(parsed.data.juror.number);
            enrichedData = allEnriched[jurorKey] || null;
            console.log(`[AnalyzeJuror] Juror #${parsed.data.juror.number} enrichment: ${enrichedData ? `found (${JSON.stringify(enrichedData).length} chars)` : 'none available'}`);
            if (parsed.data.juror.id) {
              const allJurors = await storage.getJurorsByCase(parsed.data.caseId);
              jurorRecord = allJurors.find(j => j.id === parsed.data.juror.id) || null;
            }
          }
        } catch (err) {
          console.error("[Enrichment] Failed to fetch enrichment data:", err);
        }
      }

      // Delta re-analysis (Section 9): if the stored analysis was computed
      // from EXACTLY these inputs, return it instead of regenerating.
      // Both the hash and the analysis use AUTHORITATIVE inputs where they
      // exist — the owned case row for posture and the stored juror row for
      // the profile — so a client replaying an old payload can never pull a
      // stale analysis forward, and editing the case posture invalidates
      // every cached analysis in the case. Responses stay caller-supplied
      // (that is the API contract); DB response changes are covered because
      // every response write marks the row 'stale', which the status gate
      // below enforces.
      const enrichedText = enrichedData ? (enrichedData.text || JSON.stringify(enrichedData)) : '';
      const caseContextForAnalysis = ownedCase
        ? {
            name: ownedCase.name,
            areaOfLaw: ownedCase.areaOfLaw,
            summary: ownedCase.summary,
            side: ownedCase.side,
            favorableTraits: ownedCase.favorableTraits ?? [],
            riskTraits: ownedCase.riskTraits ?? [],
          }
        : parsed.data.caseInfo;
      const jurorForAnalysis = jurorRecord
        ? {
            number: jurorRecord.number,
            name: jurorRecord.name,
            sex: jurorRecord.sex,
            race: jurorRecord.race,
            birthDate: jurorRecord.birthDate,
            occupation: jurorRecord.occupation,
            employer: jurorRecord.employer,
            lean: jurorRecord.lean,
            riskTier: jurorRecord.riskTier,
            notes: jurorRecord.notes,
          }
        : parsed.data.juror;
      const inputHash = computeAnalysisInputHash({
        caseContext: caseContextForAnalysis,
        juror: jurorForAnalysis,
        responses: parsed.data.responses,
        enrichedText,
      });
      if (
        jurorRecord && !parsed.data.force &&
        jurorRecord.analysisStatus === 'ok' &&
        jurorRecord.analysisInputHash === inputHash &&
        jurorRecord.aiAnalysis
      ) {
        console.log(`[AnalyzeJuror] Juror #${parsed.data.juror.number}: inputs unchanged, returning stored analysis`);
        return res.json({
          analysis: jurorRecord.aiAnalysis,
          riskScore: jurorRecord.riskScore,
          aiRiskTier: jurorRecord.aiRiskTier,
          suggestedLean: jurorRecord.aiSuggestedLean || 'unknown',
          leanConfidence: jurorRecord.aiLeanConfidence || 'low',
          informationLevel: jurorRecord.informationLevel || 'partial',
          provisional: jurorRecord.analysisProvisional,
          keyFollowUp: jurorRecord.keyFollowUp,
          damagesAnchor: jurorRecord.damagesAnchor,
          cached: true,
        });
      }

      const result = await analyzeJuror(caseContextForAnalysis, jurorForAnalysis, parsed.data.responses, enrichedData);

      // Persist so the hash-skip path and background pre-warm can reuse this
      // result. Persistence failure must not fail the analysis response.
      if (jurorRecord) {
        try {
          await storage.updateJuror(jurorRecord.id, {
            aiAnalysis: result.analysis,
            riskScore: result.riskScore,
            aiRiskTier: result.aiRiskTier,
            informationLevel: result.informationLevel,
            analysisProvisional: result.provisional,
            keyFollowUp: result.keyFollowUp,
            damagesAnchor: result.damagesAnchor,
            aiSuggestedLean: result.suggestedLean,
            aiLeanConfidence: result.leanConfidence,
            analysisStatus: 'ok',
            analysisInputHash: inputHash,
          });
        } catch (persistErr) {
          console.warn(`[AnalyzeJuror] Failed to persist analysis for juror #${parsed.data.juror.number}: ${persistErr}`);
        }
      }

      res.json({
        analysis: result.analysis,
        riskScore: result.riskScore,
        aiRiskTier: result.aiRiskTier,
        suggestedLean: result.suggestedLean,
        leanConfidence: result.leanConfidence,
        informationLevel: result.informationLevel,
        provisional: result.provisional,
        keyFollowUp: result.keyFollowUp,
        damagesAnchor: result.damagesAnchor,
        cached: false,
      });
    } catch (err: any) {
      console.error("Juror analysis error:", err);
      respondWithAnthropicError(res, err, "Failed to analyze juror");
    }
  });

  app.post("/api/analyze-jurors-batch", async (req, res) => {
    try {
      const parsed = z.object({
        caseInfo: z.object({
          name: z.string(),
          areaOfLaw: z.string(),
          summary: z.string(),
          side: z.string(),
          favorableTraits: z.array(z.string()),
          riskTraits: z.array(z.string()),
        }),
        jurors: z.array(z.object({
          id: z.string().optional(),
          number: z.number(),
          name: z.string().default('Unknown'),
          sex: z.string().default('U'),
          race: z.string().default('U'),
          birthDate: z.string().default('Unknown'),
          occupation: z.string().default('Unknown'),
          employer: z.string().default('Unknown'),
          lean: z.string().default('unknown'),
          leanConfidence: z.string().default('none'),
          riskTier: z.string().default('unassessed'),
          notes: z.string().optional().default(''),
          responses: z.array(z.object({
            questionText: z.string().nullable(),
            questionSummary: z.string().nullable(),
            responseText: z.string(),
            side: z.string(),
            followUps: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
          })).default([]),
        })),
        caseId: z.string().optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      let enrichedDataMap: Record<string, Record<string, any>> = {};
      if (parsed.data.caseId) {
        try {
          const caseRecord = await storage.getCase(parsed.data.caseId);
          if (caseRecord && caseRecord.userId === req.user!.id) {
            enrichedDataMap = await getEnrichedDataForCase(parsed.data.caseId);
          }
        } catch (err) {
          console.error("[Enrichment] Failed to fetch enrichment data for batch:", err);
        }
      }

      const BATCH_SIZE = 8;
      const summaries: Record<number, string> = {};
      const failed: Array<{ jurorNumber: number; message: string }> = [];
      const jurorsList = parsed.data.jurors;

      // Continue past failed jurors instead of aborting the whole batch —
      // each failure is reported per-juror so the UI can fail loudly.
      for (let i = 0; i < jurorsList.length; i += BATCH_SIZE) {
        const batch = jurorsList.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(j => generateBriefSummary(
            parsed.data.caseInfo,
            { number: j.number, name: j.name, sex: j.sex, race: j.race, birthDate: j.birthDate, occupation: j.occupation, employer: j.employer, lean: j.lean, riskTier: j.riskTier, notes: j.notes },
            j.responses,
            enrichedDataMap[j.id || String(j.number)] || null
          ))
        );
        batch.forEach((j, idx) => {
          const r = results[idx];
          if (r.status === 'fulfilled') {
            summaries[j.number] = r.value;
          } else {
            console.error(`[BatchSummaries] Summary failed for juror #${j.number}:`, r.reason);
            failed.push({ jurorNumber: j.number, message: r.reason?.message || 'Summary generation failed' });
          }
        });
      }

      res.json({ summaries, failed });
    } catch (err: any) {
      console.error("Batch juror analysis error:", err);
      respondWithAnthropicError(res, err, "Failed to analyze jurors");
    }
  });

  app.post("/api/analyze-strikes-for-cause", async (req, res) => {
    try {
      const parsed = z.object({
        caseInfo: z.object({
          name: z.string(),
          areaOfLaw: z.string(),
          summary: z.string(),
          side: z.string(),
          favorableTraits: z.array(z.string()),
          riskTraits: z.array(z.string()),
        }),
        jurors: z.array(z.object({
          number: z.number(),
          name: z.string().default('Unknown'),
          sex: z.string().default('U'),
          race: z.string().default('U'),
          birthDate: z.string().default('Unknown'),
          occupation: z.string().default('Unknown'),
          employer: z.string().default('Unknown'),
          lean: z.string().default('unknown'),
          leanConfidence: z.string().default('none'),
          riskTier: z.string().default('unassessed'),
          notes: z.string().optional().default(''),
          responses: z.array(z.object({
            questionText: z.string().nullable(),
            questionSummary: z.string().nullable(),
            responseText: z.string(),
            side: z.string(),
            followUps: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
          })).default([]),
        })),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      const jurors = parsed.data.jurors.map(j => ({
        number: j.number,
        name: j.name,
        sex: j.sex,
        race: j.race,
        birthDate: j.birthDate,
        occupation: j.occupation,
        employer: j.employer,
        lean: j.lean,
        riskTier: j.riskTier,
        notes: j.notes,
        responses: j.responses,
      }));

      const strikes = await analyzeStrikesForCause(parsed.data.caseInfo, jurors);
      res.json({ strikes });
    } catch (err: any) {
      console.error("Strike for cause analysis error:", err);
      respondWithAnthropicError(res, err, "Failed to analyze strikes for cause");
    }
  });

  // --- Batson Challenge Analysis ---
  app.post("/api/analyze-batson", async (req, res) => {
    try {
      const parsed = z.object({
        caseInfo: z.object({
          name: z.string(),
          areaOfLaw: z.string(),
          summary: z.string(),
          side: z.string(),
          favorableTraits: z.array(z.string()),
          riskTraits: z.array(z.string()),
        }),
        jurors: z.array(z.object({
          number: z.number(),
          name: z.string().default('Unknown'),
          sex: z.string().default('U'),
          race: z.string().default('U'),
          birthDate: z.string().default('Unknown'),
          occupation: z.string().default('Unknown'),
          employer: z.string().default('Unknown'),
          lean: z.string().default('unknown'),
          leanConfidence: z.string().default('none'),
          riskTier: z.string().default('unassessed'),
          notes: z.string().optional().default(''),
          aiSummary: z.string().optional().default(''),
          aiAnalysis: z.string().optional().default(''),
        })),
        yourStrikes: z.array(z.number()),
        theirStrikes: z.array(z.number()),
        // Preview mode: analyze a suggested strike order before any strike is
        // exercised (only honored when yourStrikes is empty).
        previewStrikeOrder: z.array(z.number()).optional(),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      const result = await analyzeBatson(
        parsed.data.caseInfo,
        parsed.data.jurors,
        parsed.data.yourStrikes,
        parsed.data.theirStrikes,
        { previewStrikeOrder: parsed.data.previewStrikeOrder }
      );
      res.json(result);
    } catch (err: any) {
      console.error("Batson analysis error:", err);
      respondWithAnthropicError(res, err, "Failed to analyze Batson challenge");
    }
  });

  // --- MattrMindr Integration ---
  app.post("/api/mattrmindr/connect", async (req, res) => {
    try {
      const parsed = z.object({
        url: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(1),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

      let baseUrl = parsed.data.url.trim();
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
      baseUrl = baseUrl.replace(/\/$/, '');

      try {
        const urlObj = new URL(baseUrl);
        if (!['https:', 'http:'].includes(urlObj.protocol)) {
          return res.status(400).json({ message: "Invalid URL protocol" });
        }
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' ||
            hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.') ||
            hostname === '[::1]' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
          return res.status(400).json({ message: "Private/local URLs are not allowed" });
        }
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const result = await loginToMattrMindr(baseUrl, parsed.data.email, parsed.data.password);
      await storage.updateUser(req.user!.id, {
        mattrmindrUrl: baseUrl,
        mattrmindrToken: result.token,
        mattrmindrEmail: parsed.data.email,
        mattrmindrPassword: parsed.data.password,
      });

      res.json({ connected: true, user: result.user });
    } catch (err: any) {
      console.error("MattrMindr connect error:", err);
      res.status(err.status || 500).json({ message: err.message || "Failed to connect to MattrMindr" });
    }
  });

  app.post("/api/mattrmindr/disconnect", async (req, res) => {
    await storage.updateUser(req.user!.id, {
      mattrmindrUrl: null,
      mattrmindrToken: null,
      mattrmindrEmail: null,
      mattrmindrPassword: null,
    });
    res.json({ connected: false });
  });

  async function refreshMattrMindrToken(userId: string): Promise<{ success: boolean; token?: string }> {
    const user = await storage.getUserById(userId);
    if (!user?.mattrmindrUrl || !user?.mattrmindrEmail || !user?.mattrmindrPassword) {
      return { success: false };
    }
    try {
      const result = await loginToMattrMindr(user.mattrmindrUrl, user.mattrmindrEmail, user.mattrmindrPassword);
      await storage.updateUser(userId, { mattrmindrToken: result.token });
      return { success: true, token: result.token };
    } catch (err) {
      console.error("MattrMindr auto-refresh failed:", err);
      return { success: false };
    }
  }

  async function getValidMmToken(userId: string): Promise<{ url: string; token: string } | null> {
    const user = await storage.getUserById(userId);
    if (!user?.mattrmindrUrl) return null;

    if (user.mattrmindrToken) {
      const verify = await verifyMattrMindrToken(user.mattrmindrUrl, user.mattrmindrToken);
      if (verify.valid) return { url: user.mattrmindrUrl, token: user.mattrmindrToken };
    }

    const refresh = await refreshMattrMindrToken(userId);
    if (refresh.success && refresh.token) {
      return { url: user.mattrmindrUrl, token: refresh.token };
    }
    return null;
  }

  app.get("/api/mattrmindr/status", async (req, res) => {
    const user = await storage.getUserById(req.user!.id);
    if (!user?.mattrmindrUrl) {
      return res.json({ connected: false });
    }

    const conn = await getValidMmToken(req.user!.id);
    if (conn) {
      return res.json({ connected: true, url: conn.url });
    }

    if (user.mattrmindrEmail && user.mattrmindrPassword) {
      return res.json({ connected: false, expired: true, url: user.mattrmindrUrl });
    }
    return res.json({ connected: false, expired: true, url: user.mattrmindrUrl });
  });

  app.get("/api/mattrmindr/cases", async (req, res) => {
    try {
      const conn = await getValidMmToken(req.user!.id);
      if (!conn) return res.status(400).json({ message: "MattrMindr not connected" });
      const user = await storage.getUserById(req.user!.id);
      const cases = await fetchMattrMindrCases(conn.url, conn.token, { name: user?.name, email: user?.email });
      res.json(cases);
    } catch (err: any) {
      if (err.status === 401) {
        const refresh = await refreshMattrMindrToken(req.user!.id);
        if (refresh.success && refresh.token) {
          try {
            const user = await storage.getUserById(req.user!.id);
            const cases = await fetchMattrMindrCases(user!.mattrmindrUrl!, refresh.token, { name: user?.name, email: user?.email });
            return res.json(cases);
          } catch (retryErr: any) {
            return res.status(500).json({ message: retryErr.message || "Failed to fetch MattrMindr cases" });
          }
        }
        return res.status(401).json({ message: "MattrMindr session expired. Please reconnect." });
      }
      res.status(500).json({ message: err.message || "Failed to fetch MattrMindr cases" });
    }
  });

  app.get("/api/mattrmindr/cases/:id", async (req, res) => {
    try {
      const conn = await getValidMmToken(req.user!.id);
      if (!conn) return res.status(400).json({ message: "MattrMindr not connected" });
      const caseDetail = await fetchMattrMindrCase(conn.url, conn.token, req.params.id);
      res.json(caseDetail);
    } catch (err: any) {
      if (err.status === 401) {
        const refresh = await refreshMattrMindrToken(req.user!.id);
        if (refresh.success && refresh.token) {
          try {
            const user = await storage.getUserById(req.user!.id);
            const caseDetail = await fetchMattrMindrCase(user!.mattrmindrUrl!, refresh.token, req.params.id);
            return res.json(caseDetail);
          } catch (retryErr: any) {
            return res.status(500).json({ message: retryErr.message || "Failed to fetch case details" });
          }
        }
        return res.status(401).json({ message: "MattrMindr session expired. Please reconnect." });
      }
      res.status(500).json({ message: err.message || "Failed to fetch case details" });
    }
  });

  app.post("/api/mattrmindr/cases/:id/jury-analysis", async (req, res) => {
    try {
      const conn = await getValidMmToken(req.user!.id);
      if (!conn) return res.status(400).json({ message: "MattrMindr not connected" });
      const result = await pushJuryAnalysis(conn.url, conn.token, req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.status === 401) {
        const refresh = await refreshMattrMindrToken(req.user!.id);
        if (refresh.success && refresh.token) {
          try {
            const user = await storage.getUserById(req.user!.id);
            const result = await pushJuryAnalysis(user!.mattrmindrUrl!, refresh.token, req.params.id, req.body);
            return res.json(result);
          } catch (retryErr: any) {
            return res.status(500).json({ message: retryErr.message || "Failed to push jury analysis" });
          }
        }
        return res.status(401).json({ message: "MattrMindr session expired. Please reconnect." });
      }
      res.status(500).json({ message: err.message || "Failed to push jury analysis" });
    }
  });

  // --- Full case load (for resuming) ---
  app.get("/api/cases/:id/full", async (req, res) => {
    const c = await storage.getCase(req.params.id);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Case not found" });
    const [jurors, questions, responses] = await Promise.all([
      storage.getJurorsByCase(c.id),
      storage.getQuestionsByCase(c.id),
      storage.getResponsesByCase(c.id),
    ]);
    res.json({ ...c, jurors, questions, responses });
  });

  // --- Collaborative Session Join (public, no auth required) ---
  app.post("/api/sessions/join", async (req, res) => {
    try {
      const { code, displayName, role } = req.body;
      if (!code || !displayName) {
        return res.status(400).json({ message: "code and displayName are required" });
      }
      const participantRole = role === "questioner" ? "questioner" : "recorder";
      if (displayName.length > 50) {
        return res.status(400).json({ message: "Display name must be 50 characters or less" });
      }

      const session = await storage.getCollaborativeSessionByCode(code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Invalid session code or session is no longer active" });
      }

      let participant;
      try {
        participant = await storage.createSessionParticipantAtomic({
          sessionId: session.id,
          displayName: displayName.trim(),
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
        }, session.maxParticipants);
      } catch (err: any) {
        if (err.message?.includes("full")) {
          return res.status(409).json({ message: err.message });
        }
        throw err;
      }

      const token = createCollabToken({
        sessionId: session.id,
        participantId: participant.id,
        displayName: participant.displayName,
        caseId: session.caseId,
        role: participantRole,
      });

      const caseRecord = await storage.getCase(session.caseId);

      res.json({
        token,
        sessionId: session.id,
        caseId: session.caseId,
        participantId: participant.id,
        displayName: participant.displayName,
        caseName: caseRecord?.name || "Unknown Case",
        role: participantRole,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to join session" });
    }
  });

  app.get("/api/sessions/validate/:code", async (req, res) => {
    const session = await storage.getCollaborativeSessionByCode(req.params.code.toUpperCase());
    if (!session) {
      return res.status(404).json({ message: "Invalid session code" });
    }
    const c = await storage.getCase(session.caseId);
    res.json({ valid: true, caseName: c?.name || "Unknown Case" });
  });

  // --- Collaborative Session Management (auth-protected) ---
  app.use("/api/sessions", authMiddleware);

  app.post("/api/sessions", async (req, res) => {
    try {
      const { caseId } = req.body;
      if (!caseId) return res.status(400).json({ message: "caseId is required" });

      const c = await storage.getCase(caseId);
      if (!c || c.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }

      const existing = await storage.getActiveSessionByCase(caseId);
      if (existing) {
        const participants = await storage.getSessionParticipants(existing.id);
        const connected = getConnectedParticipants(existing.id);
        return res.json({ ...existing, participants, connectedNames: connected });
      }

      let sessionCode: string;
      let attempts = 0;
      do {
        sessionCode = generateSessionCode();
        const dup = await storage.getCollaborativeSessionByCode(sessionCode);
        if (!dup) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({ message: "Failed to generate unique session code" });
      }

      const session = await storage.createCollaborativeSession({
        caseId,
        sessionCode,
        createdBy: req.user!.id,
        isActive: true,
        maxParticipants: 10,
        createdAt: Date.now(),
      });

      res.status(201).json({ ...session, participants: [], connectedNames: [] });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create session" });
    }
  });

  app.get("/api/sessions/case/:caseId", async (req, res) => {
    const c = await storage.getCase(req.params.caseId);
    if (!c || c.userId !== req.user!.id) {
      return res.status(404).json({ message: "Case not found" });
    }

    const session = await storage.getActiveSessionByCase(req.params.caseId);
    if (!session) return res.json(null);

    const participants = await storage.getSessionParticipants(session.id);
    const connected = getConnectedParticipants(session.id);
    res.json({ ...session, participants, connectedNames: connected });
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    const session = await storage.getCollaborativeSessionById(req.params.id);
    if (!session || session.createdBy !== req.user!.id) {
      return res.status(404).json({ message: "Session not found" });
    }

    disconnectAllInSession(session.id);
    await storage.removeAllSessionParticipants(session.id);
    await storage.deactivateSession(session.id);

    res.status(204).send();
  });

  app.get("/api/sessions/:id/participants/active", async (req, res) => {
    const session = await storage.getCollaborativeSessionById(req.params.id);
    if (!session || session.createdBy !== req.user!.id) {
      return res.status(404).json({ message: "Session not found" });
    }

    const active = await storage.getActiveSessionParticipants(session.id);
    res.json(active.map(p => ({
      id: p.id,
      displayName: p.displayName,
      joinedAt: p.joinedAt,
      lastActiveAt: p.lastActiveAt,
    })));
  });

  // --- Collaborator-scoped API routes ---
  app.use("/api/collab", collabAuthMiddleware);

  app.get("/api/collab/jurors", async (req, res) => {
    const caseId = req.collab!.caseId;
    const allJurors = await storage.getJurorsByCase(caseId);
    const limited = allJurors.map((j) => ({
      number: j.number,
      name: j.name,
    }));
    res.json(limited);
  });

  app.get("/api/collab/questions", async (req, res) => {
    const caseId = req.collab!.caseId;
    const allQuestions = await storage.getQuestionsByCase(caseId);
    res.json(allQuestions);
  });

  app.get("/api/collab/responses", async (req, res) => {
    const caseId = req.collab!.caseId;
    const allResponses = await storage.getResponsesByCase(caseId);
    res.json(allResponses);
  });

  app.get("/api/collab/case-info", async (req, res) => {
    const caseId = req.collab!.caseId;
    const c = await storage.getCase(caseId);
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json({
      id: c.id,
      name: c.name,
      lastPhase: c.lastPhase,
      seatingConfig: c.seatingConfig,
    });
  });

  app.get("/api/collab/report-data", async (req, res) => {
    const caseId = req.collab!.caseId;
    const c = await storage.getCase(caseId);
    if (!c) return res.status(404).json({ message: "Case not found" });
    if (c.lastPhase < 6) return res.status(403).json({ message: "Report not yet available" });
    const allJurors = await storage.getJurorsByCase(caseId);
    const allResponses = await storage.getResponsesByCase(caseId);
    res.json({
      caseName: c.name,
      side: c.side,
      strikesForCause: c.strikesForCause,
      courtDismissed: c.courtDismissed,
      batsonAnalysis: c.batsonAnalysis,
      seatingConfig: c.seatingConfig,
      jurors: allJurors.map((j) => ({
        number: j.number,
        name: j.name,
        lean: j.lean,
        leanConfidence: j.leanConfidence,
        riskTier: j.riskTier,
        riskScore: j.riskScore,
        notes: j.notes,
        aiAnalysis: j.aiAnalysis || null,
        aiSummary: j.aiSummary || null,
      })),
      responses: allResponses.map((r) => ({
        id: r.id,
        jurorNumber: r.jurorNumber,
        responseText: r.responseText,
        side: r.side,
        questionSummary: r.questionSummary,
        followUps: r.followUps,
        recordedBy: r.recordedBy,
      })),
    });
  });

  const DUPLICATE_WINDOW_MS = 5000;

  app.post("/api/collab/responses", async (req, res) => {
    try {
      const caseId = req.collab!.caseId;
      const caseRecord = await storage.getCase(caseId);
      if (caseRecord && caseRecord.lastPhase >= 5) {
        return res.status(403).json({ message: "Recording is disabled in this phase" });
      }
      const displayName = req.collab!.displayName;
      const { jurorNumber, questionId, responseText, side, questionSummary } = req.body;

      if (!responseText || jurorNumber === undefined) {
        return res.status(400).json({ message: "jurorNumber and responseText are required" });
      }

      const duplicate = await storage.getRecentResponseForDuplicate(
        caseId, jurorNumber, questionId || null, DUPLICATE_WINDOW_MS
      );

      let isDuplicate = false;
      if (duplicate && duplicate.recordedBy !== displayName) {
        isDuplicate = true;
      }

      const response = await storage.createResponse({
        caseId,
        jurorNumber,
        questionId: questionId || null,
        responseText,
        side: side || "yours",
        questionSummary: questionSummary || null,
        followUps: [],
        timestamp: Date.now(),
        recordedBy: displayName,
        recordedByParticipantId: req.collab!.participantId,
      });
      await markJurorAnalysisStale(caseId, response.jurorNumber);
      schedulePrewarmAnalysis(caseId, response.jurorNumber);

      broadcastToSession(req.collab!.sessionId, {
        type: "response:new",
        data: response,
      });

      if (isDuplicate) {
        broadcastToSession(req.collab!.sessionId, {
          type: "response:duplicate",
          data: {
            responseId: response.id,
            jurorNumber,
            questionId,
            recordedBy: displayName,
            previousRecordedBy: duplicate!.recordedBy,
          },
        });
      }

      if (questionId) {
        (async () => {
          try {
            const allJurors = await storage.getJurorsByCase(caseId);
            const juror = allJurors.find((j) => j.number === jurorNumber);
            if (!juror || !caseRecord) return;
            const allQuestions = await storage.getQuestionsByCase(caseId);
            const question = allQuestions.find((q) => q.questionNumber === questionId);
            if (!question) return;
            const questionText = question.originalText || question.rephrase || "";
            console.log(`[Collab] Generating follow-up suggestions for Q#${questionId}, Juror #${jurorNumber}`);
            const suggestions = await generateFollowUpSuggestionsViaClaude({
              areaOfLaw: caseRecord.areaOfLaw,
              side: caseRecord.side,
              caseSummary: caseRecord.summary || "",
              jurorNumber,
              jurorName: juror.name,
              questionText,
              responseText,
            });
            console.log(`[Collab] Generated ${suggestions.length} follow-up suggestions for Q#${questionId}`);
            if (suggestions.length > 0) {
              broadcastToSession(req.collab!.sessionId, {
                type: "followup:suggestions",
                data: { questionId, jurorNumber, jurorName: juror.name, suggestions },
              });
              console.log(`[Collab] Broadcast followup:suggestions to session ${req.collab!.sessionId}`);
            }
          } catch (err) {
            console.log(`[Collab] Follow-up suggestion generation failed: ${err}`);
          }
        })();
      }

      res.status(201).json({ ...response, isDuplicate });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to record response" });
    }
  });

  app.delete("/api/collab/responses/:id", async (req, res) => {
    const existing = await storage.getResponseById(req.params.id);
    if (!existing || existing.caseId !== req.collab!.caseId) {
      return res.status(404).json({ message: "Response not found" });
    }
    if (existing.recordedByParticipantId !== req.collab!.participantId) {
      return res.status(403).json({ message: "You can only delete your own responses" });
    }
    await storage.deleteResponse(req.params.id);
    broadcastToSession(req.collab!.sessionId, {
      type: "response:deleted",
      data: { responseId: req.params.id },
    });
    res.json({ success: true });
  });

  app.post("/api/collab/responses/:id/follow-ups", async (req, res) => {
    const { question, answer } = req.body;
    if (!answer) return res.status(400).json({ message: "answer is required" });

    const existing = await storage.getResponseById(req.params.id);
    if (!existing || existing.caseId !== req.collab!.caseId) {
      return res.status(404).json({ message: "Response not found" });
    }

    const caseRecord = await storage.getCase(req.collab!.caseId);
    if (caseRecord && caseRecord.lastPhase >= 5) {
      return res.status(403).json({ message: "Recording is disabled in this phase" });
    }

    const updated = await storage.addFollowUpToResponse(req.params.id, { question: question || "", answer });
    if (!updated) return res.status(404).json({ message: "Response not found" });
    await markJurorAnalysisStale(updated.caseId, updated.jurorNumber);
    schedulePrewarmAnalysis(updated.caseId, updated.jurorNumber);

    broadcastToSession(req.collab!.sessionId, {
      type: "followup:new",
      data: { responseId: updated.id, followUp: { question: question || "", answer }, recordedBy: req.collab!.displayName },
    });

    res.json(updated);
  });

  app.patch("/api/collab/jurors/:jurorNumber/notes", async (req, res) => {
    const caseId = req.collab!.caseId;
    const jurorNumber = parseInt(req.params.jurorNumber, 10);
    const { notes } = req.body;
    if (notes === undefined) return res.status(400).json({ message: "notes is required" });

    const allJurors = await storage.getJurorsByCase(caseId);
    const juror = allJurors.find((j) => j.number === jurorNumber);
    if (!juror) return res.status(404).json({ message: "Juror not found" });

    // Notes feed the analysis prompt — an edit makes the stored analysis
    // stale and triggers a background re-warm.
    const notesChanged = notes !== juror.notes;
    const updated = await storage.updateJuror(juror.id, {
      notes,
      ...(notesChanged && juror.analysisStatus === "ok" ? { analysisStatus: "stale" } : {}),
    });
    if (!updated) return res.status(500).json({ message: "Failed to update juror notes" });
    if (notesChanged) schedulePrewarmAnalysis(caseId, jurorNumber);

    broadcastToSession(req.collab!.sessionId, {
      type: "juror:notes-updated",
      data: { jurorNumber, notes, updatedBy: req.collab!.displayName },
    });

    res.json({ number: updated.number, name: updated.name, notes: updated.notes });
  });

  app.post("/api/collab/set-active-question", async (req, res) => {
    if (req.collab!.role !== "questioner") {
      return res.status(403).json({ message: "Only questioners can set the active question" });
    }
    const { questionId, questionText, isFollowUp, jurorNumber } = req.body;
    if (!questionText) {
      return res.status(400).json({ message: "questionText is required" });
    }

    broadcastToSession(req.collab!.sessionId, {
      type: "question:set-active",
      data: {
        questionId: questionId || null,
        questionText,
        isFollowUp: !!isFollowUp,
        jurorNumber: jurorNumber || null,
        setBy: req.collab!.displayName,
      },
    });

    res.json({ success: true });
  });

  app.post("/api/collab/suggest-followups", async (req, res) => {
    try {
      if (req.collab!.type !== "owner") {
        return res.status(403).json({ message: "Only case owners can request follow-up suggestions via this endpoint" });
      }
      const caseId = req.collab!.caseId;
      const { questionText, responseText, jurorName, jurorNumber } = req.body;
      if (!questionText || !responseText || !jurorName || jurorNumber === undefined) {
        return res.status(400).json({ message: "questionText, responseText, jurorName, jurorNumber are required" });
      }

      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord) return res.status(404).json({ message: "Case not found" });

      const suggestions = await generateFollowUpSuggestionsViaClaude({
        areaOfLaw: caseRecord.areaOfLaw,
        side: caseRecord.side,
        caseSummary: caseRecord.summary || "",
        jurorNumber,
        jurorName,
        questionText,
        responseText,
      });

      res.json({ suggestions });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate suggestions" });
    }
  });

  // --- AI Assistant Chat ---
  registerChatRoutes(app);

  return httpServer;
}
