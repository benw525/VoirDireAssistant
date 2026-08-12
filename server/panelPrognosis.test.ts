import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePrognosisDraft, type PrognosisDraft } from "./panelPrognosis";

const OPTS = {
  validNumbers: new Set(Array.from({ length: 14 }, (_, i) => i + 1)),
  activeCount: 14,
  jurySize: 12,
  strikesPerSide: 1,
};

const validDraft = (): PrognosisDraft => ({
  assets: [
    { jurorNumber: 7, jurorName: "Gina Gray", why: "Claims adjuster; skeptical of soft-tissue damages", fragility: "Plaintiff will burn a peremptory on her" },
  ],
  strikeTargets: {
    ours: [{ jurorNumber: 3, jurorName: "Carl Cole", reason: "Prior claimant with an open grievance" }],
    theirs: [{ jurorNumber: 7, jurorName: "Gina Gray", reason: "Adjuster background favors the defense" }],
  },
  bestCaseSeatedJury: {
    jurorNumbers: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    assessment: "A mixed panel leaning slightly defense if both sides strike optimally.",
  },
  narrative: "The panel skews claimant-adjacent; counsel should prioritize cause challenges before spending the single peremptory.",
});

test("prognosis validation: a complete draft passes", () => {
  assert.deepEqual(validatePrognosisDraft(validDraft(), OPTS), []);
});

test("prognosis validation: empty assets is rejected", () => {
  const d = validDraft();
  d.assets = [];
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /assets must identify at least one/);
});

test("prognosis validation: best-case jury must have exactly min(jurySize, activeCount) seats", () => {
  const d = validDraft();
  (d.bestCaseSeatedJury as { jurorNumbers: number[] }).jurorNumbers = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // 11
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /exactly 12/);
});

test("prognosis validation: duplicate jurors in best-case jury are rejected", () => {
  const d = validDraft();
  (d.bestCaseSeatedJury as { jurorNumbers: number[] }).jurorNumbers = [1, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /more than once/);
});

test("prognosis validation: missing strike targets are rejected when peremptories exist", () => {
  const d = validDraft();
  d.strikeTargets = { ours: [], theirs: [] };
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /strikeTargets\.ours is empty/);
  assert.match(problems[1], /strikeTargets\.theirs is empty/);
});

test("prognosis validation: empty strike targets are fine when there are no peremptories", () => {
  const d = validDraft();
  d.strikeTargets = { ours: [], theirs: [] };
  assert.deepEqual(validatePrognosisDraft(d, { ...OPTS, strikesPerSide: 0 }), []);
});

test("prognosis validation: citing a juror not on the active panel is rejected", () => {
  const d = validDraft();
  d.strikeTargets!.theirs = [{ jurorNumber: 99, jurorName: "Ghost", reason: "Not real" }];
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /#99/);
  assert.match(problems[0], /not on the active panel/);
});

test("prognosis validation: small panel seats the whole active panel", () => {
  const smallOpts = {
    validNumbers: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    activeCount: 8,
    jurySize: 12,
    strikesPerSide: 0,
  };
  const d = validDraft();
  d.strikeTargets = { ours: [], theirs: [] };
  d.assets = [{ jurorNumber: 2, jurorName: "Ann", why: "Retired nurse who distrusts exaggerated injuries", fragility: "Cause challenge risk" }];
  (d.bestCaseSeatedJury as { jurorNumbers: number[] }).jurorNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(validatePrognosisDraft(d, smallOpts), []);

  (d.bestCaseSeatedJury as { jurorNumbers: number[] }).jurorNumbers = [1, 2, 3];
  const problems = validatePrognosisDraft(d, smallOpts);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /exactly 8/);
});

test("prognosis validation: missing narrative and assessment are rejected", () => {
  const d = validDraft();
  d.narrative = "";
  (d.bestCaseSeatedJury as { assessment?: string }).assessment = "";
  const problems = validatePrognosisDraft(d, OPTS);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /assessment is missing/);
  assert.match(problems[1], /narrative is missing or too thin/);
});
