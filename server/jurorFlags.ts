/**
 * Unresolved-flag queue (Lewis/Whigham training directive, Section 5).
 *
 * In Whigham, all 36 jurors raised hands on the global wreck question and not
 * one raise was valenced — five deliberating jurors sat on nothing but an
 * unvalenced raise, and a witness's former patient deliberated with his
 * connection unresolved. This module derives, deterministically and
 * server-side, a per-juror list of UNRESOLVED FLAGS: any hand raise, nod, or
 * note on a case-critical topic that lacks a valence-resolving answer, plus a
 * panel-level rollup ranked by case-dispositive value (not chronology).
 *
 * Deliberately rule-based (no AI call): the queue must be cheap, instant, and
 * identical on every load. A recorded follow-up answer counts as development;
 * judging the *quality* of a valence answer stays with counsel.
 */

export interface FlagJuror {
  number: number;
  name: string;
}

export interface FlagQuestion {
  questionNumber: number;
  originalText: string;
  rephrase?: string | null;
}

export interface FlagResponse {
  jurorNumber: number;
  questionId: number | null;
  responseText: string;
  questionSummary?: string | null;
  followUps?: Array<{ question: string; answer: string }> | null;
}

export interface FlagSource {
  /** 'raise' | 'nod' | 'note' | 'verbal' | 'follow-up' */
  kind: string;
  text: string;
  question: string;
}

export interface JurorTopicFlag {
  jurorNumber: number;
  jurorName: string;
  topic: string;
  label: string;
  priority: number;
  resolved: boolean;
  resolvedBy?: string;
  sources: FlagSource[];
}

export interface FlagTopicRollup {
  topic: string;
  label: string;
  priority: number;
  phrase: string;
  unresolvedCount: number;
  resolvedCount: number;
  unresolvedJurors: Array<{ number: number; name: string }>;
}

export interface CaseFlagsResult {
  posture: "conceded-or-weak-liability" | "disputed";
  summaryLine: string;
  totalUnresolved: number;
  topics: FlagTopicRollup[];
  flags: JurorTopicFlag[];
}

/**
 * Deterministic liability-posture detector for the case summary. Drives the
 * conceded-liability commitment question set and the damages-posture flag.
 */
export function detectConcededOrWeakLiability(summary: string): boolean {
  return /liability\s+(is|was)?\s*(conceded|admitted|not\s+(in\s+)?dispute|undisputed|stipulated)|concede[sd]?\s+(liability|fault)|admit(s|ted)?\s+(liability|fault|negligence)|stipulated?\s+(to\s+)?(liability|fault)|only\s+(dispute|issue|question)\s+is\s+(the\s+)?(extent\s+of\s+)?(damages|injur)|damages[-\s]only|liability\s+is\s+weak|weak\s+(on\s+)?liability/i.test(
    summary,
  );
}

interface TopicDef {
  id: string;
  label: string;
  /** Lower = more case-dispositive. Rollup and summary line follow this order. */
  priority: number;
  patterns: RegExp[];
  phrase: (n: number) => string;
}

/**
 * Case-critical topics, ranked by case-dispositive value: an unresolved
 * party/witness connection is cause-level (McGill deliberated as a witness's
 * former patient); claim history drives strikes; the raise topics follow.
 */
export const CASE_CRITICAL_TOPICS: TopicDef[] = [
  {
    id: "witness-connection",
    label: "Party/witness connection",
    priority: 1,
    patterns: [
      /\b(know|knows|knew|recognize[sd]?|familiar\s+with|related\s+to|treated\s+by|patient\s+of)\b[^.?!]*\b(witness|witnesses|plaintiff|defendant|part(y|ies)|attorney|counsel|doctor|dr\.?)\b/i,
      /\bwitness\s+list\b/i,
      /\bany\s+of\s+the\s+(witnesses|parties|lawyers|attorneys|doctors)\b/i,
      /\bformer\s+patient\b/i,
      /\b(my|his|her)\s+(surgeon|physician|treating\s+doctor)\b/i,
    ],
    phrase: (n) => `${n} party/witness connection${n === 1 ? "" : "s"} unresolved`,
  },
  {
    id: "injury-claim",
    label: "Injury/claim history",
    priority: 2,
    patterns: [
      /\b(claim|claims|claimed|lawsuit|lawsuits|sued|sue|suing|settled?|settlement|filed\s+suit|workers'?\s*comp\w*|hired\s+(a\s+|an\s+)?(lawyer|attorney)|plaintiff\s+in)\b/i,
    ],
    phrase: (n) => `${n} injury/claim histor${n === 1 ? "y" : "ies"} unvalenced`,
  },
  {
    id: "damages-posture",
    label: "No damages-posture answer",
    priority: 3,
    patterns: [], // pseudo-topic: computed, only when liability is conceded/weak
    phrase: (n) => `${n} juror${n === 1 ? "" : "s"} with no damages-posture answer`,
  },
  {
    id: "disability-filing",
    label: "Disability filing",
    priority: 4,
    patterns: [/\b(disabilit\w+|disabled|ssdi|ssi)\b/i],
    phrase: (n) => `${n} disability filing${n === 1 ? "" : "s"} unexplored`,
  },
  {
    id: "accident-history",
    label: "Accident/wreck raise",
    priority: 5,
    patterns: [
      /\b(wrecks?|accidents?|collisions?|crash(es)?|rear[-\s]?end\w*|mva|fender[-\s]?bender|hit\s+from\s+behind|motor\s+vehicle)\b/i,
    ],
    phrase: (n) => `${n} undeveloped accident/wreck raise${n === 1 ? "" : "s"}`,
  },
  {
    id: "medical-treatment",
    label: "Medical treatment history",
    priority: 6,
    patterns: [
      /\b(chiropract\w+|physical\s+therap\w+|surger\w+|injections?|pain\s+management|mri|x[-\s]?rays?|treated\s+(for|with|by)|treatment|therapy)\b/i,
    ],
    phrase: (n) => `${n} medical-treatment histor${n === 1 ? "y" : "ies"} undeveloped`,
  },
  {
    id: "legal-field-ties",
    label: "Legal-field ties",
    priority: 7,
    patterns: [
      /\b(paralegal|law\s+firm|law\s+school|legal\s+(field|assistant|secretary|profession)|court\s+(clerk|reporter)|insurance\s+adjuster)\b/i,
      /\b(am|is|was|works?\s+as|work\s+for|employed\s+(by|as))\s+(a\s+|an\s+)?(lawyer|attorney|judge)\b/i,
      /\b(husband|wife|spouse|son|daughter|brother|sister|mother|father|family\s+member)\s+(is|was|works\s+as)\s+(a\s+|an\s+)?(lawyer|attorney|judge|paralegal)\b/i,
    ],
    phrase: (n) => `${n} legal-field tie${n === 1 ? "" : "s"} unexplored`,
  },
];

const TOPIC_BY_ID = new Map(CASE_CRITICAL_TOPICS.map((t) => [t.id, t]));

/** Classify free text against the case-critical topics (pseudo-topics excluded). */
export function classifyTopics(text: string): string[] {
  if (!text || !text.trim()) return [];
  const hits: string[] = [];
  for (const topic of CASE_CRITICAL_TOPICS) {
    if (topic.patterns.length === 0) continue;
    if (topic.patterns.some((p) => p.test(text))) hits.push(topic.id);
  }
  return hits;
}

const REACTION_RX = /^\[(Hand|Nod|Shake|Silent|Note)\]\s*/;
const NEGATIVE_LEAD_RX = /^\s*(no|never|none|nope|not\s+really|n\/a)\b/i;
const DAMAGES_POSTURE_RX =
  /\b(damages|medical\s+bills|bills[-\s]?only|only\s+the\s+bills|compensat\w*|award\w*|causation|defense\s+verdict|verdict\s+for\s+the\s+defen\w*|pain\s+and\s+suffering|general\s+damages)\b/i;

/**
 * Classify a single recorded response against the case-critical topics,
 * honoring the response kind: raises/nods affirm the QUESTION, shakes/silence
 * affirm nothing, notes and verbal answers are classified on their own text
 * too, and a negative-lead verbal ("No, never…") does not affirm the question
 * topic even though its text may reveal another ("No, but my brother sued").
 */
export function classifyResponseTopics(questionText: string, responseText: string): string[] {
  const reactionMatch = responseText.match(REACTION_RX);
  const kind = reactionMatch ? reactionMatch[1] : null;
  const body = reactionMatch ? responseText.slice(reactionMatch[0].length).trim() : responseText.trim();
  if (kind === "Shake" || kind === "Silent") return [];
  if (kind === "Hand" || kind === "Nod") return classifyTopics(questionText);
  if (kind === "Note") return classifyTopics(`${questionText} ${body}`);
  const fromQuestion = NEGATIVE_LEAD_RX.test(body) ? [] : classifyTopics(questionText);
  return Array.from(new Set([...fromQuestion, ...classifyTopics(body)]));
}

/** A follow-up answer with actual content counts as development of the flag. */
const MIN_FOLLOWUP_ANSWER_LEN = 2;
/** A verbal answer this long is a developed narrative, not a bare raise. */
const MIN_NARRATIVE_LEN = 80;

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

interface FlagAccumulator {
  sources: FlagSource[];
  hasFollowUpAnswer: boolean;
  hasNarrative: boolean;
}

/**
 * Derive per-juror topic flags and the ranked panel rollup from recorded
 * responses (verbal answers, reaction rows, notes, and follow-up answers).
 */
export function computeCaseFlags(input: {
  caseSummary: string;
  jurors: FlagJuror[];
  questions: FlagQuestion[];
  responses: FlagResponse[];
  courtDismissed?: number[] | null;
}): CaseFlagsResult {
  const dismissed = new Set(input.courtDismissed ?? []);
  const activeJurors = input.jurors.filter((j) => !dismissed.has(j.number));
  const jurorByNumber = new Map(activeJurors.map((j) => [j.number, j]));
  const questionByNumber = new Map(input.questions.map((q) => [q.questionNumber, q]));
  const posture = detectConcededOrWeakLiability(input.caseSummary)
    ? ("conceded-or-weak-liability" as const)
    : ("disputed" as const);

  const acc = new Map<string, FlagAccumulator>();
  const touch = (jurorNumber: number, topicId: string): FlagAccumulator => {
    const key = `${jurorNumber}:${topicId}`;
    let entry = acc.get(key);
    if (!entry) {
      entry = { sources: [], hasFollowUpAnswer: false, hasNarrative: false };
      acc.set(key, entry);
    }
    return entry;
  };

  for (const response of input.responses) {
    if (!jurorByNumber.has(response.jurorNumber)) continue;

    const question =
      response.questionId != null ? questionByNumber.get(response.questionId) : undefined;
    const questionText = [
      question?.originalText ?? "",
      question?.rephrase ?? "",
      response.questionSummary ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    const questionRef = excerpt(response.questionSummary || question?.originalText || "(no question)", 100);

    const reactionMatch = response.responseText.match(REACTION_RX);
    const reactionKind = reactionMatch ? reactionMatch[1] : null;
    const body = reactionMatch
      ? response.responseText.slice(reactionMatch[0].length).trim()
      : response.responseText.trim();

    const topics = classifyResponseTopics(questionText, response.responseText);
    let sourceKind = "verbal";
    let sourceText = excerpt(body, 120);
    if (reactionKind === "Hand") {
      sourceKind = "raise";
      sourceText = "Raised hand";
    } else if (reactionKind === "Nod") {
      sourceKind = "nod";
      sourceText = "Head nod";
    } else if (reactionKind === "Note") {
      sourceKind = "note";
    }

    const followUps = (response.followUps ?? []).filter(
      (f) => f.answer && f.answer.trim().length >= MIN_FOLLOWUP_ANSWER_LEN,
    );
    const isNarrative = sourceKind === "verbal" && body.length >= MIN_NARRATIVE_LEN;

    for (const topicId of topics) {
      const entry = touch(response.jurorNumber, topicId);
      entry.sources.push({ kind: sourceKind, text: sourceText, question: questionRef });
      if (followUps.length > 0) entry.hasFollowUpAnswer = true;
      if (isNarrative) entry.hasNarrative = true;
    }

    // Follow-up answers are classified in their own right: an answer that
    // reveals a settled claim both resolves the raise AND records the claim.
    for (const fu of followUps) {
      const fuTopics = classifyTopics(`${fu.question} ${fu.answer}`);
      for (const topicId of fuTopics) {
        const entry = touch(response.jurorNumber, topicId);
        entry.sources.push({
          kind: "follow-up",
          text: excerpt(fu.answer, 120),
          question: excerpt(fu.question || questionRef, 100),
        });
        entry.hasFollowUpAnswer = true;
      }
    }
  }

  const flags: JurorTopicFlag[] = [];
  for (const [key, entry] of Array.from(acc.entries())) {
    const [jurorNumberStr, topicId] = key.split(/:(.+)/, 2) as [string, string];
    const jurorNumber = Number(jurorNumberStr);
    const juror = jurorByNumber.get(jurorNumber)!;
    const topic = TOPIC_BY_ID.get(topicId)!;
    const resolved = entry.hasFollowUpAnswer || entry.hasNarrative;
    flags.push({
      jurorNumber,
      jurorName: juror.name,
      topic: topicId,
      label: topic.label,
      priority: topic.priority,
      resolved,
      resolvedBy: entry.hasFollowUpAnswer
        ? "follow-up answer recorded"
        : entry.hasNarrative
          ? "developed narrative answer"
          : undefined,
      sources: entry.sources.slice(0, 4),
    });
  }

  // Damages-posture pseudo-flag: in a conceded/weak-liability case, every
  // active juror with no damages-posture answer anywhere on their record is
  // flagged — the Whigham panel had NO juror locked to a damages posture.
  if (posture === "conceded-or-weak-liability") {
    const topic = TOPIC_BY_ID.get("damages-posture")!;
    const textByJuror = new Map<number, string[]>();
    for (const r of input.responses) {
      if (!jurorByNumber.has(r.jurorNumber)) continue;
      const parts = textByJuror.get(r.jurorNumber) ?? [];
      if (!REACTION_RX.test(r.responseText) || r.responseText.startsWith("[Note]")) {
        parts.push(r.responseText);
      }
      for (const fu of r.followUps ?? []) parts.push(`${fu.question} ${fu.answer}`);
      textByJuror.set(r.jurorNumber, parts);
    }
    for (const juror of activeJurors) {
      const hasPostureAnswer = (textByJuror.get(juror.number) ?? []).some((t) =>
        DAMAGES_POSTURE_RX.test(t),
      );
      if (!hasPostureAnswer) {
        flags.push({
          jurorNumber: juror.number,
          jurorName: juror.name,
          topic: topic.id,
          label: topic.label,
          priority: topic.priority,
          resolved: false,
          sources: [],
        });
      }
    }
  }

  flags.sort((a, b) => a.priority - b.priority || a.jurorNumber - b.jurorNumber);

  const topics: FlagTopicRollup[] = [];
  for (const topic of CASE_CRITICAL_TOPICS) {
    const topicFlags = flags.filter((f) => f.topic === topic.id);
    if (topicFlags.length === 0) continue;
    const unresolved = topicFlags.filter((f) => !f.resolved);
    topics.push({
      topic: topic.id,
      label: topic.label,
      priority: topic.priority,
      phrase: topic.phrase(unresolved.length),
      unresolvedCount: unresolved.length,
      resolvedCount: topicFlags.length - unresolved.length,
      unresolvedJurors: unresolved.map((f) => ({ number: f.jurorNumber, name: f.jurorName })),
    });
  }

  const summaryLine = topics
    .filter((t) => t.unresolvedCount > 0)
    .map((t) => t.phrase)
    .join("; ");
  const totalUnresolved = flags.filter((f) => !f.resolved).length;

  return { posture, summaryLine, totalUnresolved, topics, flags };
}
