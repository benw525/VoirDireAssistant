import { storage } from "./storage";
import crypto from "crypto";

const FLUX_API_URL = "https://api.fluxprompt.ai/flux/api-v2?flowId=a576a6c5-ad7e-4a92-89e0-628a21735432";
const FLUX_API_KEY = process.env.FLUX_API_KEY || "";
const JUROR_INPUT_ID = "varInputNode_1773346441251_0.9263";
const CALLBACK_INPUT_ID = "varInputNode_1773346442395_0.6514";
const WEBHOOK_SECRET = process.env.FLUX_WEBHOOK_SECRET || FLUX_API_KEY;

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return "http://localhost:5000";
}

function jurorToSingleColumnCsv(juror: {
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
  const rows = [
    `Number,${juror.number}`,
    `Name,${juror.name}`,
    `Phone,${juror.phone || "Unknown"}`,
    `Sex,${juror.sex}`,
    `Race,${juror.race}`,
    `BirthDate,${juror.birthDate}`,
    `Occupation,${juror.occupation}`,
    `Employer,${juror.employer}`,
    `Address,${juror.address || ""}`,
    `CityStateZip,${juror.cityStateZip || ""}`,
  ];
  return rows.join("\n");
}

export function verifyWebhookSecret(headerSecret: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return true;
  return headerSecret === WEBHOOK_SECRET;
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
      const csvData = jurorToSingleColumnCsv(juror);
      const callbackUrl = `${baseUrl}/api/webhooks/juror-enrichment/${enrichmentId}`;

      await storage.createJurorEnrichment({
        caseId,
        jurorNumber: juror.number,
        enrichmentId,
        status: "pending",
        rawRequest: { csv: csvData, callbackUrl },
        createdAt: Date.now(),
      });

      const response = await fetch(FLUX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": FLUX_API_KEY,
        },
        body: JSON.stringify({
          variableInputs: {
            [JUROR_INPUT_ID]: csvData,
            [CALLBACK_INPUT_ID]: callbackUrl,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        console.error(`[FluxEnrichment] API error for juror #${juror.number}: ${response.status} ${errText}`);
        await storage.updateJurorEnrichment(enrichmentId, {
          status: "failed",
          rawResponse: { error: errText, statusCode: response.status },
          completedAt: Date.now(),
        });
      } else {
        const responseData = await response.json().catch(() => ({}));
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
  const enrichment = await storage.getJurorEnrichmentById(enrichmentId);
  if (!enrichment) {
    return { success: false, message: "Enrichment record not found" };
  }

  if (enrichment.status === "completed") {
    return { success: true, message: "Already processed" };
  }

  const enrichedData = typeof payload === "object" ? payload : { raw: payload };

  await storage.updateJurorEnrichment(enrichmentId, {
    status: "completed",
    enrichedData,
    completedAt: Date.now(),
  });

  console.log(`[FluxEnrichment] Received enrichment data for juror #${enrichment.jurorNumber} (case: ${enrichment.caseId})`);

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
