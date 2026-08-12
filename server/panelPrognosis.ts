/**
 * Panel prognosis — Lewis/Whigham Section 6, PANEL PROGNOSIS directive.
 *
 * Generated when the panel loads and again when responses close. All
 * arithmetic (densities, strike counts, adverse-survival floor, the
 * settlement-posture warning) is computed in code by panelMetrics; the model
 * only writes reasoning FROM those numbers — assets and their fragility,
 * both sides' likely strike targets, and the realistic best-case seated jury.
 */
import { claudeJson, CLAUDE_SONNET, AIOutputError } from "./anthropic";
import type { PanelMetrics } from "./panelMetrics";

export type PrognosisStage = "panel_load" | "responses_closed";

export interface PrognosisJuror {
  number: number;
  name: string;
  sex?: string | null;
  race?: string | null;
  birthDate?: string | null;
  occupation?: string | null;
  employer?: string | null;
}

export interface PanelPrognosis {
  stage: PrognosisStage;
  generatedAt: number;
  metrics: PanelMetrics;
  assets: Array<{ jurorNumber: number; jurorName: string; why: string; fragility: string }>;
  strikeTargets: {
    ours: Array<{ jurorNumber: number; jurorName: string; reason: string }>;
    theirs: Array<{ jurorNumber: number; jurorName: string; reason: string }>;
  };
  bestCaseSeatedJury: { jurorNumbers: number[]; assessment: string };
  narrative: string;
  settlementPostureWarning: string | null;
}

const PROGNOSIS_SYSTEM_PROMPT = `You are a jury selection strategist writing a PANEL PROGNOSIS for trial counsel.

PANEL PROGNOSIS (required output, generated when the panel loads and again
when responses close): claimant-history density, clinical/advocacy occupation
density, identified assets and their fragility, both sides' likely strike
targets, and the realistic best-case seated jury under optimal strikes. If the
arithmetic shows adverse jurors surviving any strike plan (e.g., 10+
claimant-adjacent jurors against 8-9 strikes), say so plainly — that is
settlement-posture information the client needs before openings, not after
the verdict.

NON-NEGOTIABLE ARITHMETIC RULES:
• You are given COMPUTED PANEL METRICS (counts, densities, strikes per side, adverse-survival floor). They were computed deterministically in code. Use them as given. Do NOT recompute, round differently, or invent different numbers.
• Every juror number you cite must exist on the panel provided.
• Fragility means: how easily this favorable juror could be lost (to a cause challenge, an opposing strike, or careless open-ended questioning).
• "ours" = strike targets for the side counsel represents; "theirs" = jurors opposing counsel will likely strike (usually counsel's assets).
• The best-case seated jury is the realistic 12 (or fewer, if the panel is smaller) that survive under OPTIMAL use of counsel's strikes, assuming opposing counsel also strikes optimally. Be realistic, not optimistic.
• bestCaseSeatedJury.jurorNumbers must contain EXACTLY the number of seats — the jury size, or the full active panel count if the panel is smaller — with no duplicate numbers.
• assets must contain at least one entry; even a bad panel has relative assets.
• When peremptory strikes exist (strikes per side > 0), name at least one strike target for EACH side.
• At panel load (no responses recorded yet) reason only from demographics, occupations, and any background research. When responses have closed, weight recorded raises and flags heavily.
• Do not fabricate risk or favorability — tie every claim to provided data.

Return ONLY a JSON object with this exact structure:
{
  "assets": [
    { "jurorNumber": 7, "jurorName": "Name", "why": "Why this juror is an asset for counsel's side", "fragility": "How this asset could be lost" }
  ],
  "strikeTargets": {
    "ours": [ { "jurorNumber": 3, "jurorName": "Name", "reason": "Why counsel should target this juror" } ],
    "theirs": [ { "jurorNumber": 7, "jurorName": "Name", "reason": "Why opposing counsel will target this juror" } ]
  },
  "bestCaseSeatedJury": { "jurorNumbers": [1, 2, 4], "assessment": "Plain-language assessment of the realistic best-case seated jury and what it means for trial posture" },
  "narrative": "The prognosis in plain language: panel composition, what the densities mean for this case, and what counsel should do about it before openings"
}`;

function metricsBlock(metrics: PanelMetrics): string {
  const lines = [
    `COMPUTED PANEL METRICS (deterministic — use as given):`,
    `• Active panel size: ${metrics.panelSize} (dismissed: ${metrics.dismissedCount}) | Jury size: ${metrics.jurySize} | Peremptory strikes per side: ${metrics.strikesPerSide}`,
    `• Claimant-history jurors: ${metrics.claimantHistory.count} of ${metrics.panelSize} (density ${(metrics.claimantHistory.density * 100).toFixed(1)}%)${metrics.claimantHistory.jurorNumbers.length ? ` — jurors #${metrics.claimantHistory.jurorNumbers.join(", #")}` : ""}`,
    `• Clinical/advocacy occupations: ${metrics.clinicalAdvocacy.count} of ${metrics.panelSize} (density ${(metrics.clinicalAdvocacy.density * 100).toFixed(1)}%)${metrics.clinicalAdvocacy.matches.length ? ` — ${metrics.clinicalAdvocacy.matches.map((m) => `#${m.jurorNumber} (${m.matched})`).join(", ")}` : ""}`,
    `• Unresolved juror flags: ${metrics.unresolvedFlagCount}`,
    `• Adverse-survival floor: ${metrics.adverseSurvivalFloor} claimant-history juror(s) mathematically survive any strike plan`,
  ];
  if (metrics.settlementPostureWarning) {
    lines.push(`• SETTLEMENT-POSTURE WARNING (already issued to counsel): ${metrics.settlementPostureWarning}`);
  }
  return lines.join("\n");
}

export interface PrognosisDraftAsset { jurorNumber?: unknown; jurorName?: unknown; why?: unknown; fragility?: unknown }
export interface PrognosisDraftTarget { jurorNumber?: unknown; jurorName?: unknown; reason?: unknown }
export interface PrognosisDraft {
  assets?: PrognosisDraftAsset[];
  strikeTargets?: { ours?: PrognosisDraftTarget[]; theirs?: PrognosisDraftTarget[] };
  bestCaseSeatedJury?: { jurorNumbers?: unknown; assessment?: unknown };
  narrative?: unknown;
}

const toStr = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Pure draft validation (exported for tests). Enforces:
 *  - every cited juror exists on the active panel;
 *  - at least one asset, each with why + fragility, no duplicates;
 *  - both sides' strike targets named whenever peremptories exist, no duplicates;
 *  - best-case seated jury has EXACTLY min(jurySize, activeCount) unique numbers;
 *  - a usable assessment and narrative.
 * Failures feed the one retry; if they persist, generation fails loud.
 */
export function validatePrognosisDraft(
  p: PrognosisDraft,
  opts: { validNumbers: Set<number>; activeCount: number; jurySize: number; strikesPerSide: number },
): string[] {
  const problems: string[] = [];
  const checkNumber = (n: unknown, where: string) => {
    const num = Number(n);
    if (!Number.isFinite(num) || !opts.validNumbers.has(num)) {
      problems.push(`${where} cites juror #${String(n)} who is not on the active panel.`);
    }
  };
  const checkDuplicates = (nums: number[], where: string) => {
    if (new Set(nums).size !== nums.length) problems.push(`${where} lists the same juror more than once.`);
  };

  const assets = p.assets || [];
  if (assets.length === 0 && opts.activeCount > 0) {
    problems.push("assets must identify at least one favorable juror (and how that asset could be lost) — even a bad panel has relative assets.");
  }
  for (const a of assets) {
    checkNumber(a.jurorNumber, "assets");
    if (!toStr(a.why).trim() || !toStr(a.fragility).trim()) problems.push(`assets entry #${String(a.jurorNumber)} is missing why or fragility.`);
  }
  checkDuplicates(assets.map((a) => Number(a.jurorNumber)), "assets");

  const ours = p.strikeTargets?.ours || [];
  const theirs = p.strikeTargets?.theirs || [];
  for (const t of ours) checkNumber(t.jurorNumber, "strikeTargets.ours");
  for (const t of theirs) checkNumber(t.jurorNumber, "strikeTargets.theirs");
  checkDuplicates(ours.map((t) => Number(t.jurorNumber)), "strikeTargets.ours");
  checkDuplicates(theirs.map((t) => Number(t.jurorNumber)), "strikeTargets.theirs");
  if (opts.strikesPerSide > 0 && opts.activeCount > 0) {
    if (ours.length === 0) problems.push(`strikeTargets.ours is empty; counsel has ${opts.strikesPerSide} peremptory strike(s) — name at least one target.`);
    if (theirs.length === 0) problems.push(`strikeTargets.theirs is empty; opposing counsel has ${opts.strikesPerSide} peremptory strike(s) — name at least one likely target.`);
  }

  const seatCount = Math.min(opts.jurySize, opts.activeCount);
  const bcn = p.bestCaseSeatedJury?.jurorNumbers;
  if (!Array.isArray(bcn)) {
    if (opts.activeCount > 0) problems.push(`bestCaseSeatedJury.jurorNumbers must list exactly ${seatCount} unique juror numbers.`);
  } else {
    const nums = bcn.map(Number);
    for (const n of nums) checkNumber(n, "bestCaseSeatedJury");
    checkDuplicates(nums, "bestCaseSeatedJury");
    if (nums.length !== seatCount) {
      problems.push(`bestCaseSeatedJury lists ${nums.length} juror(s); it must list exactly ${seatCount} (jury size ${opts.jurySize}, active panel ${opts.activeCount}).`);
    }
  }
  if (Array.isArray(bcn) && bcn.length > 0 && !toStr(p.bestCaseSeatedJury?.assessment).trim()) {
    problems.push("bestCaseSeatedJury.assessment is missing.");
  }
  if (!toStr(p.narrative).trim() || toStr(p.narrative).trim().length < 40) {
    problems.push("narrative is missing or too thin to be useful.");
  }
  return problems;
}

export async function generatePanelPrognosis(opts: {
  stage: PrognosisStage;
  caseInfo: { areaOfLaw: string; summary: string; side: string; favorableTraits: string[]; riskTraits: string[] };
  jurors: PrognosisJuror[];
  metrics: PanelMetrics;
  flagLines: string[];
  courtDismissed?: number[] | null;
}): Promise<PanelPrognosis> {
  const dismissed = new Set(opts.courtDismissed ?? []);
  const active = opts.jurors.filter((j) => !dismissed.has(j.number));
  const validNumbers = new Set(active.map((j) => j.number));

  const jurorLines = active
    .map((j) => `  #${j.number}: ${j.name} | ${j.sex || "?"} | ${j.race || "?"} | DOB: ${j.birthDate || "?"} | ${j.occupation || "unknown occupation"} | ${j.employer || "unknown employer"}`)
    .join("\n");

  const stageLine =
    opts.stage === "panel_load"
      ? "STAGE: PANEL LOAD — no voir dire responses recorded yet. Reason from panel composition (demographics, occupations, background) only."
      : "STAGE: RESPONSES CLOSED — voir dire questioning is complete. Weight the recorded raises and unresolved flags heavily.";

  const userPrompt = `${stageLine}

CASE:
Area of Law: ${opts.caseInfo.areaOfLaw}
Representing: ${opts.caseInfo.side === "defense" ? "Defense" : "Plaintiff"}
Summary: ${opts.caseInfo.summary}
Favorable Juror Traits: ${opts.caseInfo.favorableTraits.join(", ") || "(none listed)"}
Risk Traits / Strike Triggers: ${opts.caseInfo.riskTraits.join(", ") || "(none listed)"}

${metricsBlock(opts.metrics)}

ACTIVE PANEL (${active.length} jurors):
${jurorLines || "  (no jurors)"}
${opts.flagLines.length ? `\nJUROR FLAGS (from recorded responses):\n${opts.flagLines.map((l) => `  ${l}`).join("\n")}` : ""}

Write the panel prognosis JSON now.`;

  const validate = (p: PrognosisDraft): string[] =>
    validatePrognosisDraft(p, {
      validNumbers,
      activeCount: active.length,
      jurySize: opts.metrics.jurySize,
      strikesPerSide: opts.metrics.strikesPerSide,
    });

  const runOnce = async (correction?: string): Promise<PrognosisDraft | null> => {
    const { parsed } = await claudeJson<PrognosisDraft>({
      model: CLAUDE_SONNET,
      system: PROGNOSIS_SYSTEM_PROMPT,
      userPrompt: correction ? `${userPrompt}${correction}` : userPrompt,
      temperature: 0.2,
      // 5-series models spend part of max_tokens on internal reasoning; the
      // prognosis JSON is large (narrative + target lists), so a 4000 cap
      // was observed producing mid-JSON truncation. Headroom is cheap.
      // 5-series models spend a variable share of max_tokens on internal
    // reasoning before the visible JSON: 8000 truncated on some attempts
    // (visible output is only ~2-3k tokens). Cap sized ~4x visible output.
    maxTokens: 16000,
    });
    return parsed;
  };

  // Parse failures get one retry with an explicit JSON-only instruction —
  // same retry-once-then-throw policy as every other analysis path. NEVER a
  // silent default prognosis.
  const parseFailure = () =>
    new AIOutputError("AI returned invalid JSON for panel prognosis after a retry. No default prognosis was generated — run the prognosis again.");
  let parsed = await runOnce();
  if (!parsed) {
    console.warn("[PanelPrognosis] Unparseable output on first attempt, retrying once");
    parsed = await runOnce("\n\nIMPORTANT: Your response must be ONLY the complete, valid prognosis JSON object — no prose before or after it.");
    if (!parsed) throw parseFailure();
  }
  let problems = validate(parsed);
  if (problems.length > 0) {
    console.warn(`[PanelPrognosis] Validation problems, retrying once:\n- ${problems.join("\n- ")}`);
    const corrected = await runOnce(`\n\nYOUR PREVIOUS RESPONSE WAS INVALID:\n- ${problems.join("\n- ")}\nReturn the complete corrected JSON.`);
    if (!corrected) throw parseFailure();
    parsed = corrected;
    problems = validate(parsed);
    if (problems.length > 0) {
      throw new AIOutputError(`Panel prognosis failed validation after retry: ${problems.join(" ")}`);
    }
  }

  const mapTargets = (arr: PrognosisDraftTarget[] | undefined) =>
    (arr || [])
      .map((t) => ({ jurorNumber: Number(t.jurorNumber), jurorName: toStr(t.jurorName), reason: toStr(t.reason) }))
      .filter((t) => validNumbers.has(t.jurorNumber));

  return {
    stage: opts.stage,
    generatedAt: Date.now(),
    metrics: opts.metrics,
    assets: (parsed.assets || [])
      .map((a) => ({ jurorNumber: Number(a.jurorNumber), jurorName: toStr(a.jurorName), why: toStr(a.why), fragility: toStr(a.fragility) }))
      .filter((a) => validNumbers.has(a.jurorNumber)),
    strikeTargets: {
      ours: mapTargets(parsed.strikeTargets?.ours),
      theirs: mapTargets(parsed.strikeTargets?.theirs),
    },
    bestCaseSeatedJury: {
      jurorNumbers: Array.isArray(parsed.bestCaseSeatedJury?.jurorNumbers)
        ? parsed.bestCaseSeatedJury!.jurorNumbers.map(Number).filter((n: number) => validNumbers.has(n))
        : [],
      assessment: toStr(parsed.bestCaseSeatedJury?.assessment),
    },
    narrative: toStr(parsed.narrative),
    settlementPostureWarning: opts.metrics.settlementPostureWarning,
  };
}
