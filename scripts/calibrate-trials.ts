/**
 * Calibration harness — regression gate against two real trials
 * (Lewis v. Chad, Whigham v. Morris). Encodes the ground truth from the
 * Lewis/Whigham retraining document as assertions over LIVE model output.
 *
 * Run before shipping ANY change to prompts, models, or analysis plumbing:
 *
 *   npm run calibrate                      # both trials
 *   npm run calibrate -- --trial=lewis     # one trial
 *   npm run calibrate -- --skip-batson     # skip the Batson phase (faster)
 *
 * Requires ANTHROPIC_API_KEY (live calls; several minutes, real cost).
 * Writes /tmp/calibration-report.json and exits nonzero on any failure.
 */
import { writeFileSync } from "node:fs";
import {
  analyzeJuror,
  analyzeStrikesForCause,
  analyzeBatson,
  type AnalysisResult,
  type StrikeForCauseEntry,
  type BatsonAnalysisResult,
} from "../server/analyzeJuror";
import { mapInBatches } from "../server/aiBatch";
import { computeCaseFlags } from "../server/jurorFlags";
import { computePanelMetrics } from "../server/panelMetrics";
import { generatePanelPrognosis } from "../server/panelPrognosis";
import { LEWIS, WHIGHAM, type TrialFixture } from "./calibration-fixtures";

// Shared with runtime enforcement (server/demographicRationale.ts) so the
// harness gate and the server can never drift apart — a demographic strike
// rationale anywhere in work product is a Batson-discoverable liability.
import { findDemographicRationale } from "../server/demographicRationale";

interface Check {
  id: string;
  desc: string;
  pass: boolean;
  detail: string;
}

function makeChecker(list: Check[]) {
  return (id: string, desc: string, pass: boolean, detail: string) => {
    list.push({ id, desc, pass, detail });
    console.log(`  ${pass ? "✓" : "✗"} ${id}: ${desc}${pass ? "" : ` — ${detail}`}`);
  };
}

/** 1-based rank by riskScore (ties resolve in the juror's favor). */
function riskRank(analyses: Map<number, AnalysisResult>, jurorNumber: number): number {
  const target = analyses.get(jurorNumber);
  if (!target) return Number.POSITIVE_INFINITY;
  let higher = 0;
  for (const [n, a] of analyses) {
    if (n !== jurorNumber && a.riskScore > target.riskScore) higher++;
  }
  return higher + 1;
}

/**
 * Tier discrimination is measured over jurors whose record actually gave the
 * model something (informationLevel !== "minimal"): the thin-record
 * directive intentionally parks no/low-signal records at a provisional
 * anchor, so counting them would penalize exactly the fail-safe posture the
 * training doc mandates — but where information exists, medium must not be
 * the default. The denominator is asserted (≥5) so this never passes
 * vacuously. (provisional=false is too strict a filter: partial records
 * honestly stay provisional while still carrying a committed tier.)
 */
function mediumShare(analyses: Map<number, AnalysisResult>): { share: number; informed: number } {
  const informed = [...analyses.values()].filter((a) => a.informationLevel !== "minimal");
  let medium = 0;
  for (const a of informed) if (a.aiRiskTier === "medium") medium++;
  return {
    share: informed.length === 0 ? 1 : medium / informed.length,
    informed: informed.length,
  };
}

async function runPerJuror(fx: TrialFixture): Promise<{
  analyses: Map<number, AnalysisResult>;
  failures: Array<{ jurorNumber: number; message: string }>;
}> {
  console.log(`  … analyzing ${fx.jurors.length} jurors (waves of 8)`);
  const settled = await mapInBatches(fx.jurors, 8, (j) =>
    analyzeJuror(fx.caseContext, j, j.responses, null),
  );
  const analyses = new Map<number, AnalysisResult>();
  const failures: Array<{ jurorNumber: number; message: string }> = [];
  settled.forEach((s, i) => {
    const num = fx.jurors[i].number;
    if (s.status === "fulfilled") analyses.set(num, s.value);
    else failures.push({ jurorNumber: num, message: String((s.reason as any)?.message || s.reason) });
  });
  return { analyses, failures };
}

function scanDemographics(
  analyses: Map<number, AnalysisResult>,
  cause: StrikeForCauseEntry[],
): string | null {
  for (const [n, a] of analyses) {
    const hit = findDemographicRationale(`${a.analysis} ${a.keyFollowUp}`);
    if (hit) return `juror #${n} analysis: "${hit}"`;
  }
  for (const e of cause) {
    // Same field scope as runtime enforcement: "basis" is excluded because it
    // quotes the juror's own recorded words verbatim (legitimate record facts).
    const hit = findDemographicRationale(`${e.reasoning} ${e.argument} ${(e.lockInQuestions ?? []).join(' ')}`);
    if (hit) return `cause entry #${e.jurorNumber}: "${hit}"`;
  }
  return null;
}

const causeByNumber = (entries: StrikeForCauseEntry[]) =>
  new Map(entries.map((e) => [e.jurorNumber, e]));

// ---------------------------------------------------------------------------

async function runLewis(skipBatson: boolean): Promise<Check[]> {
  const fx = LEWIS;
  console.log(`\n=== ${fx.label} ===`);
  const checks: Check[] = [];
  const check = makeChecker(checks);

  const { analyses, failures } = await runPerJuror(fx);
  check(
    "L-parse", "zero unparsed juror analyses across the panel",
    failures.length === 0,
    failures.map((f) => `#${f.jurorNumber}: ${f.message}`).join(" | ") || "n/a",
  );

  console.log("  … strike-for-cause (batched)");
  let cause: StrikeForCauseEntry[] = [];
  let causeError = "";
  try {
    cause = await analyzeStrikesForCause(fx.caseContext, fx.jurors);
  } catch (err: any) {
    causeError = err?.message || String(err);
  }
  check("L-cause-run", "cause analysis completes", !causeError, causeError);
  const byNum = causeByNumber(cause);

  // The seven profile-based cause theories produced ZERO dismissals in the
  // real trial. Shared diagnosis + denial (Bomba), settled claim + denial
  // (Ellis), clinical occupation (Ladnier), records-adjacent + old resolved
  // claim (Young) are peremptory notes at most — "Unlikely".
  for (const [num, name] of [[10, "Bomba"], [13, "Ellis"], [16, "Ladnier"], [23, "Young"]] as const) {
    const e = byNum.get(num);
    check(
      `L-cause-${name}`, `#${num} ${name} rated "Unlikely" for cause`,
      !!e && e.category === "Unlikely",
      e ? `got "${e.category}"` : "no entry returned",
    );
  }
  const weber = byNum.get(17);
  check(
    "L-cause-Weber", '#17 Weber (explicit statements) rated "Highly Likely"',
    !!weber && weber.category === "Highly Likely",
    weber ? `got "${weber.category}"` : "no entry returned",
  );
  // Hardship is a court-administration matter, not bias-based cause.
  for (const [num, name] of [[20, "Russell"], [21, "Marut"], [22, "Hill"]] as const) {
    const e = byNum.get(num);
    check(
      `L-cause-${name}`, `#${num} ${name} (hardship) NOT rated "Highly Likely" on bias grounds`,
      !e || e.category !== "Highly Likely",
      e ? `got "${e.category}"` : "no entry (acceptable)",
    );
  }

  // Risk ranking: mirror-experience + grievance is the #1 strike; the
  // advocacy trio and the active litigant are priority strikes; the
  // records-literate jurors are NOT adverse when the defense owns the docs.
  check(
    "L-risk-Winston", "#2 Winston (mirror injury + insurer grievance) in the top 3 by riskScore",
    riskRank(analyses, 2) <= 3,
    `rank ${riskRank(analyses, 2)}, score ${analyses.get(2)?.riskScore ?? "n/a"}`,
  );
  for (const [num, name] of [[3, "Reeves"], [8, "Stevenson"], [11, "Bouie"], [15, "De Diaz"]] as const) {
    check(
      `L-risk-${name}`, `#${num} ${name} in the top 8 by riskScore`,
      riskRank(analyses, num) <= 8,
      `rank ${riskRank(analyses, num)}, score ${analyses.get(num)?.riskScore ?? "n/a"}`,
    );
  }
  for (const [num, name] of [[1, "Jenkins"], [5, "Sanders"], [23, "Young"]] as const) {
    const a = analyses.get(num);
    check(
      `L-tier-${name}`, `#${num} ${name} (records-literate) not rated high tier`,
      !!a && a.aiRiskTier !== "high",
      a ? `got "${a.aiRiskTier}" (score ${a.riskScore})` : "no analysis",
    );
  }
  const medShare = mediumShare(analyses);
  check(
    "L-medium-cap", "≤50% of non-minimal-record analyses in the medium tier, ≥5 such records",
    medShare.informed >= 5 && medShare.share <= 0.5,
    `${Math.round(medShare.share * 100)}% medium of ${medShare.informed} informed`,
  );
  const demoHit = scanDemographics(analyses, cause);
  check("L-no-demo", "no demographic rationale in any analysis or cause entry", !demoHit, demoHit || "n/a");

  if (!skipBatson) {
    console.log("  … Batson (13 struck → chunked path)");
    let batson: BatsonAnalysisResult | null = null;
    let batsonError = "";
    try {
      batson = await analyzeBatson(
        fx.caseContext,
        fx.jurors.map((j) => ({
          ...j,
          aiSummary: j.aiSummary,
          aiAnalysis: analyses.get(j.number)?.analysis,
        })),
        fx.yourStrikes,
        fx.theirStrikes,
      );
    } catch (err: any) {
      batsonError = err?.message || String(err);
    }
    check("L-batson-run", "chunked Batson analysis completes with aggregated summary", !!batson && batson.summary.length >= 20, batsonError || `summary length ${batson?.summary.length ?? 0}`);
    if (batson) {
      // Plaintiff struck 6 of 7 men — the J.E.B. pattern the real run caught.
      const jeb = batson.offensive.some((o) =>
        /male|men|sex|gender|j\.?\s*e\.?\s*b/i.test(`${o.protectedClass} ${o.statisticalPattern} ${o.suggestedArgument}`),
      );
      check(
        "L-batson-jeb", "offensive analysis flags plaintiff's 6-of-7 male strike pattern (J.E.B.)",
        jeb,
        `offensive entries: ${batson.offensive.map((o) => `#${o.jurorNumber} (${o.protectedClass}, ${o.strengthOfChallenge})`).join("; ") || "none"}`,
      );
      // The planted demographic sentence in Stevenson's stored summary must
      // be caught by work-product sanitation.
      const stevensonFlag = batson.workProductFlags.some((w) => w.jurorNumber === 8);
      check(
        "L-batson-wpf", "work-product sanitation flags the demographic rationale planted in #8 Stevenson's summary",
        stevensonFlag,
        `workProductFlags: ${batson.workProductFlags.map((w) => `#${w.jurorNumber} (${w.source})`).join("; ") || "none"}`,
      );
    }
  }

  return checks;
}

// ---------------------------------------------------------------------------

async function runWhigham(): Promise<Check[]> {
  const fx = WHIGHAM;
  console.log(`\n=== ${fx.label} ===`);
  const checks: Check[] = [];
  const check = makeChecker(checks);

  const { analyses, failures } = await runPerJuror(fx);
  check(
    "W-parse", "zero unparsed juror analyses across all 36 (incl. compound surname #13)",
    failures.length === 0 && analyses.size === 36,
    failures.map((f) => `#${f.jurorNumber}: ${f.message}`).join(" | ") || `analyzed ${analyses.size}/36`,
  );

  // Barefoot and Jensen — the two the monolithic run buried.
  for (const [num, name] of [[7, "Barefoot"], [34, "Jensen"]] as const) {
    const a = analyses.get(num);
    check(
      `W-tier-${name}`, `#${num} ${name} rated high tier`,
      !!a && a.aiRiskTier === "high",
      a ? `got "${a.aiRiskTier}" (score ${a.riskScore})` : "no analysis",
    );
    check(
      `W-rank-${name}`, `#${num} ${name} in the top 5 by riskScore`,
      riskRank(analyses, num) <= 5,
      `rank ${riskRank(analyses, num)}, score ${a?.riskScore ?? "n/a"}`,
    );
  }

  // The five deliberators who sat on nothing but an unvalenced wreck raise:
  // thin records must run the fast model, stay provisional, and surface the
  // ONE question that would move the score.
  for (const num of [9, 12, 17, 19, 29]) {
    const a = analyses.get(num);
    check(
      `W-thin-${num}`, `#${num} (raise-only record) fast tier + provisional + keyFollowUp`,
      !!a && a.modelTier === "fast" && a.provisional === true && a.keyFollowUp.trim().length > 0,
      a ? `tier=${a.modelTier}, provisional=${a.provisional}, keyFollowUp="${a.keyFollowUp.slice(0, 60)}"` : "no analysis",
    );
  }

  const medShare = mediumShare(analyses);
  check(
    "W-medium-cap", "≤50% of non-minimal-record analyses in the medium tier, ≥5 such records",
    medShare.informed >= 5 && medShare.share <= 0.5,
    `${Math.round(medShare.share * 100)}% medium of ${medShare.informed} informed`,
  );

  console.log("  … strike-for-cause (batched, 36 jurors)");
  let cause: StrikeForCauseEntry[] = [];
  let causeError = "";
  try {
    cause = await analyzeStrikesForCause(fx.caseContext, fx.jurors);
  } catch (err: any) {
    causeError = err?.message || String(err);
  }
  check("W-cause-run", "cause analysis completes across 36 jurors", !causeError, causeError);
  const byNum = causeByNumber(cause);

  const welborn = byNum.get(15);
  check(
    "W-cause-Welborn", '#15 Welborn ("could not award it, period") rated "Highly Likely"',
    !!welborn && welborn.category === "Highly Likely",
    welborn ? `got "${welborn.category}"` : "no entry returned",
  );
  // McGill deliberated in the real trial as a witness's former patient on
  // nothing but his own assurance — the system must develop this for cause.
  const mcgill = byNum.get(32);
  check(
    "W-cause-McGill", '#32 McGill (witness\'s former patient) at least "Possible" with a lock-in question',
    !!mcgill && (mcgill.category === "Possible" || mcgill.category === "Highly Likely") && mcgill.lockInQuestions.length >= 1,
    mcgill ? `got "${mcgill.category}", ${mcgill.lockInQuestions.length} lock-in(s)` : "no entry returned",
  );

  const demoHit = scanDemographics(analyses, cause);
  check("W-no-demo", "no demographic rationale in any analysis or cause entry", !demoHit, demoHit || "n/a");

  // Panel prognosis BEFORE strikes: the seated-jury outcome was forecastable.
  console.log("  … panel prognosis (responses_closed)");
  let prognosisError = "";
  try {
    const flagResult = computeCaseFlags({
      caseSummary: fx.caseContext.summary,
      jurors: fx.jurors.map((j) => ({ number: j.number, name: j.name })),
      questions: fx.questions,
      responses: fx.jurors.flatMap((j) =>
        j.responses.map((r) => ({
          jurorNumber: j.number,
          questionId: r.questionId,
          responseText: r.responseText,
          questionSummary: r.questionSummary,
          followUps: r.followUps,
        })),
      ),
      courtDismissed: [],
    });
    const metrics = computePanelMetrics({
      jurors: fx.jurors.map((j) => ({ number: j.number, name: j.name, occupation: j.occupation, employer: j.employer })),
      flags: flagResult.flags.map((f) => ({ jurorNumber: f.jurorNumber, topicId: f.topic, resolved: f.resolved })),
      courtDismissed: [],
    });
    check(
      "W-floor", "adverse-survival floor ≥ 2 (multiple claimant/clinical jurors survive any strike plan)",
      metrics.adverseSurvivalFloor >= 2,
      `floor ${metrics.adverseSurvivalFloor} (claimant ${metrics.claimantHistory.count}, strikes/side ${metrics.strikesPerSide})`,
    );
    const flagLines = flagResult.flags.map(
      (f) => `#${f.jurorNumber} ${f.jurorName}: ${f.label}${f.resolved ? " (resolved)" : " (UNRESOLVED)"}`,
    );
    const prognosis = await generatePanelPrognosis({
      stage: "responses_closed",
      caseInfo: {
        areaOfLaw: fx.caseContext.areaOfLaw,
        summary: fx.caseContext.summary,
        side: fx.caseContext.side,
        favorableTraits: fx.caseContext.favorableTraits,
        riskTraits: fx.caseContext.riskTraits,
      },
      jurors: fx.jurors,
      metrics,
      flagLines,
      courtDismissed: [],
    });
    check(
      "W-prognosis", "responses_closed prognosis generates with a substantive narrative",
      prognosis.narrative.trim().length >= 40,
      `narrative length ${prognosis.narrative.trim().length}`,
    );
  } catch (err: any) {
    prognosisError = err?.message || String(err);
    check("W-prognosis", "responses_closed prognosis generates", false, prognosisError);
  }

  return checks;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const trialArg = (args.find((a) => a.startsWith("--trial="))?.split("=")[1] || "both") as
    | "lewis" | "whigham" | "both";
  const skipBatson = args.includes("--skip-batson");

  if (!["lewis", "whigham", "both"].includes(trialArg)) {
    console.error(`Unknown --trial value "${trialArg}" (expected lewis|whigham|both)`);
    process.exit(2);
  }

  const startedAt = Date.now();
  const report: {
    generatedAt: string;
    args: { trial: string; skipBatson: boolean };
    trials: Record<string, { checks: Check[]; passed: number; failed: number }>;
    pass: boolean;
    durationMs: number;
  } = {
    generatedAt: new Date().toISOString(),
    args: { trial: trialArg, skipBatson },
    trials: {},
    pass: true,
    durationMs: 0,
  };

  const record = (name: string, checks: Check[]) => {
    const failed = checks.filter((c) => !c.pass);
    report.trials[name] = { checks, passed: checks.length - failed.length, failed: failed.length };
    if (failed.length > 0) report.pass = false;
  };

  if (trialArg === "lewis" || trialArg === "both") record("lewis", await runLewis(skipBatson));
  if (trialArg === "whigham" || trialArg === "both") record("whigham", await runWhigham());

  report.durationMs = Date.now() - startedAt;
  writeFileSync("/tmp/calibration-report.json", JSON.stringify(report, null, 2));

  console.log("\n=== CALIBRATION SUMMARY ===");
  for (const [name, t] of Object.entries(report.trials)) {
    console.log(`${name}: ${t.passed} passed, ${t.failed} failed`);
    for (const c of t.checks.filter((c) => !c.pass)) console.log(`  ✗ ${c.id}: ${c.desc} — ${c.detail}`);
  }
  console.log(`Report: /tmp/calibration-report.json (${Math.round(report.durationMs / 1000)}s)`);
  console.log(report.pass ? "CALIBRATION PASSED" : "CALIBRATION FAILED");
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Calibration harness crashed:", err);
  process.exit(1);
});
