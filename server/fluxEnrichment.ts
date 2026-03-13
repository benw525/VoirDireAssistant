import { storage } from "./storage";
import crypto from "crypto";

const FLUX_API_URL = "https://api.fluxprompt.ai/flux/api-v2?flowId=afef519e-acfd-4242-af29-89b6083c7353";
const RAW_FLUX_KEY = process.env.FLUX_API_KEY || "";
const FLUX_API_KEY = RAW_FLUX_KEY.startsWith("FLUX_API.") ? RAW_FLUX_KEY : `FLUX_API.${RAW_FLUX_KEY}`;
const JUROR_INPUT_ID = "varInputNode_1773346441251_0.9263";
const CALLBACK_INPUT_ID = "varInputNode_1773346442395_0.6514";
const WEBHOOK_SECRET = process.env.FLUX_WEBHOOK_SECRET || FLUX_API_KEY;

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
  // For "LastName FirstName MiddleName..." -> "FirstName MiddleName... LastName"
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
    // No secret configured — allow all requests
    return true;
  }
  if (!headerSecret) {
    // Secret is configured but header is missing — reject
    return false;
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

    try {
      const enrichmentId = crypto.randomUUID();
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
      });

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
        const responseData = JSON.parse(responseText || "{}");
        console.log(`[FluxEnrichment] Dispatched enrichment for juror #${juror.number} (enrichmentId: ${enrichmentId})`);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "dispatched",
          rawResponse: responseData,
        });
      }
    } catch (err: any) {
      console.error(`[FluxEnrichment] Failed to dispatch enrichment for juror #${juror.number}:`, err.message);
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