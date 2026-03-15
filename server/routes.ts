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
import { loginToMattrMindr, verifyMattrMindrToken, fetchMattrMindrCases, fetchMattrMindrCase, pushJuryAnalysis } from "./mattrmindr";
import { registerChatRoutes } from "./replit_integrations/chat";
import { canCreateCase, getUserBillingInfo, createCheckoutSession, createPortalSession, handleWebhook } from "./billing";
import { triggerEnrichmentForJurors, handleEnrichmentWebhook, getEnrichedDataForCase, verifyWebhookSecret } from "./fluxEnrichment";

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

  app.options("/api/webhooks/juror-enrichment/:enrichmentId", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret, api-key, Authorization");
    res.set("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });

  app.options("/api/webhooks/juror-enrichment/", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret, api-key, Authorization");
    res.set("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });

  app.post("/api/webhooks/juror-enrichment/", async (req, res) => {
    try {
      res.set("Access-Control-Allow-Origin", "*");
      console.log(`[Webhook] Incoming callback to BASE webhook URL (no enrichmentId)`);
      console.log(`[Webhook] Content-Type: ${req.headers["content-type"]}`);
      const rawBody = req.rawBody ? Buffer.from(req.rawBody as any).toString("utf-8") : "(no rawBody)";
      console.log(`[Webhook] Raw body (${rawBody.length} chars): ${rawBody.substring(0, 5000)}`);
      console.log(`[Webhook] req.body type: ${typeof req.body}, value:`, JSON.stringify(req.body)?.substring(0, 5000));
      res.json({ success: true, message: "Received at base URL (no enrichmentId)" });
    } catch (err: any) {
      console.error("[Webhook] Base URL error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.options("/api/webhooks/flux-test", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret, api-key, Authorization");
    res.set("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });

  app.post("/api/webhooks/flux-test", async (req, res) => {
    try {
      res.set("Access-Control-Allow-Origin", "*");
      const rawBody = req.rawBody ? Buffer.from(req.rawBody as any).toString("utf-8") : "(no rawBody)";
      console.log(`\n=== FLUX TEST WEBHOOK RECEIVED ===`);
      console.log(`[FluxTest] Timestamp: ${new Date().toISOString()}`);
      console.log(`[FluxTest] Content-Type: ${req.headers["content-type"]}`);
      console.log(`[FluxTest] Raw body (${rawBody.length} chars):`);
      console.log(rawBody.substring(0, 10000));
      console.log(`[FluxTest] Parsed body:`, JSON.stringify(req.body, null, 2)?.substring(0, 10000));
      console.log(`=== END FLUX TEST WEBHOOK ===\n`);
      res.json({ success: true, message: "Test webhook received successfully" });
    } catch (err: any) {
      console.error("[FluxTest] Error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // --- All routes below require authentication ---
  app.post("/api/webhooks/juror-enrichment/:enrichmentId", async (req, res) => {
    res.status(200).json({ success: true, message: "Webhook received" });

    try {
      console.log("RAW FLUXPROMPT WEBHOOK PAYLOAD:", JSON.stringify(req.body, null, 2));
      console.log(`[Webhook] Incoming enrichment callback for ${req.params.enrichmentId}`);
      console.log(`[Webhook] Content-Type: ${req.headers["content-type"]}`);

      const { enrichmentId } = req.params;

      let payload = req.body;
      if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
        const rawBody = req.rawBody ? Buffer.from(req.rawBody as any).toString("utf-8") : "";
        if (rawBody) {
          try { payload = JSON.parse(rawBody); } catch { payload = { text: rawBody }; }
        }
      }

      const result = await handleEnrichmentWebhook(enrichmentId, payload);
      console.log(`[Webhook] Processing result for ${enrichmentId}: ${result.message}`);
    } catch (err: any) {
      console.error("[Webhook] Enrichment error:", err);
    }
  });

  app.get("/api/cases/:caseId/enrichment-status", authMiddleware, async (req, res) => {
    try {
      const { caseId } = req.params;
      const caseRecord = await storage.getCase(caseId);
      if (!caseRecord || caseRecord.userId !== req.user!.id) {
        return res.status(404).json({ message: "Case not found" });
      }
      const enrichments = await storage.getJurorEnrichmentsByCase(caseId);
      const jurorsList = await storage.getJurorsByCase(caseId);
      const jurorNames: Record<number, string> = {};
      for (const j of jurorsList) {
        jurorNames[j.number] = j.name;
      }
      const items = enrichments.map(e => ({
        jurorNumber: e.jurorNumber,
        jurorName: jurorNames[e.jurorNumber] || `Juror #${e.jurorNumber}`,
        status: e.status,
        enrichmentId: e.enrichmentId,
        createdAt: e.createdAt,
        completedAt: e.completedAt,
        hasData: !!(e.enrichedData && (e.enrichedData as any).text),
      }));
      const summary = {
        total: items.length,
        pending: items.filter(i => i.status === "pending").length,
        dispatched: items.filter(i => i.status === "dispatched").length,
        completed: items.filter(i => i.status === "completed").length,
        failed: items.filter(i => i.status === "failed").length,
        error: items.filter(i => i.status === "error").length,
      };
      res.json({ items, summary });
    } catch (err: any) {
      console.error("[EnrichmentStatus] Error:", err);
      res.status(500).json({ message: "Failed to fetch enrichment status" });
    }
  });

  app.use("/api/cases", authMiddleware);
  app.use("/api/jurors", authMiddleware);
  app.use("/api/questions", authMiddleware);
  app.use("/api/responses", authMiddleware);
  app.use("/api/parse-strike-list", authMiddleware);
  app.use("/api/transcribe", authMiddleware);
  app.use("/api/generate-voir-dire", authMiddleware);
  app.use("/api/refine-questions", authMiddleware);
  app.use("/api/analyze-juror", authMiddleware);
  app.use("/api/analyze-jurors-batch", authMiddleware);
  app.use("/api/analyze-strikes-for-cause", authMiddleware);
  app.use("/api/mattrmindr", authMiddleware);
  app.use("/api/conversations", authMiddleware);
  app.use("/api/import-enrichment", authMiddleware);

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
    const c = await storage.updateCase(req.params.id, req.body);
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

  app.post("/api/cases/:caseId/jurors", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const caseId = req.params.caseId;
    const body = req.body;

    if (Array.isArray(body)) {
      const items = body.map((j: any) => ({ ...j, caseId }));
      const savedJurors = await storage.createJurors(items);
      res.status(201).json(savedJurors);

      const jurorData = savedJurors.map(j => ({
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
        console.error("[FluxEnrichment] Background enrichment failed:", err.message)
      );
    } else {
      const data = { ...body, caseId };
      const parsed = insertJurorSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const juror = await storage.createJuror(parsed.data);
      res.status(201).json(juror);

      triggerEnrichmentForJurors(caseId, [{
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
        console.error("[FluxEnrichment] Background enrichment failed:", err.message)
      );
    }
  });

  app.patch("/api/jurors/:id", async (req, res) => {
    const juror = await storage.updateJuror(req.params.id, req.body);
    if (!juror) return res.status(404).json({ message: "Juror not found" });
    const c = await storage.getCase(juror.caseId);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Juror not found" });
    res.json(juror);
  });

  app.delete("/api/cases/:caseId/jurors", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    await storage.deleteJurorsByCase(req.params.caseId);
    try { await storage.deleteJurorEnrichmentsByCase(req.params.caseId); } catch (e) { /* enrichment table may not exist yet */ }
    res.status(204).send();
  });

  // --- Import Enrichment CSV ---
  app.post("/api/import-enrichment/:caseId", upload.single("file"), async (req, res) => {
    try {
      const { caseId } = req.params;
      const c = await storage.getCase(caseId);
      if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Case not found" });

      const jurors = await storage.getJurorsByCase(caseId);
      if (jurors.length === 0) return res.status(400).json({ message: "No jurors found for this case" });

      let csvText = "";
      if (req.file) {
        csvText = req.file.buffer.toString("utf-8");
      } else if (req.body.csvText) {
        csvText = req.body.csvText;
      } else {
        return res.status(400).json({ message: "No CSV file or text provided" });
      }

      const allRows = parseCSVFull(csvText);
      if (allRows.length < 2) return res.status(400).json({ message: "CSV must have a header row and at least one data row" });

      const headers = allRows[0].map((h: string) => h.trim().toLowerCase());

      const nameIdx = headers.findIndex((h: string) => h === "name" || h === "juror name" || h === "juror_name");
      const numberIdx = headers.findIndex((h: string) => h === "juror number" || h === "juror_number" || h === "number" || h === "#");

      if (nameIdx === -1 && numberIdx === -1) {
        return res.status(400).json({ message: "CSV must have a 'Name' or 'Juror Number' column to match jurors" });
      }

      const enrichmentIdx = headers.findIndex((h: string) =>
        h === "enrichment" || h === "enrichment data" || h === "enrichment_data" ||
        h === "analysis" || h === "ai_analysis" || h === "ai analysis" ||
        h === "report" || h === "results" || h === "output" || h === "response"
      );

      const keyIndices = new Set([nameIdx, numberIdx].filter(i => i !== -1));

      const matched: Array<{ jurorNumber: number; jurorName: string; enrichmentText: string }> = [];
      const unmatched: string[] = [];

      for (let i = 1; i < allRows.length; i++) {
        const values = allRows[i];
        if (values.length === 0 || values.every((v: string) => !v.trim())) continue;

        let matchedJuror: typeof jurors[0] | undefined;

        if (numberIdx !== -1 && values[numberIdx]) {
          const num = parseInt(values[numberIdx].trim(), 10);
          if (!isNaN(num)) {
            matchedJuror = jurors.find(j => j.number === num);
          }
        }

        if (!matchedJuror && nameIdx !== -1 && values[nameIdx]) {
          const csvName = values[nameIdx].trim().toLowerCase();
          matchedJuror = jurors.find(j => {
            const jName = j.name.trim().toLowerCase();
            if (jName === csvName) return true;
            const jParts = jName.split(/\s+/);
            const cParts = csvName.split(/\s+/);
            if (jParts.length >= 2 && cParts.length >= 2) {
              const jFirst = jParts[0], jLast = jParts[jParts.length - 1];
              const cFirst = cParts[0], cLast = cParts[cParts.length - 1];
              if ((jFirst === cFirst && jLast === cLast) || (jFirst === cLast && jLast === cFirst)) return true;
            }
            return false;
          });
        }

        let enrichmentText = "";
        if (enrichmentIdx !== -1 && values[enrichmentIdx]) {
          enrichmentText = values[enrichmentIdx].trim();
        } else {
          const parts: string[] = [];
          for (let col = 0; col < values.length; col++) {
            if (keyIndices.has(col)) continue;
            const val = values[col]?.trim();
            if (!val) continue;
            const header = headers[col] || `field_${col}`;
            parts.push(`${header}: ${val}`);
          }
          enrichmentText = parts.join("\n") || values.join(", ");
        }

        if (matchedJuror) {
          matched.push({
            jurorNumber: matchedJuror.number,
            jurorName: matchedJuror.name,
            enrichmentText,
          });
        } else {
          const labelIdx = nameIdx !== -1 ? nameIdx : numberIdx;
          const label = values[labelIdx]?.trim() || `Row ${i}`;
          unmatched.push(label);
        }
      }

      const crypto = await import("crypto");
      for (const m of matched) {
        const enrichmentId = crypto.randomUUID();
        await storage.createJurorEnrichment({
          caseId,
          jurorNumber: m.jurorNumber,
          enrichmentId,
          status: "completed",
          rawRequest: { source: "manual_csv_import" },
          rawResponse: { text: m.enrichmentText },
          enrichedData: { text: m.enrichmentText, source: "manual_import" },
          createdAt: Date.now(),
          completedAt: Date.now(),
        });
      }

      res.json({
        success: true,
        matched: matched.length,
        unmatched: unmatched.length,
        unmatchedNames: unmatched,
        matchedJurors: matched.map(m => ({ number: m.jurorNumber, name: m.jurorName })),
      });
    } catch (err: any) {
      console.error("[ImportEnrichment] Error:", err);
      res.status(500).json({ message: err.message || "Failed to import enrichment data" });
    }
  });

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

  app.post("/api/cases/:caseId/responses", async (req, res) => {
    if (!(await verifyCaseOwnership(req, res))) return;
    const data = { ...req.body, caseId: req.params.caseId };
    const parsed = insertResponseSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const response = await storage.createResponse(parsed.data);
    res.status(201).json(response);
  });

  app.post("/api/responses/:id/follow-ups", async (req, res) => {
    const { question, answer } = req.body;
    if (!answer) return res.status(400).json({ message: "answer is required" });
    const updated = await storage.addFollowUpToResponse(req.params.id, { question: question || '', answer });
    if (!updated) return res.status(404).json({ message: "Response not found" });
    const c = await storage.getCase(updated.caseId);
    if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Response not found" });
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
      res.end(JSON.stringify({ jurors: allJurors }));
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
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }
      const result = await generateFullVoirDire(parsed.data.caseInfo, parsed.data.jurors);
      res.json(result);
    } catch (err: any) {
      console.error("Voir dire generation error:", err);
      res.status(500).json({ message: err.message || "Failed to generate voir dire" });
    }
  });

  app.post("/api/refine-questions", async (req, res) => {
    try {
      const parsed = z.object({
        rawQuestions: z.string().min(1),
        caseInfo: caseInfoSchema,
        jurors: z.array(jurorSummarySchema).default([]),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }
      const result = await refineUserQuestions(parsed.data.rawQuestions, parsed.data.caseInfo, parsed.data.jurors);
      res.json({ questions: result });
    } catch (err: any) {
      console.error("Question refinement error:", err);
      res.status(500).json({ message: err.message || "Failed to refine questions" });
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
          number: z.number(),
          name: z.string(),
          sex: z.string(),
          race: z.string(),
          birthDate: z.string(),
          occupation: z.string(),
          employer: z.string(),
          lean: z.string(),
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
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      let enrichedData: Record<string, any> | null = null;
      if (parsed.data.caseId) {
        try {
          const caseRecord = await storage.getCase(parsed.data.caseId);
          if (caseRecord && caseRecord.userId === req.user!.id) {
            const allEnriched = await getEnrichedDataForCase(parsed.data.caseId);
            enrichedData = allEnriched[parsed.data.juror.number] || null;
          }
        } catch (err) {
          console.error("[Enrichment] Failed to fetch enrichment data:", err);
        }
      }
      const analysis = await analyzeJuror(parsed.data.caseInfo, parsed.data.juror, parsed.data.responses, enrichedData);
      res.json({ analysis });
    } catch (err: any) {
      console.error("Juror analysis error:", err);
      res.status(500).json({ message: err.message || "Failed to analyze juror" });
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
          number: z.number(),
          name: z.string().default('Unknown'),
          sex: z.string().default('U'),
          race: z.string().default('U'),
          birthDate: z.string().default('Unknown'),
          occupation: z.string().default('Unknown'),
          employer: z.string().default('Unknown'),
          lean: z.string().default('unknown'),
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

      let enrichedDataMap: Record<number, Record<string, any>> = {};
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

      const BATCH_SIZE = 5;
      const summaries: Record<number, string> = {};
      const jurorsList = parsed.data.jurors;

      for (let i = 0; i < jurorsList.length; i += BATCH_SIZE) {
        const batch = jurorsList.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(j => generateBriefSummary(
            parsed.data.caseInfo,
            { number: j.number, name: j.name, sex: j.sex, race: j.race, birthDate: j.birthDate, occupation: j.occupation, employer: j.employer, lean: j.lean, riskTier: j.riskTier, notes: j.notes },
            j.responses,
            enrichedDataMap[j.number] || null
          ))
        );
        batch.forEach((j, idx) => { summaries[j.number] = results[idx]; });
      }

      res.json({ summaries });
    } catch (err: any) {
      console.error("Batch juror analysis error:", err);
      res.status(500).json({ message: err.message || "Failed to analyze jurors" });
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
      res.status(500).json({ message: err.message || "Failed to analyze strikes for cause" });
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
          riskTier: z.string().default('unassessed'),
          notes: z.string().optional().default(''),
          aiSummary: z.string().optional().default(''),
        })),
        yourStrikes: z.array(z.number()),
        theirStrikes: z.array(z.number()),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }

      const result = await analyzeBatson(parsed.data.caseInfo, parsed.data.jurors, parsed.data.yourStrikes, parsed.data.theirStrikes);
      res.json(result);
    } catch (err: any) {
      console.error("Batson analysis error:", err);
      res.status(500).json({ message: err.message || "Failed to analyze Batson challenge" });
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

  // --- AI Assistant Chat ---
  registerChatRoutes(app);

  return httpServer;
}
