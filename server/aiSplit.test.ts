import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCauseEntries, aggregateBatsonOverallRisk, type StrikeForCauseEntry } from "./analyzeJuror";

function entry(jurorNumber: number, category: StrikeForCauseEntry["category"]): StrikeForCauseEntry {
  return {
    jurorNumber,
    category,
    reasoning: "reasoning",
    argument: "argument",
    basis: "basis",
    lockInQuestions: category === "Possible" ? ["Lock-in question?"] : [],
  };
}

test("mergeCauseEntries: concatenates chunks and sorts by category then juror number", () => {
  const merged = mergeCauseEntries([
    [entry(9, "Unlikely"), entry(3, "Possible")],
    [entry(1, "Highly Likely"), entry(12, "Possible")],
    [entry(2, "Unlikely")],
  ]);
  assert.deepEqual(
    merged.map(e => `${e.jurorNumber}:${e.category}`),
    ["1:Highly Likely", "3:Possible", "12:Possible", "2:Unlikely", "9:Unlikely"],
  );
});

test("mergeCauseEntries: first entry wins on duplicate juror numbers", () => {
  const a = entry(4, "Possible");
  a.basis = "from chunk 1";
  const b = entry(4, "Highly Likely");
  b.basis = "hallucinated duplicate";
  const merged = mergeCauseEntries([[a], [b]]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].basis, "from chunk 1");
});

test("mergeCauseEntries: empty input", () => {
  assert.deepEqual(mergeCauseEntries([]), []);
  assert.deepEqual(mergeCauseEntries([[], []]), []);
});

test("aggregateBatsonOverallRisk: worst flagged strike wins", () => {
  assert.equal(aggregateBatsonOverallRisk([]), "Low");
  assert.equal(aggregateBatsonOverallRisk([{ riskLevel: "Low" }, { riskLevel: "Low" }]), "Low");
  assert.equal(aggregateBatsonOverallRisk([{ riskLevel: "Low" }, { riskLevel: "Moderate" }]), "Moderate");
  assert.equal(
    aggregateBatsonOverallRisk([{ riskLevel: "Moderate" }, { riskLevel: "High" }, { riskLevel: "Low" }]),
    "High",
  );
});
