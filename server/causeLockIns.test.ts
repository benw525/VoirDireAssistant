import { test } from "node:test";
import assert from "node:assert/strict";
import { possiblesMissingLockIns } from "./analyzeJuror";

const entry = (jurorNumber: number, category: "Highly Likely" | "Possible" | "Unlikely", lockInQuestions: string[]) => ({
  jurorNumber,
  category,
  lockInQuestions,
});

test("possiblesMissingLockIns: flags Possible entries with no lock-ins", () => {
  const entries = [
    entry(1, "Possible", []),
    entry(2, "Possible", ["Would you start out giving Dr. White's word more weight?"]),
    entry(3, "Unlikely", []),
    entry(4, "Highly Likely", []),
  ];
  assert.deepEqual(possiblesMissingLockIns(entries), [1]);
});

test("possiblesMissingLockIns: whitespace-only questions do not count", () => {
  const entries = [
    entry(5, "Possible", ["   ", ""]),
    entry(6, "Possible", ["  ", "A real question?"]),
  ];
  assert.deepEqual(possiblesMissingLockIns(entries), [5]);
});

test("possiblesMissingLockIns: clean panel returns empty", () => {
  const entries = [
    entry(1, "Unlikely", []),
    entry(2, "Possible", ["Lock-in one?", "Lock-in two?"]),
  ];
  assert.deepEqual(possiblesMissingLockIns(entries), []);
});
