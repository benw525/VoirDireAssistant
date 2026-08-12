/**
 * Deterministic panel prognosis metrics — computed in code, never by the
 * model. The LLM writes reasoning FROM these numbers; it does not produce
 * them (Lewis/Whigham Section 6, PANEL PROGNOSIS).
 */

export const CLAIMANT_HISTORY_TOPIC_IDS: readonly string[] = [
  "injury-claim",
  "accident-history",
  "disability-filing",
];

export interface MetricsJuror {
  number: number;
  name: string;
  occupation?: string | null;
  employer?: string | null;
}

export interface MetricsFlag {
  jurorNumber: number;
  topicId: string;
  resolved?: boolean;
}

export interface OccupationMatch {
  jurorNumber: number;
  jurorName: string;
  category: "clinical" | "advocacy";
  matched: string;
}

export interface PanelMetrics {
  panelSize: number;
  dismissedCount: number;
  jurySize: number;
  strikesPerSide: number;
  claimantHistory: {
    count: number;
    density: number;
    jurorNumbers: number[];
  };
  clinicalAdvocacy: {
    count: number;
    density: number;
    matches: OccupationMatch[];
  };
  unresolvedFlagCount: number;
  adverseSurvivalFloor: number;
  settlementPostureWarning: string | null;
}

const CLINICAL_PATTERNS: Array<{ rx: RegExp; label: string }> = [
  { rx: /\bnurs\w*\b/i, label: "nursing" },
  { rx: /\b(rn|lpn|cna|emt)\b/i, label: "licensed medical" },
  { rx: /\bparamedic\w*\b/i, label: "paramedic" },
  { rx: /\b(physician|doctor|md)\b/i, label: "physician" },
  { rx: /\btherap\w*\b/i, label: "therapy" },
  { rx: /\bchiropract\w*\b/i, label: "chiropractic" },
  { rx: /\bhospital\w*\b/i, label: "hospital" },
  { rx: /\b(health\s*care|healthcare|home\s+health)\b/i, label: "healthcare" },
  { rx: /\bmedical\b/i, label: "medical" },
  { rx: /\bpharma\w*\b/i, label: "pharmacy" },
  { rx: /\bdental\b|\bdentist\w*\b/i, label: "dental" },
  { rx: /\bcaregiv\w*\b/i, label: "caregiving" },
  { rx: /\bclinic\w*\b/i, label: "clinic" },
];

const ADVOCACY_PATTERNS: Array<{ rx: RegExp; label: string }> = [
  { rx: /\bsocial\s+work\w*\b/i, label: "social work" },
  { rx: /\bcounsel(or|ing)\b/i, label: "counseling" },
  { rx: /\bcase\s+manage\w*\b/i, label: "case management" },
  { rx: /\bdisabilit\w+\s+(advocate|services|coordinator)\b/i, label: "disability services" },
  { rx: /\b(non[-\s]?profit|nonprofit)\b/i, label: "nonprofit" },
  { rx: /\b(minist\w+|pastor\w*|chaplain\w*|clergy)\b/i, label: "ministry" },
  { rx: /\bunion\s+(rep\w*|stew\w*|organiz\w*)\b/i, label: "union advocacy" },
  { rx: /\b(victim|patient)\s+advocat\w*\b/i, label: "advocacy" },
  { rx: /\bspecial\s+ed\w*\b/i, label: "special education" },
];

export function classifyOccupation(
  occupation: string,
  employer: string,
): { category: "clinical" | "advocacy"; matched: string } | null {
  const text = `${occupation} ${employer}`;
  for (const p of CLINICAL_PATTERNS) {
    if (p.rx.test(text)) return { category: "clinical", matched: p.label };
  }
  for (const p of ADVOCACY_PATTERNS) {
    if (p.rx.test(text)) return { category: "advocacy", matched: p.label };
  }
  return null;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computePanelMetrics(input: {
  jurors: MetricsJuror[];
  flags: MetricsFlag[];
  courtDismissed?: number[] | null;
  jurySize?: number;
}): PanelMetrics {
  const jurySize = input.jurySize ?? 12;
  const dismissed = new Set(input.courtDismissed ?? []);
  const active = input.jurors.filter((j) => !dismissed.has(j.number));
  const activeNumbers = new Set(active.map((j) => j.number));
  const panelSize = active.length;

  const strikesPerSide = Math.max(0, Math.floor((panelSize - jurySize) / 2));

  const claimantSet = new Set<number>();
  let unresolvedFlagCount = 0;
  for (const f of input.flags) {
    if (!activeNumbers.has(f.jurorNumber)) continue;
    if (f.resolved !== true) unresolvedFlagCount++;
    if (CLAIMANT_HISTORY_TOPIC_IDS.includes(f.topicId)) {
      claimantSet.add(f.jurorNumber);
    }
  }
  const claimantNumbers = Array.from(claimantSet.values()).sort((a, b) => a - b);

  const matches: OccupationMatch[] = [];
  for (const j of active) {
    const hit = classifyOccupation(j.occupation || "", j.employer || "");
    if (hit) {
      matches.push({ jurorNumber: j.number, jurorName: j.name, category: hit.category, matched: hit.matched });
    }
  }

  const adverseSurvivalFloor = Math.max(0, claimantSet.size - strikesPerSide);
  const settlementPostureWarning =
    adverseSurvivalFloor > 0
      ? `${claimantSet.size} claimant-history juror${claimantSet.size === 1 ? "" : "s"} against ${strikesPerSide} peremptory strike${strikesPerSide === 1 ? "" : "s"} per side: at least ${adverseSurvivalFloor} will survive any strike plan and sit on this jury. That is settlement-posture information the client needs before openings, not after the verdict.`
      : null;

  return {
    panelSize,
    dismissedCount: input.jurors.length - panelSize,
    jurySize,
    strikesPerSide,
    claimantHistory: {
      count: claimantSet.size,
      density: panelSize > 0 ? round3(claimantSet.size / panelSize) : 0,
      jurorNumbers: claimantNumbers,
    },
    clinicalAdvocacy: {
      count: matches.length,
      density: panelSize > 0 ? round3(matches.length / panelSize) : 0,
      matches,
    },
    unresolvedFlagCount,
    adverseSurvivalFloor,
    settlementPostureWarning,
  };
}
