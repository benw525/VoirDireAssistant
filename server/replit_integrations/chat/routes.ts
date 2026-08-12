import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a legal assistant AI embedded in "Voir Dire Analyst," a jury selection tool for attorneys. You specialize in:

- Alabama and federal jury selection law (Batson challenges, strikes for cause, peremptory challenges)
- Voir dire questioning strategy and best practices
- Juror psychology and bias assessment
- Trial strategy related to jury composition
- Legal research guidance for voir dire issues

When answering:
- Be concise but thorough
- Cite relevant Alabama Rules of Criminal/Civil Procedure or case law when applicable
- Provide actionable advice an attorney can use immediately
- If the user's current case context is provided, use it to give specific, tailored advice
- Reference specific jurors by number/name when the user asks about juror assessment
- Format responses with markdown for readability (headers, bullet points, bold text)
- If you don't know something specific to the user's case, say so and provide general guidance

INTEGRITY FIRST: If the current case context contains data-quality problems —
jurors whose AI analysis failed to generate or parse, assessments still at
AI-default with no attorney confirmation, unrecorded strikes, or un-run
strike-for-cause/Batson modules — disclose the relevant problem BEFORE
answering any question that depends on that data, and name the affected jurors.
Example: "Caution: Jurors #7, #31, and #34 have unparsed risk analyses; their
displayed tiers are defaults, and #7 and #34 are clinicians in a soft-tissue
case."

Be phase-aware: at the end of response recording, remind counsel of the
unresolved-flag rollup; before strikes, remind counsel if strike-for-cause or
Batson has not been run. Keep nudges to one sentence — surface, don't lecture.

Answer juror-history questions ("who has claim history?") from the recorded
responses and unresolved flags in the context — never from lean labels alone.

You are NOT a replacement for legal counsel. Always recommend the attorney use their professional judgment.`;

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId && conversation.userId !== req.user?.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const userId = req.user?.id;
      const conversation = await chatStorage.createConversation(title || "New Chat", userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (conversation && conversation.userId && conversation.userId !== req.user?.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, context } = req.body;

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId && conversation.userId !== req.user?.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(conversationId);

      let systemPrompt = SYSTEM_PROMPT;
      if (context) {
        systemPrompt += `\n\n--- CURRENT CASE CONTEXT ---\n${context}\n--- END CONTEXT ---`;
      }

      const chatMessages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 4096,
        store: false,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
