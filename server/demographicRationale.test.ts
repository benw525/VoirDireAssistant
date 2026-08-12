import { test } from "node:test";
import assert from "node:assert/strict";
import { findDemographicRationale } from "./demographicRationale";

test("flags age-based profiling", () => {
  assert.equal(findDemographicRationale("Given his age and retirement, he may struggle to sit through trial."), "his age");
  assert.equal(findDemographicRationale("At her age, long days are demanding."), "her age");
  assert.ok(findDemographicRationale("An elderly juror is unlikely to follow complex damages testimony."));
});

test("flags race/sex-based rationale", () => {
  assert.ok(findDemographicRationale("As an older Black woman she is statistically more plaintiff-leaning."));
  assert.ok(findDemographicRationale("Women tend to award higher non-economic damages."));
  assert.ok(findDemographicRationale("Her gender suggests sympathy for the plaintiff."));
  assert.ok(findDemographicRationale("Demographic profile suggests a plaintiff lean."));
});

test("flags direct demographic lean predictions without statistical phrasing", () => {
  assert.ok(findDemographicRationale("Black woman may favor plaintiff on damages."));
  assert.ok(findDemographicRationale("An African American juror is likely to sympathize with the claimant."));
  assert.ok(findDemographicRationale("Hispanic men lean defense in low-impact cases."));
  assert.ok(findDemographicRationale("He is elderly and may resent the defense's arguments."));
});

test("does not flag record-based rationale", () => {
  assert.equal(findDemographicRationale("States he could not award pain-and-suffering damages, period."), null);
  assert.equal(findDemographicRationale("Sole caregiver for her husband; cannot be away from home all week."), null);
  assert.equal(findDemographicRationale("Retired meter reader; raise-only record with no follow-up."), null);
  assert.equal(findDemographicRationale("ICU nurse who committed to holding the plaintiff to their proof."), null);
});

test("does not flag legitimate quoted record facts mentioning age or family", () => {
  assert.equal(findDemographicRationale("Sole caregiver for her elderly mother; cannot be away all week."), null);
  assert.equal(findDemographicRationale("Cares for an elderly parent at home and asked about hardship excusal."), null);
  assert.equal(findDemographicRationale("Works with women recovering from surgery at a rehab clinic."), null);
});
