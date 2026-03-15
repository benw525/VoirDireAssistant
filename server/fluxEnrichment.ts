import { storage } from "./storage";
import crypto from "crypto";

const FLUX_API_BASE = "https://api.fluxprompt.ai/flux/api-v2";
const FLUX_FLOW_ID = "afef519e-acfd-4242-af29-89b6083c7353";
const FLUX_API_URL = `${FLUX_API_BASE}?flowId=${FLUX_FLOW_ID}`;
const FLUX_API_KEY = process.env.FLUXPROMPT_API_KEY || process.env.FLUX_API_KEY || "";
const JUROR_INPUT_ID = "varInputNode_1773346441251_0.9263";
const CALLBACK_INPUT_ID = "varInputNode_1773346442395_0.6514";
const WEBHOOK_SECRET = process.env.FLUX_WEBHOOK_SECRET || FLUX_API_KEY;

const TIMEOUT_MS = 600_000; // 10 minutes per FluxPrompt guidance

function extractResponseText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  if (d.data && typeof d.data === "object") {
    const inner = d.data as Record<string, unknown>;
    if (Array.isArray(inner.message) && inner.message.length > 0) {
      const first = inner.message[0] as Record<string, unknown>;
      if (typeof first.text === "string" && first.text) return first.text;
    }
  }

  for (const key of ["output", "result", "message", "text", "response", "content", "answer"]) {
    if (typeof d[key] === "string" && d[key]) return d[key] as string;
  }

  for (const key of ["data", "outputs", "choices", "results"]) {
    const nested = d[key];
    if (Array.isArray(nested) && nested.length > 0) {
      const item = nested[0] as Record<string, unknown>;
      for (const k of ["text", "content", "output", "result", "message"]) {
        if (typeof item[k] === "string" && item[k]) return item[k] as string;
      }
      if (item.message && typeof item.message === "object") {
        const msg = item.message as Record<string, unknown>;
        if (typeof msg.content === "string" && msg.content) return msg.content;
      }
    }
  }

  return null;
}

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return "http://localhost:5000";
}

function reformatName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  const lastName = parts[0];
  const rest = parts.slice(1).join(" ");
  return `${rest} ${lastName}`;
}

function formatJurorAsText(juror: {
  number: number;
  name: string;
  phone: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  address?: string;
  cityStateZip?: string;
}): string {
  const name = reformatName(juror.name);
  const lines = [
    `Name: ${name}`,
    `Phone: ${juror.phone || "Unknown"}`,
    `Sex: ${juror.sex}`,
    `Race: ${juror.race}`,
    `Date of Birth: ${juror.birthDate}`,
    `Occupation: ${juror.occupation}`,
    `Employer: ${juror.employer}`,
    `Address: ${juror.address || "Unknown"}`,
    `City/State/Zip: ${juror.cityStateZip || "Unknown"}`,
  ];
  return lines.join("\n");
}

export function verifyWebhookSecret(headerSecret: string | undefined): boolean {
  if (!WEBHOOK_SECRET) {
    return true;
  }
  if (!headerSecret) {
    return true;
  }
  const a = Buffer.from(headerSecret);
  const b = Buffer.from(WEBHOOK_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function triggerEnrichmentForJurors(
  caseId: string,
  jurors: Array<{
    number: number;
    name: string;
    phone: string;
    sex: string;
    race: string;
    birthDate: string;
    occupation: string;
    employer: string;
    address?: string;
    cityStateZip?: string;
  }>
): Promise<void> {
  if (!FLUX_API_KEY) {
    console.log("[FluxEnrichment] No FLUX_API_KEY configured, skipping enrichment");
    return;
  }

  const existingEnrichments = await storage.getJurorEnrichmentsByCase(caseId);
  const alreadyEnriched = new Set(
    existingEnrichments
      .filter(e => e.status === "dispatched" || e.status === "completed")
      .map(e => e.jurorNumber)
  );

  const baseUrl = getBaseUrl();

  for (const juror of jurors) {
    if (alreadyEnriched.has(juror.number)) {
      console.log(`[FluxEnrichment] Juror #${juror.number} already has active enrichment, skipping`);
      continue;
    }

    const enrichmentId = crypto.randomUUID();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const jurorText = formatJurorAsText(juror);
      const callbackUrl = `${baseUrl}/api/webhooks/juror-enrichment/${enrichmentId}`;

      await storage.createJurorEnrichment({
        caseId,
        jurorNumber: juror.number,
        enrichmentId,
        status: "pending",
        rawRequest: { text: jurorText, callbackUrl },
        createdAt: Date.now(),
      });

      const requestBody = JSON.stringify({
        variableInputs: [
          { inputId: JUROR_INPUT_ID, inputText: jurorText },
          { inputId: CALLBACK_INPUT_ID, inputText: callbackUrl },
        ],
      });
      console.log(`[FluxEnrichment] Sending to FluxPrompt for juror #${juror.number}:`);
      console.log(`[FluxEnrichment] URL: ${FLUX_API_URL}`);
      console.log(`[FluxEnrichment] Body: ${requestBody.substring(0, 500)}`);

      const response = await fetch(FLUX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": FLUX_API_KEY,
        },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text().catch(() => "");
      console.log(`[FluxEnrichment] API response for juror #${juror.number}: status=${response.status}, body=${responseText.substring(0, 500)}`);

      if (!response.ok) {
        console.error(`[FluxEnrichment] API error for juror #${juror.number}: ${response.status} ${responseText}`);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "failed",
          rawResponse: { error: responseText, statusCode: response.status },
          completedAt: Date.now(),
        });
      } else {
        let responseData: unknown = {};
        try {
          responseData = JSON.parse(responseText || "{}");
        } catch {
          console.warn(`[FluxEnrichment] Could not parse response JSON for juror #${juror.number}, raw: ${responseText.substring(0, 200)}`);
          responseData = { raw: responseText };
        }

        const extractedText = extractResponseText(responseData);
        if (extractedText) {
          console.log(`[FluxEnrichment] Extracted response text for juror #${juror.number}: ${extractedText.substring(0, 200)}`);
        }

        console.log(`[FluxEnrichment] Dispatched enrichment for juror #${juror.number} (enrichmentId: ${enrichmentId})`);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "dispatched",
          rawResponse: responseData as Record<string, unknown>,
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        console.error(`[FluxEnrichment] Request timed out after ${TIMEOUT_MS / 1000}s for juror #${juror.number}`);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "failed",
          rawResponse: { error: "Request timed out after 10 minutes", type: "timeout" },
          completedAt: Date.now(),
        }).catch(() => {});
      } else {
        console.error(`[FluxEnrichment] Failed to dispatch enrichment for juror #${juror.number}:`, err.message);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "failed",
          rawResponse: { error: err.message, type: "network" },
          completedAt: Date.now(),
        }).catch(() => {});
      }
    }
  }
}

export async function handleEnrichmentWebhook(
  enrichmentId: string,
  payload: any
): Promise<{ success: boolean; message: string }> {
  console.log(`[FluxEnrichment] Raw webhook payload for ${enrichmentId}:`, JSON.stringify(payload, null, 2));
  console.log(`[FluxEnrichment] Payload type: ${typeof payload}, keys: ${typeof payload === 'object' ? Object.keys(payload).join(', ') : 'N/A'}`);

  const enrichment = await storage.getJurorEnrichmentById(enrichmentId);
  if (!enrichment) {
    return { success: false, message: "Enrichment record not found" };
  }

  const incomingHasData = typeof payload === "object"
    ? (payload.text && payload.text.length > 0) || (Object.keys(payload).length > 1)
    : !!payload;

  if (!incomingHasData) {
    console.log(`[FluxEnrichment] Empty callback for ${enrichmentId} (juror #${enrichment.jurorNumber}) — ignoring, waiting for real data`);
    return { success: true, message: "Empty callback acknowledged, waiting for enrichment data" };
  }

  if (enrichment.status === "completed") {
    const existingData = enrichment.enrichedData as any;
    const hasRealData = existingData && existingData.text && existingData.text.length > 0;
    if (hasRealData) {
      return { success: true, message: "Already processed" };
    }
    console.log(`[FluxEnrichment] Updating ${enrichmentId} with non-empty data (overwriting previous empty callback)`);
  }

  const enrichedData = typeof payload === "object" ? payload : { raw: payload };

  await storage.updateJurorEnrichment(enrichmentId, {
    status: "completed",
    enrichedData,
    completedAt: Date.now(),
  });

  console.log(`[FluxEnrichment] Received REAL enrichment data for juror #${enrichment.jurorNumber} (case: ${enrichment.caseId})`);

  return { success: true, message: "Enrichment data stored" };
}

export async function getEnrichedDataForJuror(
  caseId: string,
  jurorNumber: number
): Promise<Record<string, any> | null> {
  const enrichments = await storage.getJurorEnrichmentsByCase(caseId);
  const completed = enrichments.find(
    e => e.jurorNumber === jurorNumber && e.status === "completed" && e.enrichedData
  );
  return completed?.enrichedData || null;
}

export async function getEnrichedDataForCase(
  caseId: string
): Promise<Record<number, Record<string, any>>> {
  const enrichments = await storage.getJurorEnrichmentsByCase(caseId);
  const result: Record<number, Record<string, any>> = {};
  for (const e of enrichments) {
    if (e.status === "completed" && e.enrichedData) {
      result[e.jurorNumber] = e.enrichedData;
    }
  }
  return result;
}
