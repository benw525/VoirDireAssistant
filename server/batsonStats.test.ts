import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBatsonStats,
  findComparatorCandidates,
  formatBatsonStatsBlock,
  type BatsonJurorInput,
} from "./batsonStats";

function juror(partial: Partial<BatsonJurorInput> & { number: number }): BatsonJurorInput {
  return {
    name: `Juror ${partial.number}`,
    race: "White",
    sex: "F",
    occupation: "Teacher",
    lean: "unknown",
    riskTier: "unassessed",
    ...partial,
  };
}

test("computeBatsonStats: per-group strike rates are exact", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, race: "Black", sex: "F" }),
    juror({ number: 2, race: "Black", sex: "M" }),
    juror({ number: 3, race: "Black", sex: "F" }),
    juror({ number: 4, race: "Black", sex: "M" }),
    juror({ number: 5, race: "White", sex: "F" }),
    juror({ number: 6, race: "White", sex: "M" }),
    juror({ number: 7, race: "White", sex: "F" }),
    juror({ number: 8, race: "White", sex: "M" }),
  ];
  // Strike 3 of 4 Black jurors, 1 of 4 White jurors.
  const stats = computeBatsonStats(panel, [1, 2, 3, 5], []);

  assert.equal(stats.yours.totalStrikes, 4);
  assert.equal(stats.yours.panelSize, 8);
  assert.equal(stats.yours.overallStrikeRate, 0.5);

  const black = stats.yours.byRace.find(g => g.group === "Black")!;
  assert.equal(black.panelCount, 4);
  assert.equal(black.struckCount, 3);
  assert.equal(black.strikeRate, 0.75);

  const white = stats.yours.byRace.find(g => g.group === "White")!;
  assert.equal(white.panelCount, 4);
  assert.equal(white.struckCount, 1);
  assert.equal(white.strikeRate, 0.25);

  // Sex: struck 3 F (of 4), 1 M (of 4).
  const female = stats.yours.bySex.find(g => g.group === "F")!;
  assert.equal(female.struckCount, 3);
  assert.equal(female.strikeRate, 0.75);
});

test("computeBatsonStats: opposing side computed independently", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, sex: "M" }),
    juror({ number: 2, sex: "M" }),
    juror({ number: 3, sex: "F" }),
    juror({ number: 4, sex: "F" }),
  ];
  const stats = computeBatsonStats(panel, [3], [1, 2]);
  assert.equal(stats.yours.totalStrikes, 1);
  assert.equal(stats.theirs.totalStrikes, 2);
  const theirMale = stats.theirs.bySex.find(g => g.group === "M")!;
  assert.equal(theirMale.struckCount, 2);
  assert.equal(theirMale.strikeRate, 1);
});

test("computeBatsonStats: zero strikes and empty panel are safe", () => {
  const empty = computeBatsonStats([], [], []);
  assert.equal(empty.yours.overallStrikeRate, null);
  assert.equal(empty.yours.byRace.length, 0);
  assert.equal(empty.comparatorCandidates.length, 0);

  const panel = [juror({ number: 1 })];
  const noStrikes = computeBatsonStats(panel, [], []);
  assert.equal(noStrikes.yours.totalStrikes, 0);
  assert.equal(noStrikes.yours.overallStrikeRate, 0);
});

test("computeBatsonStats: blank/missing demographics bucket as Unknown", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, race: "" }),
    juror({ number: 2, race: "  " }),
    juror({ number: 3, race: "White" }),
  ];
  const stats = computeBatsonStats(panel, [1], []);
  const unknown = stats.yours.byRace.find(g => g.group === "Unknown")!;
  assert.equal(unknown.panelCount, 2);
  assert.equal(unknown.struckCount, 1);
});

test("findComparatorCandidates: matches seated jurors on tier, lean, occupation", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, riskTier: "high", lean: "unfavorable", occupation: "Registered Nurse" }),
    juror({ number: 2, riskTier: "high", lean: "neutral", occupation: "Accountant" }),
    juror({ number: 3, riskTier: "low", lean: "unfavorable", occupation: "Nurse Practitioner" }),
    juror({ number: 4, riskTier: "unassessed", lean: "unknown", occupation: "Welder" }),
    juror({ number: 5, riskTier: "medium", lean: "favorable", occupation: "Chef" }),
  ];
  const candidates = findComparatorCandidates(panel, [1], [5]);

  // #2 shares risk tier; #3 shares lean + occupation keyword "nurse".
  const seatedNums = candidates.map(c => c.seatedJurorNumber).sort();
  assert.deepEqual(seatedNums, [2, 3]);

  const c3 = candidates.find(c => c.seatedJurorNumber === 3)!;
  assert.equal(c3.struckJurorNumber, 1);
  assert.ok(c3.sharedTraits.some(t => t.includes("lean")));
  assert.ok(c3.sharedTraits.some(t => t.includes("nurse")));

  // #5 was struck by the other side — never a "seated" comparator.
  assert.ok(!candidates.some(c => c.seatedJurorNumber === 5));
  // 'unassessed' tier and 'unknown' lean never count as shared traits (#4 absent).
  assert.ok(!candidates.some(c => c.seatedJurorNumber === 4));
});

test("findComparatorCandidates: occupation stopwords do not create matches", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, occupation: "Not employed" }),
    juror({ number: 2, occupation: "Self employed" }),
  ];
  const candidates = findComparatorCandidates(panel, [1], []);
  assert.equal(candidates.length, 0);
});

test("formatBatsonStatsBlock: renders authoritative numbers and comparators", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, race: "Black", sex: "F", riskTier: "high" }),
    juror({ number: 2, race: "White", sex: "M", riskTier: "high" }),
  ];
  const block = formatBatsonStatsBlock(computeBatsonStats(panel, [1], []));
  assert.ok(block.includes("COMPUTED STRIKE STATISTICS"));
  assert.ok(block.includes("Black: struck 1 of 1 (100%)"));
  assert.ok(block.includes("White: struck 0 of 1 (0%)"));
  assert.ok(block.includes("Struck #1 vs seated #2"));

  const noCandidates = formatBatsonStatsBlock(computeBatsonStats(panel, [], []));
  assert.ok(noCandidates.includes("none found by deterministic trait matching"));
});

test("preview semantics: stats treat a suggested order exactly like strikes", () => {
  const panel: BatsonJurorInput[] = [
    juror({ number: 1, sex: "F" }),
    juror({ number: 2, sex: "F" }),
    juror({ number: 3, sex: "F" }),
    juror({ number: 4, sex: "M" }),
    juror({ number: 5, sex: "M" }),
    juror({ number: 6, sex: "M" }),
    juror({ number: 7, sex: "F" }),
  ];
  // Suggested order skews female: 4 of top 5 are women (Whigham pattern).
  const stats = computeBatsonStats(panel, [1, 2, 3, 7, 4], []);
  const female = stats.yours.bySex.find(g => g.group === "F")!;
  assert.equal(female.struckCount, 4);
  assert.equal(female.panelCount, 4);
  assert.equal(female.strikeRate, 1);
  const male = stats.yours.bySex.find(g => g.group === "M")!;
  assert.equal(male.strikeRate, round3(1 / 3));
});

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
