/**
 * Voir dire document contract — canonical Lewis/Whigham content enforced in
 * code, never left to model compliance.
 *
 * Covers Section 6 of the agent training doc:
 *  - PROTECT-LIST DISCIPLINE: every PRESERVE-list juror carries the explicit
 *    "no further open-ended bias questions" instruction plus the two
 *    rehabilitation questions that restore them.
 *  - DAMAGES MODULE: when liability is conceded/weak, the lawful lock-in
 *    questions and the group-rehabilitation warning are guaranteed by code.
 */

/** The two rehabilitation questions that restore a favorable juror after a cause record is built. */
export const REHABILITATION_PAIR: readonly [string, string] = [
  "If the Court instructs you on the law that applies to this case, can you set your own experience aside and follow that instruction?",
  "Can you decide this case based solely on the evidence presented in this courtroom and nothing else?",
];

/** Canonical protect-list discipline line attached to every PRESERVE-list juror. */
export const PROTECT_DISCIPLINE =
  "Do not ask this juror any further open-ended bias questions. Losing a favorable juror to cause costs a seat without costing the opponent a strike. If opposing counsel builds a cause record, use the two rehabilitation questions below.";

/**
 * Lawful damages lock-in questions for conceded/weak-liability cases.
 * The first two are the commitment set shared with the follow-up engine;
 * the third covers weighing treating-record entries against testimony.
 */
export const DAMAGES_LOCK_IN_QUESTIONS: readonly string[] = [
  "If the evidence does not prove the collision caused the claimed injuries, could you return a verdict for the defendant?",
  "Could you award only the medical bills you find were actually caused by the collision?",
  "If the treating records show gaps in treatment, notes that the patient reported relief, or prior or subsequent accidents, could you weigh those entries against what a witness says from the stand?",
];

/** Canonical warning: group rehabilitation immunizes claimant-history jurors against cause. */
export const GROUP_REHAB_WARNING =
  "Lock these jurors in on the record BEFORE opposing counsel's rehabilitation pass. Leading group rehabilitation (\"can you all be fair?\") permanently immunizes claimant-history jurors against cause — once the panel nods along, the record is gone.";

export interface ProtectListEntry {
  jurorNumber: number;
  jurorName: string;
  whyFavorable: string;
  discipline: string;
  rehabilitationQuestions: string[];
}

export interface DamagesLockIns {
  applicable: boolean;
  questions: string[];
  lockInFirstJurors: Array<{ jurorNumber: number; jurorName: string; why: string }>;
  groupRehabWarning: string;
}

export interface VoirDireContractDoc {
  questions: Array<{ id: number; originalText: string; rephrase: string; followUps: string[]; module: string }>;
  strikeGuide: Array<{ jurorNumber: number; jurorName: string; riskLevel: string; primaryConcern: string; recommendation: string }>;
  protectList: ProtectListEntry[];
  damagesLockIns: DamagesLockIns;
}

const PRESERVE_RX = /\b(keep|preserve|protect)\b/i;
const EXPERIENCE_RX = /experience/i;

/**
 * The four funnel stages detectable in code by keyword. The fifth stage —
 * the case-specific mirror question — depends on the case facts and cannot
 * be keyword-checked reliably; it is enforced by the verbatim prompt
 * directive plus the retry validation pass.
 */
export const FUNNEL_STAGES: ReadonlyArray<{ id: string; label: string; rx: RegExp }> = [
  {
    id: "involvement",
    label: "involvement (been in / involved in / party to the experience)",
    rx: /\b(involved|involvement|party to|taken part|been (?:in|through)|gone through)\b/i,
  },
  {
    id: "injury",
    label: "injury arising from the experience",
    rx: /\b(injur\w*|hurt|harmed?)\b/i,
  },
  {
    id: "claim",
    label: "claim or legal action brought",
    rx: /\b(claims?|lawsuits?|su(?:e|ed|ing)|legal action|settlements?|filed|demand letter)\b/i,
  },
  {
    id: "satisfaction",
    label: "satisfaction/grievance with the outcome",
    rx: /\b(satisf\w*|dissatisf\w*|grievance|outcomes?|turned? out|resol(?:ved?|ution)|treated fairly|unfair\w*|felt about)\b/i,
  },
];

function experienceQuestions(questions: VoirDireContractDoc["questions"]) {
  return questions.filter((q) => EXPERIENCE_RX.test(q.module));
}

function questionSearchText(q: VoirDireContractDoc["questions"][number]): string {
  return [q.originalText, q.rephrase, ...(q.followUps || [])].join(" ");
}

/**
 * Keyword coverage of the experience funnel across Experience-module
 * questions: which stages never appear, and whether the stages' first
 * appearances follow funnel order (involvement → injury → claim →
 * satisfaction/grievance). Order is a retryable violation only — combined
 * questions legitimately tie stages — but a missing stage is fatal.
 */
export function funnelStageCoverage(questions: VoirDireContractDoc["questions"]): {
  experienceCount: number;
  missingStages: string[];
  orderViolations: string[];
} {
  const texts = experienceQuestions(questions).map(questionSearchText);
  const firstIndex = new Map<string, number>();
  for (const stage of FUNNEL_STAGES) {
    const idx = texts.findIndex((t) => stage.rx.test(t));
    if (idx >= 0) firstIndex.set(stage.id, idx);
  }
  const missingStages = FUNNEL_STAGES.filter((s) => !firstIndex.has(s.id)).map((s) => s.label);
  const orderViolations: string[] = [];
  let prev: { id: string; idx: number } | null = null;
  for (const stage of FUNNEL_STAGES) {
    const idx = firstIndex.get(stage.id);
    if (idx === undefined) continue;
    if (prev && idx < prev.idx) {
      orderViolations.push(
        `The ${stage.id} stage first appears at experience question ${idx + 1}, before the ${prev.id} stage (question ${prev.idx + 1}); the funnel must run involvement → injury → claim → satisfaction/grievance → case-specific mirror.`,
      );
    }
    prev = { id: stage.id, idx };
  }
  return { experienceCount: texts.length, missingStages, orderViolations };
}

export function normalizeQuestionText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isPreserveRecommendation(recommendation: string): boolean {
  return PRESERVE_RX.test(recommendation);
}

/**
 * Retryable violations of the voir dire contract. These go back to the model
 * once as explicit corrections; anything still fixable in code afterwards is
 * handled by enforceVoirDireContract, and anything that is not (the
 * experience funnel) fails loud.
 */
export function validateVoirDireDraft(
  doc: VoirDireContractDoc,
  opts: { jurorNumbers: Set<number> },
): string[] {
  const violations: string[] = [];

  const coverage = funnelStageCoverage(doc.questions);
  if (coverage.experienceCount < 4) {
    violations.push(
      `Only ${coverage.experienceCount} Experience-based question(s). The experience section must FUNNEL — involvement, then injury, then claim brought, then satisfaction/grievance, then the case-specific mirror question — which requires at least 4 distinct Experience-module questions. Never rely on a single global experience question.`,
    );
  }
  for (const label of coverage.missingStages) {
    violations.push(
      `The experience funnel never reaches its ${label} stage — add an Experience-module question that walks the panel through it.`,
    );
  }
  violations.push(...coverage.orderViolations);

  const protectByNumber = new Set(doc.protectList.map((p) => p.jurorNumber));
  for (const sg of doc.strikeGuide) {
    if (isPreserveRecommendation(sg.recommendation) && !protectByNumber.has(sg.jurorNumber)) {
      violations.push(
        `Strike guide recommends preserving juror #${sg.jurorNumber} (${sg.jurorName}) but the protectList has no entry for them. Every PRESERVE-list juror needs a protectList entry with whyFavorable.`,
      );
    }
  }

  for (const p of doc.protectList) {
    if (!opts.jurorNumbers.has(p.jurorNumber)) {
      violations.push(`protectList references juror #${p.jurorNumber} who is not on the panel.`);
    } else if (!p.whyFavorable.trim()) {
      violations.push(`protectList entry for juror #${p.jurorNumber} is missing whyFavorable.`);
    }
  }

  for (const l of doc.damagesLockIns.lockInFirstJurors) {
    if (!opts.jurorNumbers.has(l.jurorNumber)) {
      violations.push(`damagesLockIns.lockInFirstJurors references juror #${l.jurorNumber} who is not on the panel.`);
    }
  }

  return violations;
}

/**
 * Violations that survive enforceVoirDireContract and must fail loud:
 * a funnel that is too thin or that never reaches a detectable stage
 * cannot be repaired in code. (Stage ORDER stays retryable-only — it is
 * a heuristic over combined questions.)
 */
export function fatalViolationsAfterEnforce(doc: VoirDireContractDoc): string[] {
  const coverage = funnelStageCoverage(doc.questions);
  const fatal: string[] = [];
  if (coverage.experienceCount < 4) {
    fatal.push(
      `Generated voir dire relies on ${coverage.experienceCount} Experience-based question(s); the funnel requires at least 4 (involvement → injury → claim → satisfaction/grievance → case mirror).`,
    );
  }
  if (coverage.missingStages.length > 0) {
    fatal.push(`Generated voir dire's experience funnel never reaches: ${coverage.missingStages.join("; ")}.`);
  }
  return fatal;
}

/**
 * Code-guaranteed content. Runs after (re)generation regardless of model
 * compliance:
 *  - every protect-list entry gets the canonical discipline line and exactly
 *    the two canonical rehabilitation questions;
 *  - PRESERVE-recommended strike-guide jurors missing from the protect list
 *    are synthesized from the model's own strike-guide rationale;
 *  - entries referencing jurors not on the panel are dropped;
 *  - the damages module applicability is decided by code (liability posture),
 *    the canonical lock-in questions always lead, and the group-rehabilitation
 *    warning is constant.
 * Returns notes describing every code-enforced correction (logged upstream).
 */
export function enforceVoirDireContract(
  doc: VoirDireContractDoc,
  opts: { concededOrWeak: boolean; jurorNamesByNumber: Map<number, string> },
): { doc: VoirDireContractDoc; notes: string[] } {
  const notes: string[] = [];
  const known = opts.jurorNamesByNumber;

  let protectList = doc.protectList.filter((p) => {
    if (!known.has(p.jurorNumber)) {
      notes.push(`Dropped protectList entry for unknown juror #${p.jurorNumber}.`);
      return false;
    }
    return true;
  });

  const covered = new Set(protectList.map((p) => p.jurorNumber));
  for (const sg of doc.strikeGuide) {
    if (!isPreserveRecommendation(sg.recommendation)) continue;
    if (!known.has(sg.jurorNumber) || covered.has(sg.jurorNumber)) continue;
    protectList.push({
      jurorNumber: sg.jurorNumber,
      jurorName: known.get(sg.jurorNumber) || sg.jurorName,
      whyFavorable: sg.recommendation.trim() || sg.primaryConcern.trim() || "Marked preserve in strike guide.",
      discipline: PROTECT_DISCIPLINE,
      rehabilitationQuestions: [...REHABILITATION_PAIR],
    });
    covered.add(sg.jurorNumber);
    notes.push(`Synthesized protectList entry for PRESERVE-recommended juror #${sg.jurorNumber} from strike guide.`);
  }

  protectList = protectList.map((p) => ({
    ...p,
    jurorName: known.get(p.jurorNumber) || p.jurorName,
    discipline: PROTECT_DISCIPLINE,
    rehabilitationQuestions: [...REHABILITATION_PAIR],
  }));

  let damagesLockIns: DamagesLockIns;
  if (!opts.concededOrWeak) {
    if (doc.damagesLockIns.applicable || doc.damagesLockIns.questions.length > 0) {
      notes.push("Cleared damages lock-in module: liability posture is disputed (code-decided).");
    }
    damagesLockIns = { applicable: false, questions: [], lockInFirstJurors: [], groupRehabWarning: "" };
  } else {
    const seen = new Set(DAMAGES_LOCK_IN_QUESTIONS.map(normalizeQuestionText));
    const extras: string[] = [];
    for (const q of doc.damagesLockIns.questions) {
      const norm = normalizeQuestionText(q);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      extras.push(q);
    }
    const lockInFirstJurors = doc.damagesLockIns.lockInFirstJurors.filter((l) => {
      if (!known.has(l.jurorNumber)) {
        notes.push(`Dropped damages lock-in target for unknown juror #${l.jurorNumber}.`);
        return false;
      }
      return true;
    }).map((l) => ({ ...l, jurorName: known.get(l.jurorNumber) || l.jurorName }));
    damagesLockIns = {
      applicable: true,
      questions: [...DAMAGES_LOCK_IN_QUESTIONS, ...extras.slice(0, 3)],
      lockInFirstJurors,
      groupRehabWarning: GROUP_REHAB_WARNING,
    };
  }

  return { doc: { ...doc, protectList, damagesLockIns }, notes };
}
