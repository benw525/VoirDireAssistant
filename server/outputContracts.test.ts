import { test } from "node:test";
import assert from "node:assert/strict";
import { countSentences, analysisContractViolations } from "./analyzeJuror";

test("countSentences: plain two-sentence summary", () => {
  assert.equal(countSentences("He anchors low on damages. Preserve the strike."), 2);
  assert.equal(countSentences("One sentence only."), 1);
  assert.equal(countSentences("Three here. Second one. Third one."), 3);
});

test("countSentences: honorifics and citations do not inflate the count", () => {
  assert.equal(countSentences("Dr. White was his surgeon. He may defer to Dr. White's testimony."), 2);
  assert.equal(countSentences("J.E.B. v. Alabama controls this pattern. Strike carefully."), 2);
  assert.equal(countSentences("Mrs. Ellis settled a claim vs. an insurer. She denied any carryover."), 2);
});

test("countSentences: decimals and currency are not sentence breaks", () => {
  assert.equal(countSentences("The $11,542.50 in bills will read as proof of injury. He adds generals on top."), 2);
});

test("countSentences: quotes after terminal punctuation are handled", () => {
  assert.equal(countSentences('He said "believe the patient first." That is a plaintiff anchor.'), 2);
});

test("countSentences: unfinished final sentence is not counted", () => {
  assert.equal(countSentences("He is a peremptory candidate. The only question is whether"), 1);
});

test("analysisContractViolations: minimal record must be provisional", () => {
  const v = analysisContractViolations({ informationLevel: "minimal", provisional: false, keyFollowUp: "" });
  assert.ok(v.some(x => x.includes('"minimal" requires provisional=true')));
});

test("analysisContractViolations: provisional requires keyFollowUp", () => {
  const v = analysisContractViolations({ informationLevel: "partial", provisional: true, keyFollowUp: "   " });
  assert.deepEqual(v, ["provisional=true requires a non-empty keyFollowUp question"]);
});

test("analysisContractViolations: compliant outputs are clean", () => {
  assert.deepEqual(analysisContractViolations({ informationLevel: "well-developed", provisional: false, keyFollowUp: "" }), []);
  assert.deepEqual(analysisContractViolations({ informationLevel: "minimal", provisional: true, keyFollowUp: "Any prior chiropractic treatment?" }), []);
});
