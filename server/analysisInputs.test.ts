import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAnalysisInputHash,
  countSubstantiveResponses,
  isThinRecord,
  type AnalysisHashInput,
} from "./analysisInputs";

const baseJuror = {
  number: 7,
  name: "Jane Barefoot",
  sex: "F",
  race: "W",
  birthDate: "1984-03-02",
  occupation: "Physical Therapist",
  employer: "Springhill Rehab",
  lean: "unknown",
  riskTier: "unassessed",
  notes: "",
};

const baseCaseContext = {
  name: "Whigham v. Morris Trucking",
  areaOfLaw: "personal-injury-defense",
  summary: "Rear-end collision, disputed injuries",
  side: "defense",
  favorableTraits: ["skeptical of soft-tissue claims"],
  riskTraits: ["own injury claim history"],
};

const baseInput = (): AnalysisHashInput => ({
  caseContext: {
    ...baseCaseContext,
    favorableTraits: [...baseCaseContext.favorableTraits],
    riskTraits: [...baseCaseContext.riskTraits],
  },
  juror: { ...baseJuror },
  responses: [
    {
      questionText: "Have you ever been in a wreck?",
      questionSummary: null,
      responseText: "[Hand] Raised hand",
      side: "yours",
      followUps: [],
    },
    {
      questionText: null,
      questionSummary: "Injury treatment history",
      responseText: "I treated for about six months after my own rear-end accident.",
      side: "yours",
      followUps: [{ question: "Did you make a claim?", answer: "Yes, it settled." }],
    },
  ],
  enrichedText: null,
});

test("hash: changes when case posture changes", () => {
  const a = computeAnalysisInputHash(baseInput());
  const summary = baseInput();
  summary.caseContext.summary = "Rear-end collision, admitted liability, damages only";
  assert.notEqual(computeAnalysisInputHash(summary), a);
  const traits = baseInput();
  traits.caseContext.riskTraits = [...traits.caseContext.riskTraits, "medical background"];
  assert.notEqual(computeAnalysisInputHash(traits), a);
  const side = baseInput();
  side.caseContext.side = "plaintiff";
  assert.notEqual(computeAnalysisInputHash(side), a);
});

test("hash: deterministic for identical inputs", () => {
  assert.equal(computeAnalysisInputHash(baseInput()), computeAnalysisInputHash(baseInput()));
});

test("hash: '' and null normalize equal for nullable fields", () => {
  const a = baseInput();
  const b = baseInput();
  b.responses[0].questionSummary = "";
  b.responses[1].questionText = "";
  b.enrichedText = "";
  assert.equal(computeAnalysisInputHash(a), computeAnalysisInputHash(b));
});

test("hash: changes when a response is added", () => {
  const a = baseInput();
  const b = baseInput();
  b.responses.push({
    questionText: null,
    questionSummary: "Damages posture",
    responseText: "I could sign a defense verdict if the evidence supports it.",
    side: "yours",
    followUps: [],
  });
  assert.notEqual(computeAnalysisInputHash(a), computeAnalysisInputHash(b));
});

test("hash: changes on notes, lean, follow-up, and enrichment changes", () => {
  const a = computeAnalysisInputHash(baseInput());

  const notes = baseInput();
  notes.juror.notes = "Watch this one — clinical background.";
  assert.notEqual(computeAnalysisInputHash(notes), a);

  const lean = baseInput();
  lean.juror.lean = "unfavorable";
  assert.notEqual(computeAnalysisInputHash(lean), a);

  const fu = baseInput();
  fu.responses[1].followUps = [{ question: "Did you make a claim?", answer: "No." }];
  assert.notEqual(computeAnalysisInputHash(fu), a);

  const enriched = baseInput();
  enriched.enrichedText = "CONFIRMED: PT license #12345 (AL Board).";
  assert.notEqual(computeAnalysisInputHash(enriched), a);
});

test("countSubstantiveResponses: excludes bracketed reactions and short fragments", () => {
  const n = countSubstantiveResponses([
    { responseText: "[Hand] Raised hand" },
    { responseText: "Yes." },
    { responseText: "I was rear-ended in 2021 and treated for months." },
    { responseText: "   short   " },
  ]);
  assert.equal(n, 1);
});

test("isThinRecord: silent and reaction-only records are thin", () => {
  assert.equal(isThinRecord({ responses: [] }), true);
  assert.equal(
    isThinRecord({ responses: [{ responseText: "[Hand] Raised hand" }, { responseText: "[Nod]" }] }),
    true,
  );
});

test("isThinRecord: one substantive response is still thin", () => {
  assert.equal(
    isThinRecord({ responses: [{ responseText: "I was in a wreck a few years ago on I-65." }] }),
    true,
  );
});

test("isThinRecord: two short substantive responses are thin; two meaty ones are not", () => {
  const short = [
    { responseText: "I was in a wreck once." },
    { responseText: "It was not a big deal." },
  ];
  assert.equal(isThinRecord({ responses: short }), true);

  const meaty = [
    {
      responseText:
        "I was rear-ended at low speed in 2022, treated with a chiropractor for four months, and my attorney settled the claim with the other driver's insurer.",
    },
    {
      responseText:
        "Honestly I was not satisfied with how the insurance company handled it — they fought every bill and it left a bad taste.",
    },
  ];
  assert.equal(isThinRecord({ responses: meaty }), false);
});

test("isThinRecord: three substantive responses always take the full model", () => {
  const responses = [
    { responseText: "I work as a claims adjuster downtown." },
    { responseText: "My brother was in a bad accident years ago." },
    { responseText: "I think I could be fair to both sides here." },
  ];
  assert.equal(isThinRecord({ responses }), false);
});

test("isThinRecord: meaningful notes or enrichment force the full model", () => {
  const responses = [{ responseText: "[Hand] Raised hand" }];
  assert.equal(
    isThinRecord({ responses, notes: "Prior DDD diagnosis disclosed at sidebar; watch damages posture." }),
    false,
  );
  assert.equal(
    isThinRecord({ responses, enrichedText: "CONFIRMED: active plaintiff in 2025 injury suit (AlaCourt)." }),
    false,
  );
  // Short throwaway notes do not.
  assert.equal(isThinRecord({ responses, notes: "glasses" }), true);
});
