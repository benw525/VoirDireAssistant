import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkBalanced, mapInBatches } from "./aiBatch";

test("chunkBalanced: empty input produces no chunks", () => {
  assert.deepEqual(chunkBalanced([]), []);
});

test("chunkBalanced: at or below max stays a single chunk", () => {
  const ten = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(chunkBalanced(ten, { target: 8, max: 10 }), [ten]);
  assert.deepEqual(chunkBalanced([1, 2, 3]), [[1, 2, 3]]);
});

test("chunkBalanced: 11 items split 6/5 (never a tiny remainder)", () => {
  const items = Array.from({ length: 11 }, (_, i) => i);
  const chunks = chunkBalanced(items, { target: 8, max: 10 });
  assert.deepEqual(chunks.map((c) => c.length), [6, 5]);
});

test("chunkBalanced: 36 items (Whigham venire) → five chunks of 8/7/7/7/7", () => {
  const items = Array.from({ length: 36 }, (_, i) => i + 1);
  const chunks = chunkBalanced(items, { target: 8, max: 10 });
  assert.deepEqual(chunks.map((c) => c.length), [8, 7, 7, 7, 7]);
});

test("chunkBalanced: order preserved and concat equals input", () => {
  for (const n of [11, 17, 23, 36, 50, 81]) {
    const items = Array.from({ length: n }, (_, i) => i);
    const chunks = chunkBalanced(items, { target: 8, max: 10 });
    assert.deepEqual(chunks.flat(), items, `n=${n}`);
  }
});

test("chunkBalanced: all chunk sizes stay within 5-10 for target 8 / max 10", () => {
  for (let n = 11; n <= 120; n++) {
    const chunks = chunkBalanced(Array.from({ length: n }), { target: 8, max: 10 });
    for (const c of chunks) {
      assert.ok(c.length >= 5 && c.length <= 10, `n=${n} produced chunk of ${c.length}`);
    }
  }
});

test("chunkBalanced: rejects nonsensical options", () => {
  assert.throws(() => chunkBalanced([1], { target: 0 }));
  assert.throws(() => chunkBalanced([1], { max: 0 }));
});

test("mapInBatches: preserves input order in results", async () => {
  const items = [5, 1, 4, 2, 3];
  const settled = await mapInBatches(items, 2, async (x) => x * 10);
  const values = settled.map((s) => (s.status === "fulfilled" ? s.value : -1));
  assert.deepEqual(values, [50, 10, 40, 20, 30]);
});

test("mapInBatches: never exceeds the wave size in concurrent executions", async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 20 }, (_, i) => i);
  await mapInBatches(items, 8, async () => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
  });
  assert.ok(peak <= 8, `peak concurrency ${peak} exceeded batch size 8`);
  assert.ok(peak >= 2, `expected concurrent execution within a wave, saw peak ${peak}`);
});

test("mapInBatches: a rejection is isolated to its item", async () => {
  const settled = await mapInBatches([1, 2, 3], 3, async (x) => {
    if (x === 2) throw new Error("boom");
    return x;
  });
  assert.equal(settled[0].status, "fulfilled");
  assert.equal(settled[1].status, "rejected");
  assert.equal(settled[2].status, "fulfilled");
});

test("mapInBatches: rejects invalid batch size", async () => {
  await assert.rejects(() => mapInBatches([1], 0, async (x) => x));
});
