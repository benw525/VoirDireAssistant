import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAMAGES_LOCK_IN_QUESTIONS,
  GROUP_REHAB_WARNING,
  PROTECT_DISCIPLINE,
  REHABILITATION_PAIR,
  enforceVoirDireContract,
  fatalViolationsAfterEnforce,
  funnelStageCoverage,
  validateVoirDireDraft,
  type VoirDireContractDoc,
} from "./voirDireContract";

const q = (id: number, module: string) => ({
  id,
  originalText: `Q${id}`,
  rephrase: `R${id}`,
  followUps: [],
  module,
});

const fq = (id: number, text: string, module = "Experience-based") => ({
  id,
  originalText: text,
  rephrase: text,
  followUps: [],
  module,
});

/** A realistic five-step experience funnel in directive order. */
const funnelQuestions = () => [
  fq(1, "Have you or a close family member ever been involved in a car accident?"),
  fq(2, "In that accident, were you or they injured?"),
  fq(3, "Did anyone bring a claim or lawsuit over those injuries?"),
  fq(4, "Were you satisfied with how that claim was resolved?"),
  fq(5, "Have you ever been rear-ended at a stoplight, like the collision in this case?"),
];

const baseDoc = (overrides: Partial<VoirDireContractDoc> = {}): VoirDireContractDoc => ({
  questions: [...funnelQuestions(), q(6, "Attitude-based")],
  strikeGuide: [],
  protectList: [],
  damagesLockIns: { applicable: false, questions: [], lockInFirstJurors: [], groupRehabWarning: "" },
  ...overrides,
});

const names = new Map<number, string>([
  [1, "Alice Ames"],
  [2, "Bob Byrd"],
  [7, "Gina Gray"],
]);

test("validate: fewer than 4 experience questions is a funnel violation", () => {
  const doc = baseDoc({ questions: [fq(1, "Have you ever been involved in and injured by an accident, brought a claim, and been satisfied with the outcome?"), q(2, "Attitude-based"), q(3, "Damages")] });
  const violations = validateVoirDireDraft(doc, { jurorNumbers: new Set([1, 2]) });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /FUNNEL/);
  assert.match(violations[0], /at least 4 distinct/);
  assert.match(violations[0], /single global experience question/);
});

test("validate: full funnel fixture passes with zero violations", () => {
  const violations = validateVoirDireDraft(baseDoc(), { jurorNumbers: new Set([1, 2]) });
  assert.deepEqual(violations, []);
});

test("validate: a missing funnel stage is named explicitly", () => {
  const doc = baseDoc({
    questions: [
      fq(1, "Have you or a close family member ever been involved in a car accident?"),
      fq(2, "In that accident, were you or they injured?"),
      fq(3, "Did anyone bring a claim or lawsuit over those injuries?"),
      fq(4, "What was that whole thing like for you?"), // no satisfaction/grievance language
    ],
  });
  const violations = validateVoirDireDraft(doc, { jurorNumbers: new Set([1, 2]) });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /satisfaction\/grievance/);
});

test("validate: out-of-order funnel stages are a retryable violation but not fatal", () => {
  const doc = baseDoc({
    questions: [
      fq(1, "Were you satisfied with how your last insurance claim was resolved?"),
      fq(2, "Have you or a close family member ever been involved in a car accident?"),
      fq(3, "In that accident, were you or they injured?"),
      fq(4, "Did anyone bring a lawsuit over those injuries?"),
    ],
  });
  const violations = validateVoirDireDraft(doc, { jurorNumbers: new Set([1, 2]) });
  assert.ok(violations.some((v) => /funnel must run involvement/.test(v)));
  assert.deepEqual(fatalViolationsAfterEnforce(doc), []);
});

test("funnelStageCoverage: full fixture covers all stages in order", () => {
  const coverage = funnelStageCoverage(baseDoc().questions);
  assert.equal(coverage.experienceCount, 5);
  assert.deepEqual(coverage.missingStages, []);
  assert.deepEqual(coverage.orderViolations, []);
});

test("validate: PRESERVE strike-guide juror missing from protectList is flagged", () => {
  const doc = baseDoc({
    strikeGuide: [
      { jurorNumber: 7, jurorName: "Gina Gray", riskLevel: "Low", primaryConcern: "None", recommendation: "Keep — defense-friendly adjuster background" },
      { jurorNumber: 2, jurorName: "Bob Byrd", riskLevel: "High", primaryConcern: "Prior claim", recommendation: "Strike" },
    ],
  });
  const violations = validateVoirDireDraft(doc, { jurorNumbers: new Set([2, 7]) });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /#7/);
  assert.match(violations[0], /protectList/);
});

test("validate: unknown protectList juror and empty whyFavorable are flagged", () => {
  const doc = baseDoc({
    protectList: [
      { jurorNumber: 99, jurorName: "Ghost", whyFavorable: "x", discipline: "", rehabilitationQuestions: [] },
      { jurorNumber: 1, jurorName: "Alice Ames", whyFavorable: "  ", discipline: "", rehabilitationQuestions: [] },
    ],
  });
  const violations = validateVoirDireDraft(doc, { jurorNumbers: new Set([1]) });
  assert.equal(violations.length, 2);
  assert.match(violations[0], /#99/);
  assert.match(violations[1], /whyFavorable/);
});

test("enforce: canonical discipline and exactly the two rehabilitation questions on every entry", () => {
  const doc = baseDoc({
    protectList: [
      {
        jurorNumber: 1,
        jurorName: "A. Ames",
        whyFavorable: "Claims adjuster, defense-oriented",
        discipline: "model text to be replaced",
        rehabilitationQuestions: ["Can you be fair?"],
      },
    ],
  });
  const { doc: out } = enforceVoirDireContract(doc, { concededOrWeak: false, jurorNamesByNumber: names });
  assert.equal(out.protectList.length, 1);
  assert.equal(out.protectList[0].discipline, PROTECT_DISCIPLINE);
  assert.deepEqual(out.protectList[0].rehabilitationQuestions, [...REHABILITATION_PAIR]);
  assert.equal(out.protectList[0].jurorName, "Alice Ames");
});

test("enforce: synthesizes protect entry for PRESERVE-recommended juror missing from protectList", () => {
  const doc = baseDoc({
    strikeGuide: [
      { jurorNumber: 7, jurorName: "G. Gray", riskLevel: "Low", primaryConcern: "None", recommendation: "Keep: skeptical of soft-tissue claims" },
    ],
  });
  const { doc: out, notes } = enforceVoirDireContract(doc, { concededOrWeak: false, jurorNamesByNumber: names });
  assert.equal(out.protectList.length, 1);
  assert.equal(out.protectList[0].jurorNumber, 7);
  assert.equal(out.protectList[0].jurorName, "Gina Gray");
  assert.match(out.protectList[0].whyFavorable, /skeptical of soft-tissue/);
  assert.deepEqual(out.protectList[0].rehabilitationQuestions, [...REHABILITATION_PAIR]);
  assert.ok(notes.some((n) => /Synthesized protectList entry .*#7/.test(n)));
});

test("enforce: drops protect entries and lock-in targets for unknown jurors, with notes", () => {
  const doc = baseDoc({
    protectList: [
      { jurorNumber: 42, jurorName: "Ghost", whyFavorable: "n/a", discipline: "", rehabilitationQuestions: [] },
    ],
    damagesLockIns: {
      applicable: true,
      questions: [],
      lockInFirstJurors: [{ jurorNumber: 43, jurorName: "Phantom", why: "n/a" }],
      groupRehabWarning: "",
    },
  });
  const { doc: out, notes } = enforceVoirDireContract(doc, { concededOrWeak: true, jurorNamesByNumber: names });
  assert.equal(out.protectList.length, 0);
  assert.equal(out.damagesLockIns.lockInFirstJurors.length, 0);
  assert.ok(notes.some((n) => n.includes("#42")));
  assert.ok(notes.some((n) => n.includes("#43")));
});

test("enforce: conceded/weak liability guarantees canonical lock-ins first, dedupes model restatements, caps extras", () => {
  const doc = baseDoc({
    damagesLockIns: {
      applicable: false,
      questions: [
        "Could you award ONLY the medical bills you find were actually caused by the collision?",
        "Custom extra one?",
        "Custom extra two?",
        "Custom extra three?",
        "Custom extra four?",
      ],
      lockInFirstJurors: [{ jurorNumber: 2, jurorName: "B. Byrd", why: "Prior claimant — lock before rehab pass" }],
      groupRehabWarning: "model warning",
    },
  });
  const { doc: out } = enforceVoirDireContract(doc, { concededOrWeak: true, jurorNamesByNumber: names });
  assert.equal(out.damagesLockIns.applicable, true);
  assert.deepEqual(out.damagesLockIns.questions.slice(0, 3), [...DAMAGES_LOCK_IN_QUESTIONS]);
  assert.equal(out.damagesLockIns.questions.length, 6);
  assert.ok(!out.damagesLockIns.questions.includes("Custom extra four?"));
  assert.equal(out.damagesLockIns.groupRehabWarning, GROUP_REHAB_WARNING);
  assert.equal(out.damagesLockIns.lockInFirstJurors[0].jurorName, "Bob Byrd");
});

test("enforce: disputed liability clears the damages module regardless of model output", () => {
  const doc = baseDoc({
    damagesLockIns: {
      applicable: true,
      questions: ["Should not survive"],
      lockInFirstJurors: [{ jurorNumber: 1, jurorName: "Alice Ames", why: "x" }],
      groupRehabWarning: "y",
    },
  });
  const { doc: out, notes } = enforceVoirDireContract(doc, { concededOrWeak: false, jurorNamesByNumber: names });
  assert.equal(out.damagesLockIns.applicable, false);
  assert.deepEqual(out.damagesLockIns.questions, []);
  assert.equal(out.damagesLockIns.groupRehabWarning, "");
  assert.ok(notes.some((n) => /liability posture is disputed/.test(n)));
});

test("fatal violations: funnel floor and missing stages survive enforcement and fail loud", () => {
  const doc = baseDoc({ questions: [q(1, "Experience-based"), q(2, "Damages")] });
  const fatal = fatalViolationsAfterEnforce(doc);
  assert.equal(fatal.length, 2);
  assert.match(fatal[0], /funnel requires at least 4/);
  assert.match(fatal[1], /never reaches/);
  assert.deepEqual(fatalViolationsAfterEnforce(baseDoc()), []);
});
