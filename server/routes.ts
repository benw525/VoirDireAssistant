import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertJurorSchema, insertQuestionSchema, insertResponseSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { extractTextFromPdf, parseStrikeListWithAI, isAllowedFileType } from "./parseStrikeList";
import { generateFullVoirDire, refineUserQuestions } from "./generateVoirDire";
import { analyzeJuror, generateBriefSummary, analyzeStrikesForCause } from "./analyzeJuror";
import { authMiddleware, hashPassword, comparePassword, createToken } from "./auth";
import { loginToMattrMindr, verifyMattrMindrToken, fetchMattrMindrCases, fetchMattrMindrCase, pushJuryAnalysis } from "./mattrmindr";
import { registerChatRoutes } from "./replit_integrations/chat";
import { canCreateCase, getUserBillingInfo, createCheckoutSession, createPortalSession, handleWebhook } from "./billing";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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

  // --- All routes below require authentication ---
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
      const jurors = await storage.createJurors(items);
      res.status(201).json(jurors);
    } else {
      const data = { ...body, caseId };
      const parsed = insertJurorSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const juror = await storage.createJuror(parsed.data);
      res.status(201).json(juror);
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
    res.status(204).send();
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
  app.post("/api/parse-strike-list", upload.single("file"), async (req, res) => {
    try {
      let rawText = "";

      if (req.file) {
        if (!isAllowedFileType(req.file.mimetype, req.file.originalname)) {
          return res.status(400).json({ message: "Unsupported file type. Please upload a PDF, TXT, or CSV file." });
        }
        const mime = req.file.mimetype;
        if (mime === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf")) {
          rawText = await extractTextFromPdf(req.file.buffer);
        } else {
          rawText = req.file.buffer.toString("utf-8");
        }
      } else if (req.body.text) {
        rawText = req.body.text;
      } else {
        return res.status(400).json({ message: "No file or text provided" });
      }

      if (!rawText.trim()) {
        return res.status(400).json({ message: "The uploaded document appears to be empty or could not be read." });
      }

      const jurors = await parseStrikeListWithAI(rawText);
      res.json({ jurors });
    } catch (err: any) {
      console.error("Strike list parse error:", err);
      res.status(500).json({ message: err.message || "Failed to parse strike list" });
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
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
      }
      const analysis = await analyzeJuror(parsed.data.caseInfo, parsed.data.juror, parsed.data.responses);
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
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.issues.map(i => i.message).join(", ") });
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
            j.responses
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
    });
    res.json({ connected: false });
  });

  app.get("/api/mattrmindr/status", async (req, res) => {
    const user = await storage.getUserById(req.user!.id);
    if (!user?.mattrmindrUrl || !user?.mattrmindrToken) {
      return res.json({ connected: false });
    }

    const result = await verifyMattrMindrToken(user.mattrmindrUrl, user.mattrmindrToken);
    if (!result.valid) {
      await storage.updateUser(req.user!.id, { mattrmindrToken: null });
      return res.json({ connected: false, expired: true });
    }

    res.json({ connected: true, url: user.mattrmindrUrl, user: result.user });
  });

  app.get("/api/mattrmindr/cases", async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user?.mattrmindrUrl || !user?.mattrmindrToken) {
        return res.status(400).json({ message: "MattrMindr not connected" });
      }
      const cases = await fetchMattrMindrCases(user.mattrmindrUrl, user.mattrmindrToken, { name: user.name, email: user.email });
      res.json(cases);
    } catch (err: any) {
      if (err.status === 401) {
        await storage.updateUser(req.user!.id, { mattrmindrToken: null });
        return res.status(401).json({ message: "MattrMindr session expired. Please reconnect." });
      }
      res.status(500).json({ message: err.message || "Failed to fetch MattrMindr cases" });
    }
  });

  app.get("/api/mattrmindr/cases/:id", async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user?.mattrmindrUrl || !user?.mattrmindrToken) {
        return res.status(400).json({ message: "MattrMindr not connected" });
      }
      const caseDetail = await fetchMattrMindrCase(user.mattrmindrUrl, user.mattrmindrToken, req.params.id);
      res.json(caseDetail);
    } catch (err: any) {
      if (err.status === 401) {
        await storage.updateUser(req.user!.id, { mattrmindrToken: null });
        return res.status(401).json({ message: "MattrMindr session expired. Please reconnect." });
      }
      res.status(500).json({ message: err.message || "Failed to fetch case details" });
    }
  });

  app.post("/api/mattrmindr/cases/:id/jury-analysis", async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user?.mattrmindrUrl || !user?.mattrmindrToken) {
        return res.status(400).json({ message: "MattrMindr not connected" });
      }
      const result = await pushJuryAnalysis(user.mattrmindrUrl, user.mattrmindrToken, req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      if (err.status === 401) {
        await storage.updateUser(req.user!.id, { mattrmindrToken: null });
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
