import { test } from "node:test";
import assert from "node:assert/strict";
import { computePanelMetrics, classifyOccupation } from "./panelMetrics";

const juror = (number: number, occupation = "", employer = "") => ({
  number,
  name: `Juror ${number}`,
  occupation,
  employer,
});

const claimFlag = (jurorNumber: number, topicId = "injury-claim", resolved = false) => ({
  jurorNumber,
  topicId,
  resolved,
});

test("strike arithmetic: 28 active jurors, jury of 12 → 8 strikes per side", () => {
  const m = computePanelMetrics({ jurors: Array.from({ length: 28 }, (_, i) => juror(i + 1)), flags: [] });
  assert.equal(m.panelSize, 28);
  assert.equal(m.strikesPerSide, 8);
});

test("strike arithmetic: 36 active → 12 strikes; panel smaller than jury → 0", () => {
  const m36 = computePanelMetrics({ jurors: Array.from({ length: 36 }, (_, i) => juror(i + 1)), flags: [] });
  assert.equal(m36.strikesPerSide, 12);
  const m10 = computePanelMetrics({ jurors: Array.from({ length: 10 }, (_, i) => juror(i + 1)), flags: [] });
  assert.equal(m10.strikesPerSide, 0);
});

test("adverse survival floor and settlement warning when claimant jurors outnumber strikes", () => {
  const jurors = Array.from({ length: 28 }, (_, i) => juror(i + 1));
  const flags = Array.from({ length: 10 }, (_, i) => claimFlag(i + 1, i % 2 ? "accident-history" : "injury-claim"));
  const m = computePanelMetrics({ jurors, flags });
  assert.equal(m.claimantHistory.count, 10);
  assert.equal(m.strikesPerSide, 8);
  assert.equal(m.adverseSurvivalFloor, 2);
  assert.ok(m.settlementPostureWarning);
  assert.match(m.settlementPostureWarning!, /10 claimant-history jurors/);
  assert.match(m.settlementPostureWarning!, /8 peremptory strikes/);
  assert.match(m.settlementPostureWarning!, /at least 2 will survive/);
  assert.match(m.settlementPostureWarning!, /settlement-posture/);
});

test("no warning when strikes cover claimant-history jurors", () => {
  const jurors = Array.from({ length: 28 }, (_, i) => juror(i + 1));
  const flags = [claimFlag(1), claimFlag(2, "disability-filing")];
  const m = computePanelMetrics({ jurors, flags });
  assert.equal(m.adverseSurvivalFloor, 0);
  assert.equal(m.settlementPostureWarning, null);
});

test("claimant-history counts a juror once across multiple topics and ignores non-claimant topics", () => {
  const jurors = Array.from({ length: 14 }, (_, i) => juror(i + 1));
  const flags = [
    claimFlag(3, "injury-claim"),
    claimFlag(3, "accident-history"),
    claimFlag(5, "witness-connection"),
    claimFlag(7, "medical-treatment"),
    claimFlag(9, "disability-filing"),
  ];
  const m = computePanelMetrics({ jurors, flags });
  assert.deepEqual(m.claimantHistory.jurorNumbers, [3, 9]);
  assert.equal(m.claimantHistory.count, 2);
  assert.equal(m.unresolvedFlagCount, 5);
});

test("court-dismissed jurors are excluded from panel size, flags, and occupations", () => {
  const jurors = [juror(1, "Registered Nurse"), juror(2), juror(3, "Teacher")];
  const flags = [claimFlag(1), claimFlag(2)];
  const m = computePanelMetrics({ jurors, flags, courtDismissed: [1] });
  assert.equal(m.panelSize, 2);
  assert.equal(m.dismissedCount, 1);
  assert.equal(m.claimantHistory.count, 1);
  assert.deepEqual(m.claimantHistory.jurorNumbers, [2]);
  assert.equal(m.clinicalAdvocacy.count, 0);
});

test("occupation classifier: clinical and advocacy hits, neutral misses", () => {
  assert.equal(classifyOccupation("Registered Nurse", "")?.category, "clinical");
  assert.equal(classifyOccupation("RN", "Baptist Hospital")?.category, "clinical");
  assert.equal(classifyOccupation("Physical Therapist", "")?.category, "clinical");
  assert.equal(classifyOccupation("Office Manager", "Chiropractic Clinic")?.category, "clinical");
  assert.equal(classifyOccupation("Social Worker", "DHR")?.category, "advocacy");
  assert.equal(classifyOccupation("Pastor", "First Baptist")?.category, "advocacy");
  assert.equal(classifyOccupation("Guidance Counselor", "High School")?.category, "advocacy");
  assert.equal(classifyOccupation("Software Engineer", "Acme Corp"), null);
  assert.equal(classifyOccupation("Welder", "Steel Co"), null);
  assert.equal(classifyOccupation("", ""), null);
});

test("clinical/advocacy density from occupations", () => {
  const jurors = [
    juror(1, "Registered Nurse", "UAB"),
    juror(2, "Social Worker", "State"),
    juror(3, "Accountant", "Firm"),
    juror(4, "EMT", "Fire Dept"),
  ];
  const m = computePanelMetrics({ jurors, flags: [] });
  assert.equal(m.clinicalAdvocacy.count, 3);
  assert.equal(m.clinicalAdvocacy.density, 0.75);
  const categories = m.clinicalAdvocacy.matches.map((x) => `${x.jurorNumber}:${x.category}`);
  assert.deepEqual(categories, ["1:clinical", "2:advocacy", "4:clinical"]);
});

test("empty panel produces zero densities without NaN", () => {
  const m = computePanelMetrics({ jurors: [], flags: [] });
  assert.equal(m.panelSize, 0);
  assert.equal(m.claimantHistory.density, 0);
  assert.equal(m.clinicalAdvocacy.density, 0);
  assert.equal(m.strikesPerSide, 0);
  assert.equal(m.settlementPostureWarning, null);
});

test("resolved flags are not counted as unresolved", () => {
  const jurors = Array.from({ length: 20 }, (_, i) => juror(i + 1));
  const flags = [claimFlag(1, "injury-claim", true), claimFlag(2, "injury-claim", false)];
  const m = computePanelMetrics({ jurors, flags });
  assert.equal(m.unresolvedFlagCount, 1);
  assert.equal(m.claimantHistory.count, 2);
});
