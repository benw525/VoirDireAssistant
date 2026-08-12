import { z } from "zod";
import { getArchetypesAndBias } from "./strategyModules";
import { AIOutputError, claudeComplete, claudeJson, CLAUDE_OPUS, CLAUDE_SONNET } from "./anthropic";
import { computeBatsonStats, formatBatsonStatsBlock } from "./batsonStats";
import { chunkBalanced } from "./aiBatch";
import { isThinRecord } from "./analysisInputs";
import { findDemographicRationale } from "./demographicRationale";

/**
 * Appended to the user prompt on the single retry after a parse/validation
 * failure. Per the Lewis/Whigham directives: retry once with an explicit
 * "return complete, valid JSON only" instruction, then fail loudly.
 */
const JSON_RETRY_SUFFIX = `

IMPORTANT: Your previous response was not complete, valid JSON matching the required format. Return complete, valid JSON only — a single JSON value with every required field present, fully closed (no truncation), with no prose, no markdown, and no code fences.`;

export interface CaseContext {
  name: string;
  areaOfLaw: string;
  summary: string;
  side: string;
  favorableTraits: string[];
  riskTraits: string[];
}

export interface JurorData {
  number: number;
  name: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  lean: string;
  riskTier: string;
  notes: string;
}

export interface ResponseData {
  questionText: string | null;
  questionSummary: string | null;
  responseText: string;
  side: string;
  followUps: Array<{ question: string; answer: string }>;
}

/**
 * Shared case-context block. It is identical across every per-juror /
 * per-chunk call for a case, so it is passed as `cacheableContext` (prompt
 * caching, Section 9) instead of being embedded in each user prompt.
 */
function caseContextBlock(caseContext: CaseContext): string {
  return `CASE CONTEXT:
Case: ${caseContext.name}
Area of Law: ${caseContext.areaOfLaw}
Summary: ${caseContext.summary}
Representing: ${caseContext.side}
Favorable Traits: ${caseContext.favorableTraits.join(', ') || 'None specified'}
Risk Traits: ${caseContext.riskTraits.join(', ') || 'None specified'}`;
}

/**
 * Appended to the system prompt for thin-record jurors (fewer than 2-3
 * substantive responses, no notes, no verified background — see
 * isThinRecord). These jurors run on the fast model with a short template;
 * the JSON contract is unchanged.
 */
const THIN_RECORD_MODE = `THIN RECORD MODE: This juror's record is minimal — fewer than 2-3 substantive
responses and no attorney notes or verified background findings. Use the short
template. If the record contains an explicit statement of position or
inability (signal weight 1), score it on the merits like any other record.
Otherwise the tier must still discriminate: with NO risk-adjacent signal at
all, anchor riskScore in the 35-45 band and set aiRiskTier "low"; with an
unresolved risk-adjacent signal (e.g. a hand raise on a claimant-history
question that was never followed up), anchor near 50 and set aiRiskTier
"medium". Either way set informationLevel "minimal" (or "partial"),
provisional=true, and put the ONE question that would most change the score
in keyFollowUp. The analysis MUST be under 120 words — AT MOST 4 sentences:
the anchor, the single most relevant occupational or profile note if any, and
the strategic posture. No speculation beyond the record.`;

const SYSTEM_PROMPT = `You are a Juror Risk Assessment Analyst — an expert legal strategist who evaluates individual jurors for trial attorneys during jury selection.

You will receive:
1. Case context (area of law, case summary, which side the attorney represents, favorable/risk traits)
2. A single juror's demographic profile
3. All recorded responses from that juror during voir dire (from both sides' examinations, including follow-up exchanges)
4. The juror's current lean assessment and risk tier as set by the attorney
5. Any attorney notes on the juror

You MUST respond with valid JSON in this exact format:
{
  "riskScore": <number 1-100>,
  "aiRiskTier": "low" | "medium" | "high",
  "suggestedLean": "favorable" | "neutral" | "unfavorable" | "unknown",
  "leanConfidence": "high" | "moderate" | "low",
  "informationLevel": "well-developed" | "partial" | "minimal",
  "provisional": <boolean — true when the record is too thin for a settled score>,
  "keyFollowUp": "<when provisional: the ONE follow-up question that would most change the score; otherwise empty string>",
  "damagesAnchor": "<when liability is conceded or weak: the damages-anchor assessment described below; otherwise empty string>",
  "analysis": "<your analysis as a single string — length proportional to signal>"
}

RISK SCORE (1-100): Assign a numeric risk score reflecting how dangerous this juror is to the attorney's case. 1 = ideal juror, 100 = worst possible juror.

CASE-POSTURE CONDITIONING: Before weighting any occupational or experiential
trait, determine which side owns the objective evidence. If the defense theory
rests on documentation, physics, or imaging chronology (disputed impact, EDR
data, pre-existing findings), records-literate and analytically trained jurors —
including medical-records, pharmacy, compliance, and claims personnel — are
neutral-to-favorable for the defense, not adverse. If liability is conceded and
the fight is subjective injury and damages, clinical and caregiving jurors who
professionally credit self-reported pain (treating clinicians, therapists,
home-health, mental-health) are strongly adverse, and their influence multiplies
because they become the room's unsworn medical expert. Never apply a flat
"medical field = plaintiff-leaning" rule.

SIGNAL WEIGHTING (strongest to weakest):
(1) the juror's own explicit statements of position or inability;
(2) active claims, open litigation, or unresolved grievances (including barred
    claims);
(3) claimant history weighted by recency and resemblance to the case fact
    pattern (a low-speed rear-end injury in a low-speed rear-end case outweighs
    a generic prior claim);
(4) occupations whose daily FUNCTION is advocacy or crediting self-report
    (caseworker, outreach nurse, case manager) — weight the job's function, not
    its industry;
(5) generic occupation categories;
(6) demographics — near-zero predictive weight, and they MUST NEVER appear as a
    stated risk rationale.
A settled prior claim accompanied by an unequivocal denial of bias is a
peremptory consideration to note, not a dominant risk driver.

SEPARATE ADVERSITY FROM UNCERTAINTY: Output two distinct measures —
riskScore (0-100, driven ONLY by affirmative evidence; if no substantive
responses exist, anchor near 50 and say so) and informationLevel
("well-developed" | "partial" | "minimal"). Never let missing information
inflate riskScore. A silent juror and a juror with adverse admissions must not
share a score band; if the record is minimal, state that the score is
provisional and name the ONE follow-up question that would most change it.

PROHIBITED RATIONALES: Never cite race, sex, age, or their statistical
correlation with verdicts as a reason for any risk classification or strike
recommendation. These rationales are legally impermissible under Batson/J.E.B.,
discoverable in work product, and empirically weak. Express every risk driver
as a record-based, demographic-neutral fact (occupation function, stated
experience, specific response).

DAMAGES ANCHOR (when liability is conceded or weak): Include a damagesAnchor
assessment — is this juror likely to treat claimed specials as a floor, a
ceiling, or a reference point? Note occupational and experiential anchors
(hourly wage-earners and claims-adjacent jurors anchor low; repeat claimants
and clinicians anchor high). State whether this juror could sign a defense
verdict or a bills-only award if causation fails.

ENRICHMENT NULLS: If background research returned no verified match, state
that in ONE sentence and move on. Do not narrate per-category nulls, and do
not characterize an absence of records as reassuring — for common names and
younger jurors it is simply the absence of data.

AI RISK TIER: Based on your score, assign "high" (score 70-100), "medium" (score 35-69), or "low" (score 1-34).

SUGGESTED LEAN: Based on all available evidence, recommend whether this juror leans "favorable" (good for the attorney's case), "unfavorable" (bad for the attorney's case), "neutral" (genuinely mixed signals or ambiguous), or "unknown" (insufficient information to classify). Do NOT force a binary favorable/unfavorable classification when the evidence is ambiguous — use "neutral" when signals genuinely cut both ways. Use "unknown" only when the juror has barely spoken and demographics alone are insufficient.

LEAN CONFIDENCE: Rate your confidence in the suggested lean: "high" (strong, consistent signals — clear responses, corroborating background data), "moderate" (some evidence but mixed or limited), or "low" (very little evidence, mostly occupational inference).

INFORMATION LEVEL: "well-developed" (substantive responses on case-relevant topics), "partial" (some responses but key topics undeveloped), "minimal" (silent or near-silent record). Report it as this structured field — never as an opening caveat paragraph.

PROVISIONAL + KEY FOLLOW-UP: When informationLevel is "minimal" (and usually "partial"), set provisional=true and put the ONE question that would most change the score in keyFollowUp. When the record is well-developed, set provisional=false and keyFollowUp to "".

ANALYSIS: Produce a strategic analysis covering, in order:
- RISK ASSESSMENT — Why this juror received this risk score, citing the strongest signals first per the SIGNAL WEIGHTING hierarchy. If the attorney's current tier disagrees with yours, explain the discrepancy.
- KEY CONCERNS — The most important things the attorney should know. Flag responses suggesting bias, strong feelings, or potential cause challenges.
- STRATEGIC RECOMMENDATION — Keep, strike for cause (with basis), or use peremptory strike. Explain reasoning.

NO BOILERPLATE: Do not restate case facts the attorney already knows; reference
a case fact only when tied to a specific juror signal. Do not open with
data-limitation caveats — report informationLevel as a structured field and
move on. Do not narrate what is absent (no enrichment, no responses) beyond one
clause. Every sentence must contain juror-specific information or an actionable
recommendation. If the record is thin, the analysis should be SHORT — three
sentences, not five paragraphs of hedged inference. Length must be proportional
to signal, not fixed. HARD CAP for minimal-information records (no responses,
no verified background): at most 4 sentences total. State the anchor, the one
occupational or profile note if any, and stop — the keyFollowUp field carries
the next step, not the prose.

Rules:
- Be direct and practical — this is a working tool for a trial attorney
- Reference specific responses by quoting them when relevant
- Consider how the juror's occupation FUNCTION, background, and responses interact with the case posture
- Avoid strong keep/strike recommendations for jurors with minimal response records; mark leanConfidence "low" and provisional=true instead of hedging in prose
- Do not use headers, bullet points, or markdown formatting in the analysis — write in flowing prose
- Always frame analysis from the perspective of the attorney's side
- If enriched background data contains verified findings, reference at least one in your analysis; if it returned no verified match, apply the ENRICHMENT NULLS rule (one sentence, no reassurance)
- NON-VERBAL REACTIONS: Responses prefixed with [Hand], [Nod], [Shake], or [Note] are non-verbal behavioral observations. A hand raise on a sensitive question (e.g., "Has anyone been a victim of a crime?") is meaningful data. Head nods and shakes indicate agreement or disagreement. Reference specific reactions by question when they reveal bias, sympathy, or concern.
- SILENCE RECORDS: Responses marked "[Silent] No response" indicate the juror was explicitly asked and chose not to respond. Deliberate silence on a specific question can be as telling as a verbal answer — consider what the question was and whether non-response suggests discomfort, disengagement, or caution.`;

const BRIEF_SUMMARY_PROMPT = `You are a Juror Risk Assessment Analyst. Given case context and a juror's profile with their voir dire responses, produce the summary below. Write from the attorney's perspective. No headers, no bullet points.

Write EXACTLY two sentences and finish them. Sentence one: the strongest
record-based signal driving the classification (quote or paraphrase a specific
response where one exists). Sentence two: the single most important unresolved
item, or the strategic posture (keep / develop / peremptory candidate). Never
end mid-thought; if space is tight, cut detail, not the conclusion.

If the juror gave any substantive response or meaningful hand raise, it takes
priority over occupational inference. Occupation-only summaries are acceptable
solely for silent jurors, and must say the record is undeveloped.

Never cite race, sex, age, or demographic-statistical verdict patterns as a
reason for a classification.

NO BOILERPLATE: Do not restate case facts the attorney already knows. If enriched background data contains a verified finding relevant to the classification, it may supply sentence one's signal; if research returned nothing verified, do not narrate that beyond one clause.`;

export async function generateBriefSummary(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[],
  enrichedData?: Record<string, any> | null
): Promise<string> {
  const responsesText = responses.length > 0
    ? responses.map((r, i) => {
        const questionLabel = r.side === 'court'
          ? `Court asked: "${r.questionSummary || 'Unknown'}"`
          : r.side === 'opposing'
          ? `Opposing: "${r.questionSummary || 'Unknown'}"`
          : r.questionText
            ? `Your Q: "${r.questionText}"`
            : r.questionSummary
              ? `New Q: "${r.questionSummary}"`
              : 'Unknown question';
        let text = `${i + 1}. ${questionLabel} → "${r.responseText}"`;
        if (r.followUps && r.followUps.length > 0) {
          r.followUps.forEach(fu => {
            text += ` | Follow-up: "${fu.question}" → "${fu.answer}"`;
          });
        }
        return text;
      }).join('\n')
    : 'No responses recorded.';

  let enrichmentSection = '';
  let enrichedText = '';
  if (enrichedData && Object.keys(enrichedData).length > 0) {
    enrichedText = enrichedData.text || JSON.stringify(enrichedData);
    enrichmentSection = `\nEnriched background data: ${enrichedText}\n`;
  }

  const thin = isThinRecord({ responses, notes: juror.notes, enrichedText });

  const userPrompt = `Juror #${juror.number}: ${juror.name}, ${juror.occupation} (${juror.sex}/${juror.race}, DOB: ${juror.birthDate})
Lean: ${juror.lean} | Risk: ${juror.riskTier}
Notes: ${juror.notes || 'None'}
${enrichmentSection}
Responses:
${responsesText}

Write the two-sentence summary (exactly two complete sentences).`;

  const attemptSummary = async (suffix: string): Promise<string> => (await claudeComplete({
    model: thin ? CLAUDE_SONNET : CLAUDE_OPUS,
    system: BRIEF_SUMMARY_PROMPT,
    cacheableContext: caseContextBlock(caseContext),
    userPrompt: userPrompt + suffix,
    temperature: 0.3,
    maxTokens: 300,
  })).trim();

  // Fail-loud: the two-sentence contract is validated, not just prompted.
  // Retry once with a targeted correction, then throw — never return
  // truncated or run-on text that could be mistaken for a compliant summary.
  const summaryProblem = (text: string): string | null => {
    if (!text) return "response was empty";
    const n = countSentences(text);
    if (n !== 2) return `response contained ${n} sentence(s) instead of exactly two`;
    if (!/[.!?]["'”’)\]]*$/.test(text)) return "response did not end with terminal punctuation (incomplete final sentence)";
    return null;
  };

  let text = await attemptSummary("");
  let problem = summaryProblem(text);
  if (problem) {
    console.warn(`[generateBriefSummary] Juror #${juror.number}: ${problem}; retrying once`);
    text = await attemptSummary(`\n\nIMPORTANT: Your previous ${problem}. Return EXACTLY two complete sentences — finish both and end with a period.`);
    problem = summaryProblem(text);
  }
  if (problem) {
    throw new AIOutputError(`Summary generation for Juror #${juror.number} (${juror.name}) failed the two-sentence contract after a retry (${problem}). Re-run summary generation for this juror.`);
  }

  return text;
}

/**
 * Sentence counter for the exact-two-sentence summary contract. Normalizes
 * legal-text period noise (multi-initial citations like J.E.B., honorifics
 * like Dr./Mr., "v."/"vs.", and decimals like 11,542.50) before counting
 * terminal punctuation. Exported for tests.
 */
export function countSentences(text: string): number {
  const normalized = text
    .replace(/\b(?:[A-Z]\.){2,}/g, m => m.replace(/\./g, ""))
    .replace(/\b(Dr|Mr|Mrs|Ms|Jr|Sr|vs|v|No|Nos|approx|etc|Inc|Co|St|Ph\.D)\./g, "$1")
    .replace(/(\d)\.(\d)/g, "$1$2");
  return (normalized.match(/[.!?]+["'”’)\]]*(\s|$)/g) || []).length;
}

/**
 * Conditional output-contract checks that zod defaults cannot express:
 * a "minimal" record must be provisional, and a provisional score must name
 * the ONE follow-up question that would settle it. Exported for tests.
 */
export function analysisContractViolations(r: {
  informationLevel: "well-developed" | "partial" | "minimal";
  provisional: boolean;
  keyFollowUp: string;
}): string[] {
  const v: string[] = [];
  if (r.informationLevel === "minimal" && !r.provisional) {
    v.push('informationLevel "minimal" requires provisional=true');
  }
  if (r.provisional && r.keyFollowUp.trim().length === 0) {
    v.push("provisional=true requires a non-empty keyFollowUp question");
  }
  return v;
}

export interface AnalysisResult {
  analysis: string;
  riskScore: number;
  aiRiskTier: 'low' | 'medium' | 'high';
  suggestedLean: 'favorable' | 'neutral' | 'unfavorable' | 'unknown';
  leanConfidence: 'high' | 'moderate' | 'low';
  informationLevel: 'well-developed' | 'partial' | 'minimal';
  provisional: boolean;
  keyFollowUp: string;
  damagesAnchor: string;
  /** Which model tier produced this analysis: 'fast' = thin-record template model, 'full' = full model. */
  modelTier: 'full' | 'fast';
}

export async function analyzeJuror(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[],
  enrichedData?: Record<string, any> | null
): Promise<AnalysisResult> {
  const reactionResponses = responses.filter(r => r.responseText.startsWith('['));
  const verbalResponses = responses.filter(r => !r.responseText.startsWith('['));
  const totalChars = responses.reduce((sum, r) => sum + r.responseText.length, 0);

  const formatResponse = (r: ResponseData, i: number) => {
    const questionLabel = r.side === 'court'
      ? `Court asked: "${r.questionSummary || 'Unknown question'}"`
      : r.side === 'opposing'
      ? `Opposing counsel asked: "${r.questionSummary || 'Unknown question'}"`
      : r.questionText
        ? `Your question: "${r.questionText}"`
        : r.questionSummary
          ? `New question: "${r.questionSummary}"`
          : 'Unknown question';

    let text = `${i + 1}. ${questionLabel}\n   Response: "${r.responseText}"`;

    if (r.followUps && r.followUps.length > 0) {
      r.followUps.forEach(fu => {
        text += `\n   Follow-up: "${fu.question}" → "${fu.answer}"`;
      });
    }

    return text;
  };

  let responsesText: string;
  if (responses.length === 0) {
    responsesText = 'No responses recorded for this juror.';
  } else {
    const sections: string[] = [];
    if (verbalResponses.length > 0) {
      sections.push('VERBAL RESPONSES:\n' + verbalResponses.map((r, i) => formatResponse(r, i + 1)).join('\n\n'));
    }
    if (reactionResponses.length > 0) {
      sections.push('NON-VERBAL REACTIONS (observed during questioning — treat as behavioral signals):\n' + reactionResponses.map((r, i) => {
        const questionLabel = r.side === 'court'
          ? `Court asked: "${r.questionSummary || 'Unknown question'}"`
          : r.side === 'opposing'
          ? `Opposing: "${r.questionSummary || 'Unknown question'}"`
          : r.questionText
            ? `Your Q: "${r.questionText}"`
            : r.questionSummary
              ? `Q: "${r.questionSummary}"`
              : 'Unknown question';
        return `${i + 1}. ${questionLabel} → ${r.responseText}`;
      }).join('\n'));
    }
    if (verbalResponses.length === 0 && reactionResponses.length > 0) {
      sections.push('\nNote: This juror has ONLY non-verbal reactions and no recorded verbal testimony. Non-verbal signals (hand raises, nods, head shakes) are meaningful behavioral data — a juror who raised their hand on a sensitive question has revealed something important even without speaking.');
    }
    responsesText = sections.join('\n\n');
  }

  const dataSufficiency = responses.length < 2 || (verbalResponses.length === 0 && totalChars < 150)
    ? `\nDATA SUFFICIENCY NOTE: This juror has limited response data (${verbalResponses.length} verbal responses, ${reactionResponses.length} reactions, ${totalChars} total characters). Report this via informationLevel/provisional/keyFollowUp — do NOT open the analysis with a limitation caveat, do NOT let the thin record inflate riskScore (anchor near 50 absent affirmative evidence), and keep the analysis short.\n`
    : '';

  let enrichmentSection = '';
  let enrichedText = '';
  if (enrichedData && Object.keys(enrichedData).length > 0) {
    enrichedText = enrichedData.text || JSON.stringify(enrichedData, null, 2);
    enrichmentSection = `\nENRICHED BACKGROUND DATA (from public records / data services):\n${enrichedText}\n`;
  }

  // Model tiering (Section 9): thin records go to the fast model with the
  // short-template directive; real signal gets the full model. The tier is
  // recomputed on every run, so a thin juror auto-upgrades the next time it
  // is analyzed after its record grows (the input hash changing is what
  // triggers that re-run).
  const thin = isThinRecord({ responses, notes: juror.notes, enrichedText });

  const archetypesText = getArchetypesAndBias(caseContext.areaOfLaw);
  const systemPromptWithContext = SYSTEM_PROMPT + '\n\n' + archetypesText + (thin ? '\n\n' + THIN_RECORD_MODE : '');

  const userPrompt = `JUROR PROFILE:
Juror #${juror.number}: ${juror.name}
Sex: ${juror.sex} | Race: ${juror.race} | DOB: ${juror.birthDate}
Occupation: ${juror.occupation} | Employer: ${juror.employer}
Current Lean: ${juror.lean}
Current Risk Tier: ${juror.riskTier}
Attorney Notes: ${juror.notes || 'None'}
${enrichmentSection}

RECORDED RESPONSES:
${responsesText}
${dataSufficiency}
Provide your risk assessment analysis for this juror.`;

  const jurorAnalysisSchema = z.object({
    // Out-of-range scores indicate malformed output — retry/fail rather than clamp.
    riskScore: z.number().finite().min(1).max(100),
    aiRiskTier: z.enum(["low", "medium", "high"]),
    suggestedLean: z.enum(["favorable", "neutral", "unfavorable", "unknown"]),
    leanConfidence: z.enum(["high", "moderate", "low"]),
    informationLevel: z.enum(["well-developed", "partial", "minimal"]),
    provisional: z.boolean(),
    keyFollowUp: z.string().default(""),
    damagesAnchor: z.string().default(""),
    analysis: z.string().min(20),
  });

  const attempt = async (suffix: string) => {
    const { raw, parsed } = await claudeJson<unknown>({
      model: thin ? CLAUDE_SONNET : CLAUDE_OPUS,
      system: systemPromptWithContext,
      cacheableContext: caseContextBlock(caseContext),
      userPrompt: userPrompt + suffix,
      temperature: 0.4,
      // The fast-tier win is the MODEL (sonnet latency/cost), not a tight
      // output cap: 5-series models spend part of max_tokens on internal
      // reasoning before the visible text (observed: a thin-record response
      // truncated at max_tokens=2400 with only ~300 tokens of JSON emitted),
      // and a mid-JSON truncation reads as a parse failure. Thin records
      // provoke MORE reasoning, not less — give the fast tier extra headroom.
      maxTokens: thin ? 4000 : 2400,
    });
    if (parsed === null) {
      // Log the head of the raw output so a parse failure is diagnosable
      // (truncation vs preamble vs malformed JSON) without re-running.
      console.error(`[analyzeJuror] Juror #${juror.number}: unparseable output (${raw.length} chars), head: ${JSON.stringify(raw.slice(0, 160))}`);
      return null;
    }
    const validated = jurorAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(`[analyzeJuror] Juror #${juror.number}: output failed validation: ${validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return null;
    }
    return validated.data;
  };

  // Fail-loud contract (Lewis/Whigham directives): validate, retry once with
  // an explicit complete-JSON instruction, then throw. NEVER return default
  // values (50/medium/unknown) — that is exactly how two high-risk Whigham
  // jurors were buried in the strike order and ended up deliberating.
  // Conditional contract (provisional/keyFollowUp coupling) is validated
  // post-parse: a zod default must never swallow a missing required-when
  // field.
  let result = await attempt("");
  let violations = result ? analysisContractViolations(result) : [];
  if (!result || violations.length > 0) {
    const suffix = !result
      ? JSON_RETRY_SUFFIX
      : `\n\nIMPORTANT: Your previous response violated the output contract: ${violations.join("; ")}. Return the complete corrected JSON now — when the record is too thin for a settled score, provisional must be true and keyFollowUp must contain the ONE question that would most change the score.`;
    console.warn(`[analyzeJuror] Juror #${juror.number}: ${!result ? 'invalid output' : `contract violation (${violations.join('; ')})`} on first attempt, retrying once`);
    result = await attempt(suffix);
    violations = result ? analysisContractViolations(result) : [];
  }
  if (!result) {
    throw new AIOutputError(`Analysis for Juror #${juror.number} (${juror.name}) was invalid or incomplete after a retry. No default score was applied — regenerate this analysis before relying on any ranking.`);
  }
  if (violations.length > 0) {
    throw new AIOutputError(`Analysis for Juror #${juror.number} (${juror.name}) violated the output contract after a retry (${violations.join("; ")}). No defaults were applied — regenerate this analysis before relying on it.`);
  }

  return {
    analysis: result.analysis,
    riskScore: Math.max(1, Math.min(100, Math.round(result.riskScore))),
    aiRiskTier: result.aiRiskTier,
    suggestedLean: result.suggestedLean,
    leanConfidence: result.leanConfidence,
    informationLevel: result.informationLevel,
    provisional: result.provisional,
    keyFollowUp: result.keyFollowUp,
    damagesAnchor: result.damagesAnchor,
    modelTier: thin ? 'fast' : 'full',
  };
}

export interface StrikeForCauseEntry {
  jurorNumber: number;
  category: "Highly Likely" | "Possible" | "Unlikely";
  reasoning: string;
  argument: string;
  basis: string;
  // 1-2 open-court questions that cement the disqualifying answer before
  // rehabilitation (REQUIRED for "Possible"; empty for "Unlikely").
  lockInQuestions: string[];
}

/**
 * Juror numbers of "Possible" cause entries that lack at least one non-empty
 * lock-in question. Such entries are invalid AI output: without lock-ins the
 * attorney walks into rehabilitation with nothing on the record (the exact
 * failure that seated a witness's former patient in Whigham). Exported for
 * tests.
 */
export function possiblesMissingLockIns(
  entries: Array<Pick<StrikeForCauseEntry, "jurorNumber" | "category" | "lockInQuestions">>,
): number[] {
  return entries
    .filter(e => e.category === "Possible" && (e.lockInQuestions ?? []).filter(q => q.trim().length > 0).length === 0)
    .map(e => e.jurorNumber);
}

interface JurorWithResponses extends JurorData {
  responses: ResponseData[];
}

const STRIKE_FOR_CAUSE_PROMPT = `You are a Strike-for-Cause Analyst — an expert trial attorney and legal strategist who evaluates every juror in the venire for potential strikes for cause during jury selection.

You will receive:
1. Case context (area of law, case summary, which side the attorney represents, favorable/risk traits)
2. A list of all jurors with their demographic profiles, recorded voir dire responses, current lean assessments, risk tiers, and attorney notes

Your job is to evaluate EVERY juror and determine whether a viable argument exists to strike them for cause. For each juror, you must assess:

- Stated biases or prejudices relevant to the case
- Relationships or connections to parties, witnesses, attorneys, or law enforcement
- Inability or unwillingness to follow the law as instructed by the judge
- Fixed opinions on guilt, liability, or the outcome before hearing evidence
- Prior experiences (victim of similar crime, prior lawsuits, etc.) that would prevent impartiality
- Hardship claims that could affect attention or fairness
- Responses indicating prejudgment or inability to be fair to both sides
- Any statements suggesting the juror cannot set aside personal feelings

For each juror, categorize them as:
- "Highly Likely" — Strong, articulable grounds exist. The juror made statements or has connections that clearly demonstrate bias or inability to be impartial. A judge would likely grant this challenge.
- "Possible" — Some concerning indicators exist. The juror's responses or background raise questions about impartiality, but the grounds may need further development or rehabilitation might cure the issue.
- "Unlikely" — No significant cause basis identified. The juror appears capable of being fair and impartial based on available information.

LEGAL SUFFICIENCY GATE: Every category assignment must pass the question "would
a judge actually grant this challenge on this record?" — not "is this juror
strategically concerning?". Keep legal cause and strategic concern separate:
strategic concerns (sympathetic occupation, general attitudes, thin records)
belong in the reasoning as peremptory considerations, never as the basis for
"Highly Likely". Hardship (work, childcare, health inconvenience) is a matter
for the court's discretion, not a party's cause challenge — do not classify
hardship-only jurors above "Unlikely" unless the hardship demonstrably prevents
attention or fairness.

GRANTABILITY ANCHORS (Alabama civil practice):
GRANTABLE — explicit statements of fixed opinion or inability to be fair that
survive rehabilitation; disqualifying relationships to parties, counsel, or
witnesses; a live personal stake in the same kind of dispute (e.g., an active
injury claim as plaintiff, or a current client relationship with a party's law
firm).
NOT GRANTABLE STANDING ALONE — a medical diagnosis the juror shares with a
party; a prior resolved claim or lawsuit accompanied by a denial of bias;
employment in healthcare or any occupation; general sympathy inferences.
Classify those as Unlikely for cause and note the peremptory concern in the
reasoning instead.

DIRECTION MATTERS: Before recommending a cause challenge, state WHOSE case the
bias damages. A juror biased toward your side is opposing counsel's cause
material — your options are quiet rehabilitation or silence, never your own
challenge. If a record contains statements cutting both directions, list them
in two columns, identify which side has the stronger cause argument, and advise
accordingly (including the risk that opposing counsel removes the juror for
free).

REHABILITATION: Treat a bare nod to a leading "can you be unbiased?" question
as non-curative for assessment purposes, but assume the COURT will treat it as
curative. For every "Possible" juror, output the 1-2 lock-in questions that
would convert the concern into a grantable record BEFORE opposing counsel
rehabilitates, and flag when mass-rehabilitation moments (group nods) have
already immunized jurors you would otherwise challenge.

WITNESS/PARTY RELATIONSHIPS: Any disclosed relationship to a party, counsel,
or witness (including having been a witness-physician's patient) must be
classified at minimum "Possible" with the exact development questions —
never left unresolved.

You MUST respond with valid JSON in this exact format:
{
  "strikes": [
    {
      "jurorNumber": <number>,
      "category": "Highly Likely" | "Possible" | "Unlikely",
      "reasoning": "<Plain-English explanation of WHY you assigned this category. What specific statements, facts, behavioral indicators, or patterns from the juror's responses and profile led to this classification. Be analytical and specific.>",
      "argument": "<See instructions below based on category>",
      "basis": "<Short 2-5 word label for the grounds, e.g., 'Stated bias', 'Personal connection to victim', 'Cannot follow law', 'Prior lawsuit experience', 'Fixed opinion on guilt', 'No significant basis'>",
      "lockInQuestions": ["<lock-in question 1>", "<lock-in question 2>"]
    }
  ]
}

lockInQuestions: REQUIRED (1-2 questions) for every "Possible" juror per the
REHABILITATION rule — the exact questions, phrased for open court, that would
cement the disqualifying answer before rehabilitation. Also include them for
"Highly Likely" jurors where the record still needs one answer locked in.
Use an empty array [] for "Unlikely" jurors.

ARGUMENT FORMAT BY CATEGORY:

For "Highly Likely" jurors — Write a FULL courtroom script the attorney can read verbatim to the judge. The script must include:
1. A formal address: "Your Honor, [the defense/the State/plaintiff's counsel] moves to strike Juror #[number], [full name], for cause."
2. A statement of the specific grounds, quoting the juror's actual words from voir dire where possible (e.g., "When asked about [topic], this juror stated, '[exact quote from responses].'")
3. The legal basis — why these statements or facts demonstrate bias, inability to follow the law, or inability to be impartial
4. An explanation of why rehabilitation would not cure the issue (e.g., "Despite further questioning, this juror was unable to commit to setting aside [their stated belief/experience]. The bias expressed goes to the core of the issues in this case.")
5. A closing: "We respectfully ask the Court to excuse Juror #[number] for cause."

For "Possible" jurors — Write a courtroom script similar to above, but:
1. Same formal address and opening
2. Quote the concerning statements
3. State the legal basis
4. Acknowledge that further development may be needed (e.g., "While this juror attempted to indicate they could be fair, their initial response of '[quote]' raises substantial concern about whether they can truly set aside [the issue]. We believe further examination would reveal this juror cannot be rehabilitated on this point.")
5. Same closing request

For "Unlikely" jurors — Keep it brief: 1-2 sentences explaining why no significant cause basis was identified.

Rules:
- Evaluate EVERY juror — do not skip any
- Be specific — reference actual responses and facts from the juror's profile
- Quote the juror's actual words from their recorded responses whenever possible
- Frame everything from the perspective of the attorney's side
- The courtroom scripts should sound natural and professional — as a seasoned trial attorney would speak to a judge
- Use the case context (area of law, side) to determine proper party references (e.g., "the defense" vs. "the State" vs. "plaintiff's counsel")`;

/**
 * Deterministic merge of per-chunk cause results (Section 9): first entry per
 * juror wins (chunks are disjoint, so duplicates only guard against model
 * hallucination), sorted by category severity then juror number — the same
 * ordering the monolithic call produced. Exported for tests.
 */
export function mergeCauseEntries(chunkResults: StrikeForCauseEntry[][]): StrikeForCauseEntry[] {
  const seen = new Set<number>();
  const merged: StrikeForCauseEntry[] = [];
  for (const chunk of chunkResults) {
    for (const e of chunk) {
      if (seen.has(e.jurorNumber)) continue;
      seen.add(e.jurorNumber);
      merged.push(e);
    }
  }
  const categoryOrder: Record<string, number> = { "Highly Likely": 0, "Possible": 1, "Unlikely": 2 };
  merged.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3);
    if (catDiff !== 0) return catDiff;
    return a.jurorNumber - b.jurorNumber;
  });
  return merged;
}

/**
 * Evaluate ONE batch of jurors for cause. `jurors` here is a single chunk
 * (5-10 jurors) of the panel. The shared case context arrives as the
 * cacheable context block, so parallel chunk calls reuse the same cached
 * prompt prefix. Fail-loud semantics are unchanged from the monolithic call.
 */
async function analyzeCauseChunk(
  caseBlock: string,
  jurors: JurorWithResponses[],
  panelTotal: number,
): Promise<StrikeForCauseEntry[]> {
  const jurorsText = jurors.map(j => {
    const responsesText = j.responses.length > 0
      ? j.responses.map((r, i) => {
          const questionLabel = r.side === 'court'
            ? `Court asked: "${r.questionSummary || 'Unknown'}"`
            : r.side === 'opposing'
            ? `Opposing: "${r.questionSummary || 'Unknown'}"`
            : r.questionText
              ? `Your Q: "${r.questionText}"`
              : r.questionSummary
                ? `New Q: "${r.questionSummary}"`
                : 'Unknown question';
          let text = `  ${i + 1}. ${questionLabel} → "${r.responseText}"`;
          if (r.followUps && r.followUps.length > 0) {
            r.followUps.forEach(fu => {
              text += ` | Follow-up: "${fu.question}" → "${fu.answer}"`;
            });
          }
          return text;
        }).join('\n')
      : '  No responses recorded.';

    return `JUROR #${j.number}: ${j.name}
  Sex: ${j.sex} | Race: ${j.race} | DOB: ${j.birthDate}
  Occupation: ${j.occupation} | Employer: ${j.employer}
  Lean: ${j.lean} | Risk: ${j.riskTier}
  Notes: ${j.notes || 'None'}
  Responses:
${responsesText}`;
  }).join('\n\n---\n\n');

  const scopeLine = jurors.length === panelTotal
    ? `ALL JURORS (${panelTotal} total):`
    : `JURORS TO EVALUATE IN THIS CALL (${jurors.length} of ${panelTotal} on the panel — the rest are evaluated in parallel calls; do NOT analyze jurors that are not listed here):`;

  const userPrompt = `${scopeLine}

${jurorsText}

Evaluate every juror listed above for potential strikes for cause and return the JSON result with an entry for each of these ${jurors.length} juror(s).`;

  const strikeEntrySchema = z.object({
    jurorNumber: z.number(),
    category: z.enum(["Highly Likely", "Possible", "Unlikely"]),
    reasoning: z.string().default(""),
    argument: z.string().default(""),
    basis: z.string().default(""),
    lockInQuestions: z.array(z.string()).default([]),
  });
  const strikesResponseSchema = z.object({ strikes: z.array(strikeEntrySchema) });

  const validJurorNumbers = new Set(jurors.map(j => j.number));

  const attempt = async (suffix: string): Promise<StrikeForCauseEntry[] | null> => {
    const { parsed } = await claudeJson<unknown>({
      model: CLAUDE_OPUS,
      system: STRIKE_FOR_CAUSE_PROMPT,
      cacheableContext: caseBlock,
      userPrompt: userPrompt + suffix,
      temperature: 0.3,
      // Scaled to the batch instead of a fixed 16k — enough for full
      // courtroom scripts per juror without the giant truncation-prone
      // completion the monolithic call needed.
      maxTokens: Math.min(16000, 2000 + jurors.length * 900),
    });
    if (parsed === null) return null;
    const validated = strikesResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(`[analyzeStrikesForCause] Output failed validation: ${validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return null;
    }
    // Drop hallucinated juror numbers and duplicates; keep the first entry per juror.
    const seen = new Set<number>();
    const entries: StrikeForCauseEntry[] = [];
    for (const s of validated.data.strikes) {
      if (!validJurorNumbers.has(s.jurorNumber) || seen.has(s.jurorNumber)) continue;
      seen.add(s.jurorNumber);
      entries.push({
        jurorNumber: s.jurorNumber,
        category: s.category,
        reasoning: s.reasoning,
        argument: s.argument,
        basis: s.basis,
        lockInQuestions: s.lockInQuestions,
      });
    }
    return entries;
  };

  // ALWAYS-directive enforcement in code (training doc): demographics must
  // never appear as a strike rationale, argument, or lock-in question. The
  // "basis" field is intentionally NOT scanned — it quotes the juror's own
  // recorded words verbatim, which may legitimately mention age/etc.
  const demographicHits = (list: StrikeForCauseEntry[]): Array<{ jurorNumber: number; snippet: string }> => {
    const hits: Array<{ jurorNumber: number; snippet: string }> = [];
    for (const e of list) {
      for (const field of [e.reasoning, e.argument, ...e.lockInQuestions]) {
        const hit = findDemographicRationale(field);
        if (hit) { hits.push({ jurorNumber: e.jurorNumber, snippet: hit }); break; }
      }
    }
    return hits;
  };

  // Fail-loud contract: parse + validate, retry once, then throw. If the
  // response still omits jurors after the retry, the whole chunk fails —
  // with chunked merging a partial chunk would blend invisibly into a
  // full-looking panel, silently burying exactly the jurors that were
  // omitted. NEVER fabricate "Unlikely" entries for missing jurors. A
  // "Possible" entry without lock-in questions is also invalid output (the
  // lock-in workflow is the point), and so is a demographic rationale —
  // each gets a targeted retry and then a hard failure. Never a silent
  // empty list, never a silent rewrite.
  // The single retry must address EVERY detected violation at once — a
  // response can simultaneously omit jurors, drop lock-ins, and cite
  // demographics, and a correction prompt that mentions only one category
  // wastes the sole retry on a partial fix.
  const violationsOf = (list: StrikeForCauseEntry[]) => ({
    missing: jurors.length - list.length,
    lockIns: possiblesMissingLockIns(list),
    demo: demographicHits(list),
  });
  const hasViolations = (v: ReturnType<typeof violationsOf>) =>
    v.missing > 0 || v.lockIns.length > 0 || v.demo.length > 0;

  let entries = await attempt("");
  let firstViolations = entries === null ? null : violationsOf(entries);
  if (entries === null || hasViolations(firstViolations!)) {
    let retrySuffix: string;
    let warnLabel: string;
    if (entries === null) {
      retrySuffix = JSON_RETRY_SUFFIX;
      warnLabel = 'Invalid output';
    } else {
      const v = firstViolations!;
      const problems: string[] = [];
      if (v.missing > 0) problems.push(`- You omitted ${v.missing} juror(s). Include an entry in "strikes" for EVERY juror listed above (all ${jurors.length} of them).`);
      if (v.lockIns.length > 0) problems.push(`- Juror(s) ${v.lockIns.map(n => `#${n}`).join(', ')} are rated "Possible" without lockInQuestions. Every "Possible" entry MUST include 1-2 lock-in questions to ask BEFORE any rehabilitation attempt.`);
      if (v.demo.length > 0) problems.push(`- You cited demographics as a strike rationale for juror(s) ${v.demo.map(h => `#${h.jurorNumber} ("${h.snippet}")`).join(', ')}. Race, sex, gender, and age must NEVER appear as a rationale, argument, or lock-in question — that is Batson-discoverable work product. Rewrite those entries citing ONLY record-based facts (stated positions, recorded responses, hardship statements).`);
      retrySuffix = `\n\nIMPORTANT: Your previous response had the following problem(s). Fix ALL of them and return the complete, valid JSON (no truncation, no prose, no markdown):\n${problems.join('\n')}`;
      warnLabel = [
        v.missing > 0 ? `incomplete coverage (${entries.length}/${jurors.length})` : null,
        v.lockIns.length > 0 ? `"Possible" without lock-ins (${v.lockIns.map(n => `#${n}`).join(', ')})` : null,
        v.demo.length > 0 ? `demographic rationale (${v.demo.map(h => `#${h.jurorNumber}`).join(', ')})` : null,
      ].filter(Boolean).join(' + ');
    }
    console.warn(`[analyzeStrikesForCause] ${warnLabel} on first attempt, retrying once`);
    const second = await attempt(retrySuffix);
    if (second !== null) {
      const v2 = violationsOf(second);
      // Accept the retry only if it is strictly better in lexicographic
      // priority order (coverage, then lock-ins, then demographic hits).
      // A retry that fixes a higher-priority category while worsening a
      // lower one IS accepted — the post-retry validation below still
      // throws on any remaining violation, so unsafe output cannot escape;
      // the ordering only decides which failure gets reported.
      const better =
        entries === null ||
        v2.missing < firstViolations!.missing ||
        (v2.missing === firstViolations!.missing && v2.lockIns.length < firstViolations!.lockIns.length) ||
        (v2.missing === firstViolations!.missing && v2.lockIns.length === firstViolations!.lockIns.length && v2.demo.length < firstViolations!.demo.length);
      if (better) {
        entries = second;
        firstViolations = v2;
      }
    }
  }

  if (entries === null) {
    throw new AIOutputError(`Strike-for-cause analysis returned invalid or incomplete output after a retry. No juror was defaulted to "Unlikely" — run the analysis again.`);
  }

  const stillMissingLockIns = possiblesMissingLockIns(entries);
  if (stillMissingLockIns.length > 0) {
    throw new AIOutputError(`Strike-for-cause analysis rated juror(s) ${stillMissingLockIns.map(n => `#${n}`).join(', ')} as "Possible" without the required lock-in questions, even after a retry. No empty defaults were applied — run the analysis again.`);
  }

  const stillDemoHits = demographicHits(entries);
  if (stillDemoHits.length > 0) {
    throw new AIOutputError(`Strike-for-cause analysis cited demographics as a rationale for juror(s) ${stillDemoHits.map(h => `#${h.jurorNumber} ("${h.snippet}")`).join(', ')} even after a retry. No sanitized rewrite was applied — run the analysis again.`);
  }

  if (entries.length < jurors.length) {
    const missing = jurors.filter(j => !entries!.some(e => e.jurorNumber === j.number)).map(j => `#${j.number}`);
    throw new AIOutputError(
      `Strike-for-cause analysis omitted juror(s) ${missing.join(', ')} even after a retry. No fabricated "Unlikely" defaults were applied — run the analysis again so every juror is evaluated.`,
    );
  }

  return entries;
}

export async function analyzeStrikesForCause(
  caseContext: CaseContext,
  jurors: JurorWithResponses[]
): Promise<StrikeForCauseEntry[]> {
  if (jurors.length === 0) return [];

  // Section 9: the monolithic whole-panel call is split into parallel batches
  // of 5-10 jurors with a deterministic merge. The output shape (sorted
  // StrikeForCauseEntry[]) is identical to the single-call version.
  const caseBlock = caseContextBlock(caseContext);
  const chunks = chunkBalanced(jurors, { target: 8, max: 10 });
  const settled = await Promise.allSettled(
    chunks.map(chunk => analyzeCauseChunk(caseBlock, chunk, jurors.length)),
  );

  const failures: string[] = [];
  const chunkResults: StrikeForCauseEntry[][] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      chunkResults.push(s.value);
    } else {
      const nums = chunks[i].map(j => `#${j.number}`).join(", ");
      failures.push(`batch ${i + 1} of ${chunks.length} (jurors ${nums}): ${s.reason?.message || s.reason}`);
    }
  });

  // Fail-loud: a silently missing batch would bury exactly the jurors the
  // attorney most needs to see. No partial panels, no fabricated defaults.
  if (failures.length > 0) {
    throw new AIOutputError(
      `Strike-for-cause analysis failed for ${failures.length} of ${chunks.length} batch(es) after retries — no defaults were applied; run the analysis again. ${failures.join(" | ")}`,
    );
  }

  return mergeCauseEntries(chunkResults);
}

export interface BatsonComparatorRow {
  seatedJurorNumber: number;
  seatedJurorName: string;
  sharedTraits: string;
  distinguishingFact: string;
}

interface BatsonDefensiveEntry {
  jurorNumber: number;
  jurorName: string;
  protectedClass: string;
  riskLevel: string;
  statisticalFlag: string;
  comparativeConcern: string;
  currentJustification: string;
  recommendedArticulation: string;
  warning?: string;
  /** Preview mode: record-based alternate strikes outside the protected class. */
  suggestedAlternates?: string;
  /** Miller-El comparator table — required structured output for every flagged strike. */
  comparatorTable: BatsonComparatorRow[];
}

export interface BatsonWorkProductFlag {
  jurorNumber: number;
  jurorName: string;
  source: string;
  quote: string;
  replacement: string;
}

interface BatsonOffensiveEntry {
  jurorNumber: number;
  jurorName: string;
  protectedClass: string;
  strengthOfChallenge: string;
  statisticalPattern: string;
  comparativeEvidence: string;
  suggestedArgument: string;
}

export interface BatsonAnalysisResult {
  overallRisk: string;
  summary: string;
  /** 'preview' = run against a suggested strike order before any strike was exercised. */
  mode: 'executed' | 'preview';
  defensive: BatsonDefensiveEntry[];
  offensive: BatsonOffensiveEntry[];
  /** Work-product sanitation: demographic rationales found in stored summaries/analyses/notes. */
  workProductFlags: BatsonWorkProductFlag[];
}

const BATSON_PROMPT = `You are a Batson Challenge Analyst. You evaluate peremptory strike patterns for potential Batson v. Kentucky (1986) violations and its progeny (J.E.B. v. Alabama, 1994; Flowers v. Mississippi, 2019).

You will receive:
1. Case context (area of law, side represented, case summary)
2. The full juror panel with demographics (race, sex, age/DOB, occupation, notes, AI summary)
3. Which jurors were struck by "your side" (the attorney using this tool)
4. Which jurors were struck by the opposing side

You must perform TWO analyses:

## DEFENSIVE ANALYSIS (Your Strikes)
Evaluate whether any of the attorney's own strikes could be vulnerable to a Batson challenge from opposing counsel.

For each protected class (race, sex):
1. Use the COMPUTED STRIKE STATISTICS block in the user message. Panel counts, struck counts, and strike rates are computed deterministically in code — quote those numbers verbatim and do NOT recount or recalculate anything.
2. For each potentially problematic strike, identify seated jurors outside the protected class who share similar characteristics (occupation, attitudes, responses) — the "comparative juror analysis" from Miller-El v. Dretke (2005). Deterministic trait-match candidates are provided in the statistics block; select the true comparators from them (and any others the record supports) and supply the distinguishing record facts.
3. Review the attorney's notes/AI summary for each struck juror to assess whether there is a legitimate race/sex-neutral justification

For each flagged strike, output:
- jurorNumber, jurorName
- protectedClass: which class triggers concern (e.g., "Race - Black", "Sex - Female")
- riskLevel: "High" / "Moderate" / "Low"
- statisticalFlag: the disparity numbers, quoted from the computed statistics (e.g., "3 of 4 Black jurors struck (75%) vs. 2 of 8 White jurors (25%)")
- comparativeConcern: which seated jurors have similar profiles but were not struck
- comparatorTable: REQUIRED for every flagged strike — one row per similarly-situated seated juror: { "seatedJurorNumber": number, "seatedJurorName": string, "sharedTraits": "<record traits shared with the struck juror>", "distinguishingFact": "<the record-based fact that legitimately distinguishes the seated juror from the struck one — if none exists, state 'None — this is the Batson problem'>" }
- currentJustification: what the attorney's notes suggest as reasoning
- recommendedArticulation: a stronger race/sex-neutral justification the attorney could prepare, IF one legitimately exists based on the record
- warning: if no legitimate justification exists, state this clearly (optional field, only include when warranted)
- suggestedAlternates: in PREVIEW MODE, record-based alternate strikes with equivalent risk profiles outside the protected class (optional otherwise)

PREVIEW MODE: When given a suggested strike order rather than executed strikes,
run the same statistical and comparative analysis on the TOP N suggested
strikes as if exercised. If the suggested pattern skews by race or sex against
the panel baseline, say so before any strike is made, identify which suggested
strikes drive the skew, and identify record-based alternates with equivalent
risk profiles outside the protected class.

WORK-PRODUCT SANITATION: As part of every defensive analysis, scan the panel's
stored AI summaries, analyses, and notes for demographic rationales attached to
any struck or strike-listed juror. List each instance verbatim with its juror,
flag it as material that must not be echoed at sidebar, and supply the
record-based articulation that replaces it.

Report each work-product finding in "workProductFlags": { "jurorNumber": number, "jurorName": string, "source": "<'AI Summary' | 'AI Analysis' | 'Notes'>", "quote": "<the verbatim demographic rationale>", "replacement": "<the record-based articulation to use instead>" }. If none are found, return an empty array.

## OFFENSIVE ANALYSIS (Their Strikes)
Evaluate whether opposing counsel's strikes show a pattern that could support a Batson challenge.

Same statistical and comparative methodology. For each challengeable strike:
- jurorNumber, jurorName
- protectedClass
- strengthOfChallenge: "Strong" / "Moderate" / "Weak"
- statisticalPattern: the numbers
- comparativeEvidence: seated jurors who share traits with the struck juror
- suggestedArgument: what the attorney should say when raising the Batson challenge, written as if addressing the judge directly

## OVERALL ASSESSMENT
- overallRisk: "Low" / "Moderate" / "High" — how vulnerable is the attorney's strike pattern overall
- summary: 2-4 sentence plain-English summary of the situation, noting any concerning patterns on either side

## CRITICAL RULES
- Be honest. If the attorney's strikes show a genuine Batson problem, say so directly. Do not help disguise discriminatory strikes.
- Batson applies to race (all races), sex (both sexes), and in many jurisdictions ethnicity.
- A prima facie case requires: (1) strikes of members of a cognizable group, (2) circumstances raising an inference of discrimination.
- "Demeanor" alone is the weakest justification. Courts increasingly reject it without specific, documented observations.
- If no strikes have been made by a side, output an empty array for that side's analysis.
- If there are no concerning patterns at all, still provide the summary and set overallRisk to "Low" with empty arrays.

Return valid JSON with this exact structure:
{
  "overallRisk": "Low" | "Moderate" | "High",
  "summary": "string",
  "defensive": [ { "jurorNumber": number, "jurorName": "string", "protectedClass": "string", "riskLevel": "string", "statisticalFlag": "string", "comparativeConcern": "string", "comparatorTable": [ { "seatedJurorNumber": number, "seatedJurorName": "string", "sharedTraits": "string", "distinguishingFact": "string" } ], "currentJustification": "string", "recommendedArticulation": "string", "warning": "string (optional)", "suggestedAlternates": "string (preview mode)" } ],
  "offensive": [ { "jurorNumber": number, "jurorName": "string", "protectedClass": "string", "strengthOfChallenge": "string", "statisticalPattern": "string", "comparativeEvidence": "string", "suggestedArgument": "string" } ],
  "workProductFlags": [ { "jurorNumber": number, "jurorName": "string", "source": "string", "quote": "string", "replacement": "string" } ]
}`;

/**
 * Deterministic overall-risk aggregation for the chunked Batson path. The
 * strike pattern is as vulnerable as its worst flagged strike. Computed in
 * code, never re-judged by the model. Exported for tests.
 */
export function aggregateBatsonOverallRisk(defensive: Array<{ riskLevel: string }>): "Low" | "Moderate" | "High" {
  if (defensive.some(d => d.riskLevel === "High")) return "High";
  if (defensive.some(d => d.riskLevel === "Moderate")) return "Moderate";
  return "Low";
}

const BATSON_SUMMARY_PROMPT = `You are a Batson Challenge Analyst writing the executive summary of an already-completed analysis. You receive the computed strike statistics and the flagged defensive/offensive entries from that analysis. Write a 2-4 sentence plain-English summary of the Batson posture, leading with the attorney's own exposure, then any offensive opportunity. Quote statistics verbatim from the computed numbers — never recalculate or invent numbers. Never present demographics as a legitimate strike rationale. Respond with the summary text only — no JSON, no headers, no preamble.`;

export async function analyzeBatson(
  caseContext: CaseContext,
  jurors: Array<JurorData & { aiSummary?: string; aiAnalysis?: string }>,
  yourStrikes: number[],
  theirStrikes: number[],
  options?: { previewStrikeOrder?: number[] }
): Promise<BatsonAnalysisResult> {
  // PREVIEW MODE (Whigham lesson: the suggested strike order skewed 5 women /
  // 3 Black jurors in the top 7 and was never pattern-checked because no
  // strike was ever recorded). When no strikes have been exercised by the
  // attorney, a suggested order can be analyzed as if exercised.
  const previewList = options?.previewStrikeOrder ?? [];
  const isPreview = yourStrikes.length === 0 && previewList.length > 0;
  const effectiveYourStrikes = isPreview ? previewList : yourStrikes;
  const mode: 'executed' | 'preview' = isPreview ? 'preview' : 'executed';

  const stats = computeBatsonStats(jurors, effectiveYourStrikes, theirStrikes);
  const statsBlock = formatBatsonStatsBlock(stats);

  const strikeListed = new Set([...effectiveYourStrikes, ...theirStrikes]);
  const jurorsText = jurors.map(j => {
    const struckBy = effectiveYourStrikes.includes(j.number)
      ? (isPreview ? 'SUGGESTED STRIKE (PREVIEW — not yet exercised)' : 'YOUR SIDE')
      : theirStrikes.includes(j.number) ? 'OPPOSING SIDE' : 'NOT STRUCK (SEATED)';
    // Work-product sanitation needs the stored full analysis, but only for
    // struck / strike-listed jurors — that is the material at sidebar risk.
    const workProduct = strikeListed.has(j.number) && j.aiAnalysis
      ? `\n  STORED FULL ANALYSIS (work product — scan for demographic rationales): ${j.aiAnalysis.length > 1500 ? j.aiAnalysis.slice(0, 1500) + ' …[truncated]' : j.aiAnalysis}`
      : '';
    return `JUROR #${j.number}: ${j.name}
  Sex: ${j.sex} | Race: ${j.race} | DOB: ${j.birthDate}
  Occupation: ${j.occupation} | Employer: ${j.employer}
  Lean: ${j.lean} | Risk: ${j.riskTier}
  Notes: ${j.notes || 'None'}
  AI Summary: ${j.aiSummary || 'None'}
  STRIKE STATUS: ${struckBy}${workProduct}`;
  }).join('\n\n---\n\n');

  const modeBanner = isPreview
    ? `\nMODE: PREVIEW — No strikes have been exercised. "YOUR STRIKES" below is the attorney's SUGGESTED strike order (top ${effectiveYourStrikes.length}). Apply the PREVIEW MODE instructions: analyze the suggested strikes as if exercised, flag any race/sex skew before a single strike is made, and populate suggestedAlternates for flagged entries.\n`
    : '';

  // Prompt caching (Section 9): case context + full panel + computed stats
  // are identical across every call for this check, so they travel in the
  // cacheable context block. Strike lists and per-call scope stay in the
  // user prompt. Stats remain GLOBAL (computed in code over the whole panel)
  // no matter how the calls are chunked.
  const cacheableContext = `CASE CONTEXT:
Case: ${caseContext.name}
Area of Law: ${caseContext.areaOfLaw}
Summary: ${caseContext.summary}
Representing: ${caseContext.side}

FULL PANEL (${jurors.length} jurors):

${jurorsText}

${statsBlock}`;

  const strikeLists = `${isPreview ? `YOUR SUGGESTED STRIKES (PREVIEW, ${effectiveYourStrikes.length})` : `YOUR STRIKES (${effectiveYourStrikes.length})`}: Jurors ${effectiveYourStrikes.length > 0 ? effectiveYourStrikes.map(n => `#${n}`).join(', ') : 'None'}
OPPOSING STRIKES (${theirStrikes.length}): Jurors ${theirStrikes.length > 0 ? theirStrikes.map(n => `#${n}`).join(', ') : 'None'}`;

  const userPromptSingle = `${modeBanner}${strikeLists}

Perform the full Batson analysis and return the JSON result.`;

  const batsonComparatorRowSchema = z.object({
    seatedJurorNumber: z.number(),
    seatedJurorName: z.string().default(""),
    sharedTraits: z.string().default(""),
    distinguishingFact: z.string().default(""),
  });
  const batsonDefensiveSchema = z.object({
    jurorNumber: z.number(),
    jurorName: z.string().default(""),
    protectedClass: z.string().default("Unknown"),
    riskLevel: z.enum(["Low", "Moderate", "High"]),
    statisticalFlag: z.string().default(""),
    comparativeConcern: z.string().default(""),
    // REQUIRED (no default): an omitted comparator table is invalid output and
    // must fail loud. An explicitly empty [] is legitimate when no seated
    // juror shares traits with the struck juror.
    comparatorTable: z.array(batsonComparatorRowSchema),
    currentJustification: z.string().default(""),
    recommendedArticulation: z.string().default(""),
    warning: z.string().optional(),
    suggestedAlternates: z.string().optional(),
  });
  const batsonOffensiveSchema = z.object({
    jurorNumber: z.number(),
    jurorName: z.string().default(""),
    protectedClass: z.string().default("Unknown"),
    strengthOfChallenge: z.enum(["Strong", "Moderate", "Weak"]),
    statisticalPattern: z.string().default(""),
    comparativeEvidence: z.string().default(""),
    suggestedArgument: z.string().default(""),
  });
  const batsonWorkProductFlagSchema = z.object({
    jurorNumber: z.number(),
    jurorName: z.string().default(""),
    source: z.string().default(""),
    quote: z.string().default(""),
    replacement: z.string().default(""),
  });
  const batsonResponseSchema = z.object({
    overallRisk: z.enum(["Low", "Moderate", "High"]),
    summary: z.string().min(1),
    defensive: z.array(batsonDefensiveSchema).default([]),
    offensive: z.array(batsonOffensiveSchema).default([]),
    // REQUIRED (no default) — see defensiveChunkSchema.
    workProductFlags: z.array(batsonWorkProductFlagSchema),
  });

  const defensiveChunkSchema = z.object({
    defensive: z.array(batsonDefensiveSchema).default([]),
    // REQUIRED (no default): an omitted sanitation scan is invalid output —
    // a silently-defaulted empty array would read as "clean work product" on
    // a constitutional-exposure surface. An explicit [] is valid.
    workProductFlags: z.array(batsonWorkProductFlagSchema),
  });
  const offensiveChunkSchema = z.object({
    offensive: z.array(batsonOffensiveSchema).default([]),
  });

  const mapWpf = (w: z.infer<typeof batsonWorkProductFlagSchema>) => ({
    jurorNumber: w.jurorNumber,
    jurorName: w.jurorName || `Juror #${w.jurorNumber}`,
    source: w.source,
    quote: w.quote,
    replacement: w.replacement,
  });
  const mapDefensive = (d: z.infer<typeof batsonDefensiveSchema>) => ({
    jurorNumber: d.jurorNumber,
    jurorName: d.jurorName || `Juror #${d.jurorNumber}`,
    protectedClass: d.protectedClass,
    riskLevel: d.riskLevel,
    statisticalFlag: d.statisticalFlag,
    comparativeConcern: d.comparativeConcern,
    comparatorTable: d.comparatorTable,
    currentJustification: d.currentJustification,
    recommendedArticulation: d.recommendedArticulation,
    ...(d.warning ? { warning: d.warning } : {}),
    ...(d.suggestedAlternates ? { suggestedAlternates: d.suggestedAlternates } : {}),
  });
  const mapOffensive = (o: z.infer<typeof batsonOffensiveSchema>) => ({
    jurorNumber: o.jurorNumber,
    jurorName: o.jurorName || `Juror #${o.jurorNumber}`,
    protectedClass: o.protectedClass,
    strengthOfChallenge: o.strengthOfChallenge,
    statisticalPattern: o.statisticalPattern,
    comparativeEvidence: o.comparativeEvidence,
    suggestedArgument: o.suggestedArgument,
  });

  // Deterministic work-product backstop (ALWAYS-directive enforced in code,
  // not prompts): the model scans prompt material that truncates long stored
  // analyses at 1500 chars, and it has missed planted rationales buried in
  // long context. This scan covers the FULL text of every defended juror's
  // notes, AI summary, and stored analysis, so a demographic rationale can
  // never silently read as "clean work product". Model flags are kept (they
  // catch phrasings the patterns miss); deterministic hits are added for
  // (juror, source) pairs the model did not flag.
  const deterministicWpfFlags = (): BatsonAnalysisResult['workProductFlags'] => {
    const flags: BatsonAnalysisResult['workProductFlags'] = [];
    for (const num of effectiveYourStrikes) {
      const j = jurors.find(x => x.number === num);
      if (!j) continue;
      const sources: Array<[string, string | null | undefined]> = [
        ['Notes', j.notes],
        ['AI Summary', j.aiSummary],
        ['AI Analysis', j.aiAnalysis],
      ];
      for (const [source, text] of sources) {
        if (!text) continue;
        const hit = findDemographicRationale(text);
        if (!hit) continue;
        const idx = text.toLowerCase().indexOf(hit.toLowerCase());
        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + hit.length + 60);
        flags.push({
          jurorNumber: num,
          jurorName: j.name,
          source,
          quote: `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`,
          replacement: 'Rewrite citing only record-based facts (recorded responses, stated positions, occupation function, hardship) — flagged by the deterministic demographic-pattern scan.',
        });
      }
    }
    return flags;
  };
  const wpfSourceKey = (jurorNumber: number, source: string) =>
    `${jurorNumber}|${source.toLowerCase().replace(/[^a-z]/g, '')}`;
  const mergeWpfWithBackstop = (
    modelFlags: BatsonAnalysisResult['workProductFlags'],
  ): BatsonAnalysisResult['workProductFlags'] => {
    const covered = new Set(modelFlags.map(f => wpfSourceKey(f.jurorNumber, f.source)));
    const merged = [...modelFlags];
    for (const f of deterministicWpfFlags()) {
      if (!covered.has(wpfSourceKey(f.jurorNumber, f.source))) merged.push(f);
    }
    return merged;
  };

  // Deterministic ordering regardless of which path produced the entries.
  const riskOrder: Record<string, number> = { High: 0, Moderate: 1, Low: 2 };
  const strengthOrder: Record<string, number> = { Strong: 0, Moderate: 1, Weak: 2 };
  const sortResult = (r: BatsonAnalysisResult): BatsonAnalysisResult => {
    r.defensive.sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3) || a.jurorNumber - b.jurorNumber);
    r.offensive.sort((a, b) => (strengthOrder[a.strengthOfChallenge] ?? 3) - (strengthOrder[b.strengthOfChallenge] ?? 3) || a.jurorNumber - b.jurorNumber);
    r.workProductFlags.sort((a, b) => a.jurorNumber - b.jurorNumber || a.source.localeCompare(b.source));
    return r;
  };

  const struckTotal = effectiveYourStrikes.length + theirStrikes.length;

  // ---- Single-call path: small strike sets fit in one call (unchanged) ----
  if (struckTotal <= 6) {
    const attempt = async (suffix: string): Promise<BatsonAnalysisResult | null> => {
      const { parsed } = await claudeJson<unknown>({
        model: CLAUDE_OPUS,
        system: BATSON_PROMPT,
        cacheableContext,
        userPrompt: userPromptSingle + suffix,
        temperature: 0.3,
        maxTokens: 16000,
      });
      if (parsed === null) return null;
      const validated = batsonResponseSchema.safeParse(parsed);
      if (!validated.success) {
        console.error(`[analyzeBatson] Output failed validation: ${validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        return null;
      }
      return {
        overallRisk: validated.data.overallRisk,
        summary: validated.data.summary,
        mode,
        workProductFlags: validated.data.workProductFlags.map(mapWpf),
        defensive: validated.data.defensive.map(mapDefensive),
        offensive: validated.data.offensive.map(mapOffensive),
      };
    };

    // Fail-loud contract: parse + validate, retry once, then throw. NEVER
    // default to "No Batson concerns identified." — a fabricated all-clear on
    // a constitutional issue is worse than an error message.
    let result = await attempt("");
    if (!result) {
      console.warn(`[analyzeBatson] Invalid output on first attempt, retrying once with explicit JSON instruction`);
      result = await attempt(JSON_RETRY_SUFFIX);
    }
    if (!result) {
      throw new AIOutputError(`Batson analysis returned invalid or incomplete output after a retry. No "no concerns" default was applied — run the Batson check again.`);
    }
    result.workProductFlags = mergeWpfWithBackstop(result.workProductFlags);
    return sortResult(result);
  }

  // ---- Chunked path (Section 9): larger strike sets fan out in parallel ----
  // Defensive chunks cover the attorney's strikes (analysis + work-product
  // sanitation); offensive chunks cover opposing strikes. The shared prefix
  // (case + panel + stats) is cached; overallRisk is aggregated in code; the
  // summary is one small aggregation call over deterministic inputs.
  const runChunk = async <S extends z.ZodTypeAny>(label: string, scopePrompt: string, schema: S): Promise<z.infer<S>> => {
    const run = async (suffix: string): Promise<z.infer<S> | null> => {
      const { parsed } = await claudeJson<unknown>({
        model: CLAUDE_OPUS,
        system: BATSON_PROMPT,
        cacheableContext,
        userPrompt: scopePrompt + suffix,
        temperature: 0.3,
        // 5-series models spend part of max_tokens on internal reasoning;
        // a 6-juror defensive chunk (comparator tables are the heaviest
        // per-juror output) was observed truncating at 6000.
        maxTokens: 10000,
      });
      if (parsed === null) return null;
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        console.error(`[analyzeBatson] ${label} failed validation: ${validated.error.issues.map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
        return null;
      }
      return validated.data;
    };
    let out = await run("");
    if (out === null) {
      console.warn(`[analyzeBatson] ${label}: invalid output on first attempt, retrying once with explicit JSON instruction`);
      out = await run(JSON_RETRY_SUFFIX);
    }
    if (out === null) {
      throw new AIOutputError(`Batson ${label} returned invalid output after a retry.`);
    }
    return out;
  };

  const scopeIntro = `${modeBanner}${strikeLists}`;

  // Work-product material is REPEATED inline next to the scan instruction:
  // in the chunked path the panel block lives ~dozens of jurors deep in the
  // cached context, and the model was observed missing a blatant demographic
  // rationale buried there across multiple runs (lost-in-the-middle).
  const workProductMaterial = (nums: number[]) => nums.map(n => {
    const j = jurors.find(x => x.number === n);
    if (!j) return `  #${n}: (juror not found)`;
    const stored = j.aiAnalysis
      ? (j.aiAnalysis.length > 1500 ? j.aiAnalysis.slice(0, 1500) + ' …[truncated]' : j.aiAnalysis)
      : 'None';
    return `  #${n} ${j.name}:\n    Notes: ${j.notes || 'None'}\n    AI Summary: ${j.aiSummary || 'None'}\n    Stored Analysis: ${stored}`;
  }).join('\n');

  const defensiveScope = (nums: number[]) => `${scopeIntro}

SCOPE FOR THIS CALL: Perform ONLY the DEFENSIVE analysis and the WORK-PRODUCT SANITATION scan, and ONLY for these struck juror(s): ${nums.map(n => `#${n}`).join(', ')}. The other struck jurors are being analyzed in parallel calls — do not analyze them here. Do NOT produce "offensive", "overallRisk", or "summary".

WORK-PRODUCT SANITATION for this scope: scan the material below and report EVERY demographic rationale (race, sex, ethnicity, age, or any protected class offered as a reason to strike or as a lean predictor) in "workProductFlags" — verbatim quote plus a record-based replacement. The "workProductFlags" key is REQUIRED in your response; an empty array is only correct if the material below is genuinely clean.

WORK-PRODUCT MATERIAL FOR THIS SCOPE (verbatim from the file — scan every line):
${workProductMaterial(nums)}

Return valid JSON with exactly this structure, using the same defensive-entry and work-product-flag shapes defined in the system prompt:
{"defensive": [ ... ], "workProductFlags": [ ... ]}
Only include jurors from the scope list that warrant flagging; empty arrays are valid.`;

  const offensiveScope = (nums: number[]) => `${scopeIntro}

SCOPE FOR THIS CALL: Perform ONLY the OFFENSIVE analysis, and ONLY for these opposing strike(s): ${nums.map(n => `#${n}`).join(', ')}. The other opposing strikes are being analyzed in parallel calls — do not analyze them here. Do NOT produce "defensive", "workProductFlags", "overallRisk", or "summary".

Return valid JSON with exactly this structure, using the same offensive-entry shape defined in the system prompt:
{"offensive": [ ... ]}
Only include jurors from the scope list where a challenge has any basis; an empty array is valid.`;

  // Defensive chunks are smaller than offensive ones: each defensive entry
  // carries a full comparator table plus the work-product scan, so per-call
  // output (and reasoning burn) is much heavier per juror.
  const defensiveChunks = chunkBalanced(effectiveYourStrikes, { target: 3, max: 4 });
  const offensiveChunks = chunkBalanced(theirStrikes, { target: 5, max: 6 });

  const defensiveJobs = defensiveChunks.map(async nums => {
    const label = `defensive batch (jurors ${nums.map(n => `#${n}`).join(', ')})`;
    const data = await runChunk(label, defensiveScope(nums), defensiveChunkSchema);
    const scope = new Set(nums);
    return {
      defensive: data.defensive.filter(d => scope.has(d.jurorNumber)).map(mapDefensive),
      workProductFlags: data.workProductFlags.filter(w => scope.has(w.jurorNumber)).map(mapWpf),
    };
  });
  const offensiveJobs = offensiveChunks.map(async nums => {
    const label = `offensive batch (jurors ${nums.map(n => `#${n}`).join(', ')})`;
    const data = await runChunk(label, offensiveScope(nums), offensiveChunkSchema);
    const scope = new Set(nums);
    return { offensive: data.offensive.filter(o => scope.has(o.jurorNumber)).map(mapOffensive) };
  });

  const [defSettled, offSettled] = await Promise.all([
    Promise.allSettled(defensiveJobs),
    Promise.allSettled(offensiveJobs),
  ]);

  const chunkFailures: string[] = [];
  const defensive: BatsonAnalysisResult['defensive'] = [];
  const workProductFlags: BatsonAnalysisResult['workProductFlags'] = [];
  const offensive: BatsonAnalysisResult['offensive'] = [];
  defSettled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      defensive.push(...s.value.defensive);
      workProductFlags.push(...s.value.workProductFlags);
    } else {
      chunkFailures.push(`defensive batch ${i + 1} of ${defensiveChunks.length}: ${s.reason?.message || s.reason}`);
    }
  });
  offSettled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      offensive.push(...s.value.offensive);
    } else {
      chunkFailures.push(`offensive batch ${i + 1} of ${offensiveChunks.length}: ${s.reason?.message || s.reason}`);
    }
  });

  // Fail-loud: a silently missing batch could hide exactly the strike that
  // draws the Batson challenge. No partial analysis, no "no concerns" default.
  if (chunkFailures.length > 0) {
    throw new AIOutputError(
      `Batson analysis failed for ${chunkFailures.length} batch(es) after retries — no "no concerns" default was applied; run the Batson check again. ${chunkFailures.join(' | ')}`,
    );
  }

  const overallRisk = aggregateBatsonOverallRisk(defensive);
  const mergedWorkProductFlags = mergeWpfWithBackstop(workProductFlags);

  // Executive summary: one small fast-model aggregation call over
  // deterministic inputs (global stats + flagged entries). Retry once, then
  // fail loud — never fabricate an all-clear.
  const digest: string[] = [];
  digest.push(defensive.length > 0
    ? `DEFENSIVE FLAGS: ${defensive.map(d => `#${d.jurorNumber} ${d.jurorName} (${d.protectedClass}, risk ${d.riskLevel})`).join('; ')}`
    : 'DEFENSIVE FLAGS: none');
  digest.push(offensive.length > 0
    ? `OFFENSIVE OPPORTUNITIES: ${offensive.map(o => `#${o.jurorNumber} ${o.jurorName} (${o.protectedClass}, ${o.strengthOfChallenge})`).join('; ')}`
    : 'OFFENSIVE OPPORTUNITIES: none');
  if (mergedWorkProductFlags.length > 0) {
    digest.push(`WORK-PRODUCT FLAGS: ${mergedWorkProductFlags.length} demographic rationale(s) found in stored notes/summaries (must be rewritten before sidebar).`);
  }

  const summaryUserPrompt = `${isPreview ? 'MODE: PREVIEW — the analyzed strikes are a suggested order, not yet exercised.\n\n' : ''}${statsBlock}

${digest.join('\n')}

Computed overall vulnerability of our strike pattern: ${overallRisk}

Write the 2-4 sentence executive summary.`;

  const attemptSummary = async (suffix: string): Promise<string> => (await claudeComplete({
    model: CLAUDE_SONNET,
    system: BATSON_SUMMARY_PROMPT,
    userPrompt: summaryUserPrompt + suffix,
    temperature: 0.3,
    maxTokens: 400,
  })).trim();

  let summary = await attemptSummary("");
  if (summary.length < 20) {
    console.warn('[analyzeBatson] Summary aggregation output too short, retrying once');
    summary = await attemptSummary('\n\nIMPORTANT: Your previous response was empty or too short. Write the 2-4 sentence plain-English summary now.');
  }
  if (summary.length < 20) {
    throw new AIOutputError('Batson summary aggregation failed after a retry — run the Batson check again.');
  }

  return sortResult({ overallRisk, summary, mode, defensive, offensive, workProductFlags: mergedWorkProductFlags });
}
