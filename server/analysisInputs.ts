import { createHash } from "crypto";

/**
 * Delta re-analysis + model tiering (Lewis/Whigham Section 9):
 *  - each juror's analysis is keyed to a hash of everything that feeds the
 *    prompt (profile, notes, responses, enrichment) — regenerate only when
 *    the hash changes;
 *  - jurors with fewer than 2-3 substantive responses (and no notes or
 *    verified background) get the fast model with the short template; the
 *    full model is reserved for jurors with real signal. A thin juror
 *    auto-upgrades on the next run once its record grows, because the hash
 *    changes and the tier is recomputed from the new record.
 */

export interface HashResponseData {
  questionText: string | null;
  questionSummary: string | null;
  responseText: string;
  side: string;
  followUps: Array<{ question: string; answer: string }>;
}

/**
 * Case posture is a prompt input (caseContextBlock feeds it to the model),
 * so it MUST be part of the hash: editing the summary, side, or trait lists
 * has to invalidate every cached analysis in the case.
 */
export interface AnalysisHashCaseContext {
  name: string;
  areaOfLaw: string;
  summary: string;
  side: string;
  favorableTraits: string[];
  riskTraits: string[];
}

export interface AnalysisHashInput {
  caseContext: AnalysisHashCaseContext;
  juror: {
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
  };
  responses: HashResponseData[];
  /** Enrichment text shown to the model ('' / null / undefined all hash equal). */
  enrichedText?: string | null;
}

/**
 * Canonical sha256 over the analysis inputs. Field order is fixed by
 * construction; '' and null are normalized to null for the nullable response
 * fields so the client-payload path and the DB-loaded path (which may store
 * '' where the client sends null) produce identical hashes.
 */
export function computeAnalysisInputHash(input: AnalysisHashInput): string {
  const j = input.juror;
  const cc = input.caseContext;
  const canonical = {
    caseContext: {
      name: cc.name,
      areaOfLaw: cc.areaOfLaw,
      summary: cc.summary,
      side: cc.side,
      favorableTraits: [...cc.favorableTraits],
      riskTraits: [...cc.riskTraits],
    },
    juror: {
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
    },
    responses: input.responses.map((r) => ({
      questionText: r.questionText || null,
      questionSummary: r.questionSummary || null,
      responseText: r.responseText,
      side: r.side,
      followUps: (r.followUps || []).map((f) => ({ question: f.question, answer: f.answer })),
    })),
    enrichedText: input.enrichedText || null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Minimum trimmed length for a verbal response to count as substantive. */
const SUBSTANTIVE_MIN_CHARS = 15;

/**
 * Verbal (non-bracketed) responses long enough to carry signal. Bracketed
 * entries ([Hand], [Nod], [Silent] ...) are behavioral observations — they
 * matter, but they are not substantive testimony for tiering purposes.
 */
export function countSubstantiveResponses(responses: Array<{ responseText: string }>): number {
  return responses.filter(
    (r) => !r.responseText.startsWith("[") && r.responseText.trim().length >= SUBSTANTIVE_MIN_CHARS,
  ).length;
}

export interface ThinRecordInput {
  responses: Array<{ responseText: string }>;
  notes?: string | null;
  enrichedText?: string | null;
}

/**
 * Thin-record test for model tiering. A record is thin when it has fewer
 * than 2-3 substantive responses (0-1 always; exactly 2 only when both are
 * short) AND no meaningful attorney notes AND no enrichment findings.
 * Notes or verified background always force the full model — weighing those
 * sources is exactly where the cheap model cuts corners.
 */
export function isThinRecord(input: ThinRecordInput): boolean {
  const substantive = countSubstantiveResponses(input.responses);
  if (substantive >= 3) return false;
  const verbalChars = input.responses
    .filter((r) => !r.responseText.startsWith("["))
    .reduce((sum, r) => sum + r.responseText.trim().length, 0);
  if (substantive === 2 && verbalChars >= 200) return false;
  const hasNotes = (input.notes ?? "").trim().length >= 40;
  const hasEnrichment = (input.enrichedText ?? "").trim().length > 0;
  return !hasNotes && !hasEnrichment;
}
