import { storage } from "./storage";
import crypto from "crypto";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar-pro";
const DELAY_BETWEEN_CALLS_MS = 1500;
const TIMEOUT_MS = 120_000;

function reformatName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  const lastName = parts[0];
  const rest = parts.slice(1).join(" ");
  return `${rest} ${lastName}`;
}

function buildSearchPrompt(juror: {
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
  const location = juror.cityStateZip || juror.address || "Unknown location";

  return `Search for information about the following person and provide a comprehensive background report. Return results in a structured format with the following categories:

**Person to search:**
- Name: ${name}
- Occupation: ${juror.occupation}
- Employer: ${juror.employer}
- Location: ${location}
- Date of Birth: ${juror.birthDate}
- Sex: ${juror.sex}

**Please provide information in these categories:**

1. **Education** - Any educational background, degrees, schools attended
2. **Employment History** - Current and past employment, professional roles, career history
3. **Legal Issues** - Any court records, lawsuits, legal proceedings, arrests, or legal matters
4. **Articles & Media** - Any news articles, media mentions, publications, or public appearances
5. **Social Media & Online Presence** - Any notable social media activity, posts, or online profiles
6. **Community Involvement** - Any volunteer work, organizations, boards, church involvement, or community roles
7. **Other Notable Information** - Any other publicly available information that may be relevant

For each category, if no information is found, explicitly state "No information found." Do not fabricate or assume any information. Only report what can be verified from public sources.

Format the response clearly with headers for each category.`;
}

const activeEnrichments = new Map<string, boolean>();

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
  if (!PERPLEXITY_API_KEY) {
    console.log("[PerplexityEnrichment] No PERPLEXITY_API_KEY configured, skipping enrichment");
    return;
  }

  const existingEnrichments = await storage.getJurorEnrichmentsByCase(caseId);
  const alreadyEnriched = new Set(
    existingEnrichments
      .filter(e => e.status === "pending" || e.status === "dispatched" || e.status === "completed")
      .map(e => e.jurorNumber)
  );

  const jurorsToEnrich = jurors.filter(j => !alreadyEnriched.has(j.number));
  if (jurorsToEnrich.length === 0) {
    console.log("[PerplexityEnrichment] All jurors already have enrichment records, skipping");
    return;
  }

  const enrichmentIds: string[] = [];
  for (const juror of jurorsToEnrich) {
    const enrichmentId = crypto.randomUUID();
    enrichmentIds.push(enrichmentId);
    await storage.createJurorEnrichment({
      caseId,
      jurorNumber: juror.number,
      enrichmentId,
      status: "pending",
      rawRequest: { prompt: buildSearchPrompt(juror), source: "perplexity_sonar_pro" },
      createdAt: Date.now(),
    });
  }

  activeEnrichments.set(caseId, true);

  (async () => {
    for (let i = 0; i < jurorsToEnrich.length; i++) {
      if (!activeEnrichments.get(caseId)) {
        console.log(`[PerplexityEnrichment] Enrichment cancelled for case ${caseId}, stopping`);
        break;
      }

      const juror = jurorsToEnrich[i];
      const enrichmentId = enrichmentIds[i];

      const currentEnrichment = await storage.getJurorEnrichmentById(enrichmentId);
      if (currentEnrichment?.status === "cancelled") {
        console.log(`[PerplexityEnrichment] Juror #${juror.number} was cancelled, skipping`);
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const prompt = buildSearchPrompt(juror);
        const name = reformatName(juror.name);
        console.log(`[PerplexityEnrichment] Searching for juror #${juror.number} (${name})...`);

        const response = await fetch(PERPLEXITY_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: PERPLEXITY_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a background research assistant for jury selection. Provide factual, verified information only from public sources. Never fabricate information. If you cannot find information in a category, say so explicitly.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          console.error(`[PerplexityEnrichment] API error for juror #${juror.number}: ${response.status} ${errorText}`);
          await storage.updateJurorEnrichment(enrichmentId, {
            status: "failed",
            rawResponse: { error: errorText, statusCode: response.status },
            completedAt: Date.now(),
          });
        } else {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const citations = data.citations || [];

          console.log(`[PerplexityEnrichment] Got response for juror #${juror.number} (${content.length} chars)`);

          await storage.updateJurorEnrichment(enrichmentId, {
            status: "completed",
            rawResponse: data,
            enrichedData: {
              text: content,
              citations,
              source: "perplexity_sonar_pro",
              model: PERPLEXITY_MODEL,
            },
            completedAt: Date.now(),
          });

          console.log(`[PerplexityEnrichment] Stored enrichment for juror #${juror.number}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === "AbortError") {
          console.error(`[PerplexityEnrichment] Timeout for juror #${juror.number} after ${TIMEOUT_MS / 1000}s`);
          await storage.updateJurorEnrichment(enrichmentId, {
            status: "failed",
            rawResponse: { error: "Request timed out", type: "timeout" },
            completedAt: Date.now(),
          }).catch(() => {});
        } else {
          console.error(`[PerplexityEnrichment] Error for juror #${juror.number}:`, err.message);
          await storage.updateJurorEnrichment(enrichmentId, {
            status: "failed",
            rawResponse: { error: err.message, type: "network" },
            completedAt: Date.now(),
          }).catch(() => {});
        }
      }

      if (i < jurorsToEnrich.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
      }
    }

    activeEnrichments.delete(caseId);
    console.log(`[PerplexityEnrichment] Enrichment complete for case ${caseId}`);
  })();
}

export function cancelEnrichmentForCase(caseId: string) {
  activeEnrichments.set(caseId, false);
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
