import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertJurorSchema, insertQuestionSchema, insertResponseSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { extractTextFromPdf, parseStrikeListWithAI, isAllowedFileType } from "./parseStrikeList";
import { generateFullVoirDire, refineUserQuestions } from "./generateVoirDire";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Cases ---
  app.get("/api/cases", async (_req, res) => {
    const cases = await storage.getCases();
    res.json(cases);
  });

  app.get("/api/cases/:id", async (req, res) => {
    const c = await storage.getCase(req.params.id);
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  });

  app.post("/api/cases", async (req, res) => {
    const parsed = insertCaseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const c = await storage.createCase(parsed.data);
    res.status(201).json(c);
  });

  app.patch("/api/cases/:id", async (req, res) => {
    const c = await storage.updateCase(req.params.id, req.body);
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  });

  app.delete("/api/cases/:id", async (req, res) => {
    await storage.deleteCase(req.params.id);
    res.status(204).send();
  });

  // --- Jurors ---
  app.get("/api/cases/:caseId/jurors", async (req, res) => {
    const jurors = await storage.getJurorsByCase(req.params.caseId);
    res.json(jurors);
  });

  app.post("/api/cases/:caseId/jurors", async (req, res) => {
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
    res.json(juror);
  });

  app.delete("/api/cases/:caseId/jurors", async (req, res) => {
    await storage.deleteJurorsByCase(req.params.caseId);
    res.status(204).send();
  });

  // --- Questions ---
  app.get("/api/cases/:caseId/questions", async (req, res) => {
    const questions = await storage.getQuestionsByCase(req.params.caseId);
    res.json(questions);
  });

  app.post("/api/cases/:caseId/questions", async (req, res) => {
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
    res.json(question);
  });

  app.delete("/api/cases/:caseId/questions", async (req, res) => {
    await storage.deleteQuestionsByCase(req.params.caseId);
    res.status(204).send();
  });

  // --- Responses ---
  app.get("/api/cases/:caseId/responses", async (req, res) => {
    const responses = await storage.getResponsesByCase(req.params.caseId);
    res.json(responses);
  });

  app.post("/api/cases/:caseId/responses", async (req, res) => {
    const data = { ...req.body, caseId: req.params.caseId };
    const parsed = insertResponseSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const response = await storage.createResponse(parsed.data);
    res.status(201).json(response);
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

  // --- Full case load (for resuming) ---
  app.get("/api/cases/:id/full", async (req, res) => {
    const c = await storage.getCase(req.params.id);
    if (!c) return res.status(404).json({ message: "Case not found" });
    const [jurors, questions, responses] = await Promise.all([
      storage.getJurorsByCase(c.id),
      storage.getQuestionsByCase(c.id),
      storage.getResponsesByCase(c.id),
    ]);
    res.json({ ...c, jurors, questions, responses });
  });

  return httpServer;
}
