/**
 * Background analysis scheduler (Sections 8/9 of the training doc).
 *
 * - schedulePrewarmAnalysis(caseId, jurorNumber): debounced per-juror
 *   pre-warm. As responses are recorded, the juror's full analysis is
 *   computed incrementally in the background so the strike conference /
 *   end report finds warm, hash-current results instead of paying for a
 *   cold monolithic run.
 * - triggerStageCloseAnalyses(caseId): when the examination stage closes
 *   (responses_closed prognosis), pre-warm every remaining juror and
 *   auto-run the batched strike-for-cause analysis.
 *
 * Failure policy: background work NEVER writes failure states onto rows —
 * a juror keeps whatever analysisStatus the foreground flow set ('stale'
 * stays visibly stale), so nothing is silently masked. Background failures
 * are logged and dropped; foreground routes keep the fail-loud contract.
 *
 * Kill switch: DISABLE_ANALYSIS_PREWARM=1 disables all background analysis.
 */
import { storage } from "./storage";
import {
  analyzeJuror,
  analyzeStrikesForCause,
  type CaseContext,
  type JurorData,
  type ResponseData,
} from "./analyzeJuror";
import { computeAnalysisInputHash } from "./analysisInputs";
import { getEnrichedDataForCase } from "./perplexityEnrichment";
import type { Case, Juror } from "@shared/schema";

const PREWARM_DEBOUNCE_MS = 8_000;
const MAX_CONCURRENT = 3;

function prewarmDisabled(): boolean {
  return process.env.DISABLE_ANALYSIS_PREWARM === "1";
}

const pendingTimers = new Map<string, NodeJS.Timeout>();
const queue: Array<{ caseId: string; jurorNumber: number }> = [];
const queuedKeys = new Set<string>();
let running = 0;

/**
 * Debounced pre-warm: repeated responses for the same juror within the
 * debounce window collapse into one analysis run after the window closes.
 */
export function schedulePrewarmAnalysis(caseId: string, jurorNumber: number): void {
  if (prewarmDisabled()) return;
  const key = `${caseId}:${jurorNumber}`;
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    enqueuePrewarm(caseId, jurorNumber);
  }, PREWARM_DEBOUNCE_MS);
  // Background warming must never hold the process open.
  timer.unref?.();
  pendingTimers.set(key, timer);
}

function enqueuePrewarm(caseId: string, jurorNumber: number): void {
  const key = `${caseId}:${jurorNumber}`;
  if (queuedKeys.has(key)) return;
  queuedKeys.add(key);
  queue.push({ caseId, jurorNumber });
  pump();
}

function pump(): void {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    queuedKeys.delete(`${item.caseId}:${item.jurorNumber}`);
    running += 1;
    runPrewarm(item.caseId, item.jurorNumber)
      .catch((err) => {
        console.warn(`[prewarm] case ${item.caseId} juror #${item.jurorNumber}: ${err?.message || err}`);
      })
      .finally(() => {
        running -= 1;
        pump();
      });
  }
}

function buildCaseContext(c: Case): CaseContext {
  return {
    name: c.name,
    areaOfLaw: c.areaOfLaw,
    summary: c.summary,
    side: c.side,
    favorableTraits: c.favorableTraits ?? [],
    riskTraits: c.riskTraits ?? [],
  };
}

function toJurorData(j: Juror): JurorData {
  return {
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
  };
}

type StoredQuestion = Awaited<ReturnType<typeof storage.getQuestionsByCase>>[number];
type StoredResponse = Awaited<ReturnType<typeof storage.getResponsesByCase>>[number];

/** Mirror of how the response routes assemble ResponseData for analysis. */
function buildResponseData(questions: StoredQuestion[], rs: StoredResponse[]): ResponseData[] {
  return rs.map((r) => ({
    questionText:
      (r.questionId != null
        ? questions.find((q) => q.questionNumber === r.questionId)?.originalText
        : null) || null,
    questionSummary: r.questionSummary || null,
    responseText: r.responseText,
    side: r.side,
    followUps: (r.followUps ?? []) as Array<{ question: string; answer: string }>,
  }));
}

interface PrewarmInputs {
  c: Case;
  juror: Juror;
  responses: ResponseData[];
  enrichedData: Record<string, any> | null;
  hash: string;
}

/** Load the authoritative analysis inputs for a juror and their hash. */
async function loadPrewarmInputs(caseId: string, jurorNumber: number): Promise<PrewarmInputs | null> {
  const [c, jurors, questions, allResponses] = await Promise.all([
    storage.getCase(caseId),
    storage.getJurorsByCase(caseId),
    storage.getQuestionsByCase(caseId),
    storage.getResponsesByCase(caseId),
  ]);
  if (!c) return null;
  const juror = jurors.find((j) => j.number === jurorNumber);
  if (!juror) return null;

  const responses = buildResponseData(
    questions,
    allResponses.filter((r) => r.jurorNumber === jurorNumber),
  );

  let enrichedData: Record<string, any> | null = null;
  try {
    const allEnriched = await getEnrichedDataForCase(caseId);
    enrichedData = allEnriched[juror.id] || allEnriched[String(juror.number)] || null;
  } catch (err) {
    // Enrichment being unavailable is not a reason to skip warming — the
    // foreground route behaves the same way.
    console.warn(`[prewarm] enrichment fetch failed for case ${caseId}: ${err}`);
  }

  const enrichedText = enrichedData ? enrichedData.text || JSON.stringify(enrichedData) : "";
  const hash = computeAnalysisInputHash({
    caseContext: buildCaseContext(c),
    juror: toJurorData(juror),
    responses,
    enrichedText,
  });
  return { c, juror, responses, enrichedData, hash };
}

async function runPrewarm(caseId: string, jurorNumber: number): Promise<void> {
  const inputs = await loadPrewarmInputs(caseId, jurorNumber);
  if (!inputs) return;
  const { c, juror, responses, enrichedData, hash } = inputs;

  // Delta re-analysis: inputs unchanged since the stored analysis → skip.
  if (juror.analysisStatus === "ok" && juror.analysisInputHash === hash && juror.aiAnalysis) {
    return;
  }

  const result = await analyzeJuror(buildCaseContext(c), toJurorData(juror), responses, enrichedData);

  // The AI call above can take tens of seconds. If any input changed under
  // it (new response, note edit, case-posture change), this result no longer
  // describes the current record — persisting it as 'ok' would overwrite the
  // 'stale' mark the foreground flow just set. Recompute the authoritative
  // hash and only persist when it still matches; otherwise drop this result
  // and re-queue so the fresh inputs win. (A write landing in the sub-second
  // window after this check self-heals: the stored hash won't match the new
  // inputs, so the cache path misses and the next response write schedules
  // another pre-warm.)
  const after = await loadPrewarmInputs(caseId, jurorNumber);
  if (!after) return;
  if (after.hash !== hash) {
    console.log(
      `[prewarm] Inputs changed for case ${caseId} juror #${jurorNumber} mid-analysis — discarding result and re-queueing`,
    );
    enqueuePrewarm(caseId, jurorNumber);
    return;
  }

  // Persist AI-owned fields only — never attorney-owned lean/riskTier/notes,
  // and never aiSummary (that belongs to the brief-summary flow).
  await storage.updateJuror(juror.id, {
    aiAnalysis: result.analysis,
    riskScore: result.riskScore,
    aiRiskTier: result.aiRiskTier,
    informationLevel: result.informationLevel,
    analysisProvisional: result.provisional,
    keyFollowUp: result.keyFollowUp,
    damagesAnchor: result.damagesAnchor,
    aiSuggestedLean: result.suggestedLean,
    aiLeanConfidence: result.leanConfidence,
    analysisStatus: "ok",
    analysisInputHash: hash,
  });
  console.log(
    `[prewarm] Warmed analysis for case ${caseId} juror #${jurorNumber} (${result.modelTier} tier)`,
  );
}

const causeInFlight = new Set<string>();

/**
 * Fire-and-forget stage-close hook (Section 8): pre-warm all remaining
 * jurors and auto-run the batched strike-for-cause analysis so the strike
 * conference starts with results already on the table.
 */
export function triggerStageCloseAnalyses(caseId: string): void {
  if (prewarmDisabled()) return;
  void (async () => {
    const [c, jurors, questions, responses] = await Promise.all([
      storage.getCase(caseId),
      storage.getJurorsByCase(caseId),
      storage.getQuestionsByCase(caseId),
      storage.getResponsesByCase(caseId),
    ]);
    if (!c) return;
    const dismissed = new Set(c.courtDismissed ?? []);
    const active = jurors.filter((j) => !dismissed.has(j.number));
    if (active.length === 0) return;

    // 1) Pre-warm every juror without a current analysis. No debounce — the
    // record is closed, nothing more is coming.
    for (const j of active) {
      if (j.analysisStatus !== "ok") enqueuePrewarm(caseId, j.number);
    }

    // 2) Auto-run the batched cause analysis unless a fresh one exists.
    if (causeInFlight.has(caseId)) return;
    const latestResponseAt = responses.reduce((m, r) => Math.max(m, r.timestamp), 0);
    if (c.causeAnalyzedAt && c.causeAnalyzedAt >= latestResponseAt) {
      console.log(`[stage-close] Cause analysis already fresh for case ${caseId}, skipping auto-run`);
      return;
    }
    causeInFlight.add(caseId);
    try {
      const jurorsWithResponses = active.map((j) => ({
        ...toJurorData(j),
        responses: buildResponseData(
          questions,
          responses.filter((r) => r.jurorNumber === j.number),
        ),
      }));
      const entries = await analyzeStrikesForCause(buildCaseContext(c), jurorsWithResponses);
      await storage.updateCase(caseId, { strikesForCause: entries, causeAnalyzedAt: Date.now() });
      console.log(
        `[stage-close] Auto-ran strike-for-cause for case ${caseId}: ${entries.length} entries`,
      );
    } catch (err: any) {
      console.warn(`[stage-close] Auto cause analysis failed for case ${caseId}: ${err?.message || err}`);
    } finally {
      causeInFlight.delete(caseId);
    }
  })().catch((err: any) => {
    console.warn(`[stage-close] Stage-close processing failed for case ${caseId}: ${err?.message || err}`);
  });
}
