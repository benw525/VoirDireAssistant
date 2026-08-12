/**
 * Regression tests for the assistant chat-context builder (client module,
 * pure string logic — safe to test server-side).
 *
 * Core guarantee under test: flagged jurors are identifiable in the chat
 * context on panels LARGER than the per-juror summary cap (e.g. the 36-juror
 * Whigham panel). The cap bounds prompt size for unflagged jurors only; flag
 * data must cover the whole panel.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContextBlock, PANEL_SUMMARY_CAP } from "../client/src/components/AIAssistant/chatContext";
import type { Juror, FlagRollupResult, JurorTopicFlag } from "../client/src/types";

function mkJuror(n: number, overrides: Record<string, unknown> = {}): Juror {
  return {
    number: n,
    name: `Juror ${n}`,
    occupation: "Teacher",
    sex: "F",
    race: "W",
    lean: "unknown",
    riskTier: "unassessed",
    ...overrides,
  } as unknown as Juror;
}

function mkFlag(
  jurorNumber: number,
  overrides: Partial<JurorTopicFlag> = {},
): JurorTopicFlag {
  return {
    jurorNumber,
    topic: "accident-history",
    label: "Accident history",
    resolved: false,
    sources: [
      { kind: "Hand", question: "Have you been in a serious car accident?" },
    ],
    ...overrides,
  } as unknown as JurorTopicFlag;
}

function mkRollup(flags: JurorTopicFlag[]): FlagRollupResult {
  return {
    posture: "disputed",
    summaryLine: `${flags.filter(f => !f.resolved).length} unresolved raises`,
    totalUnresolved: flags.filter(f => !f.resolved).length,
    topics: [],
    flags,
  } as unknown as FlagRollupResult;
}

test("flagged juror beyond the summary cap is identifiable with its source question (36-juror panel)", () => {
  const jurors = Array.from({ length: 36 }, (_, i) => mkJuror(i + 1));
  const rollup = mkRollup([mkFlag(34), mkFlag(12)]);

  const ctx = buildContextBlock(null, jurors, 4, rollup, null, undefined);

  assert.ok(36 > PANEL_SUMMARY_CAP, "test premise: panel exceeds the cap");
  // Juror #34 (beyond the cap) must appear with identity, unresolved flag, and source question.
  assert.match(ctx, /#34 Juror 34.*Accident history UNRESOLVED/s);
  assert.match(ctx, /#34 Juror 34.*Hand on "Have you been in a serious car accident\?"/s);
  // Juror #12 (within the cap) appears in the main summary with the same flag data.
  assert.match(ctx, /#12 Juror 12 \| Teacher.*Accident history UNRESOLVED/);
  // Unflagged jurors beyond the cap are NOT listed individually.
  assert.ok(!ctx.includes("#35 Juror 35"), "unflagged juror beyond cap should not get a line");
  // The overflow section says flag coverage is complete for the whole panel.
  assert.ok(ctx.includes(`beyond the ${PANEL_SUMMARY_CAP}-juror summary`), "overflow section header present");
});

test("no overflow section when every flagged juror fits within the cap", () => {
  const jurors = Array.from({ length: 36 }, (_, i) => mkJuror(i + 1));
  const rollup = mkRollup([mkFlag(12)]);

  const ctx = buildContextBlock(null, jurors, 4, rollup, null, undefined);

  assert.ok(!ctx.includes("beyond the"), "no overflow header when nothing overflows");
  assert.match(ctx, /#12 Juror 12.*Accident history UNRESOLVED/);
});

test("resolved flags beyond the cap are still listed and labeled resolved", () => {
  const jurors = Array.from({ length: 33 }, (_, i) => mkJuror(i + 1));
  const rollup = mkRollup([mkFlag(31, { resolved: true })]);

  const ctx = buildContextBlock(null, jurors, 5, rollup, null, undefined);

  assert.match(ctx, /#31 Juror 31.*Accident history \(resolved\)/s);
});

test("rollup fetch failure is disclosed as a data-quality problem", () => {
  const jurors = Array.from({ length: 5 }, (_, i) => mkJuror(i + 1));

  const ctx = buildContextBlock(null, jurors, 4, null, "network error", undefined);

  assert.ok(ctx.includes("Unresolved-flag rollup could not be loaded (network error)"));
  assert.ok(ctx.includes("DATA QUALITY PROBLEMS"));
});
