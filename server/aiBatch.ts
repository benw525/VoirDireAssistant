/**
 * Concurrency helpers for splitting monolithic AI panel calls into parallel
 * batches (Lewis/Whigham Section 9): the single whole-panel 16k-token call
 * was slow and truncation-prone — the exact failure mode that buried two
 * high-risk jurors in the Whigham strike order. Batches are merged
 * deterministically by the callers; output shapes never change.
 */

export interface ChunkOptions {
  /** Preferred chunk size when splitting is needed. */
  target?: number;
  /** Largest size that is still allowed to run as a single chunk. */
  max?: number;
}

/**
 * Split items into near-equal contiguous chunks. If the item count is at most
 * `max`, everything stays in one chunk (one call is cheaper than two). When
 * splitting, chunk count is `ceil(n / target)` and sizes differ by at most 1,
 * so there is never a tiny remainder chunk. Order is preserved.
 */
export function chunkBalanced<T>(items: readonly T[], opts?: ChunkOptions): T[][] {
  const target = opts?.target ?? 8;
  const max = opts?.max ?? 10;
  if (target < 1 || max < 1) throw new Error(`chunkBalanced: target/max must be >= 1 (got target=${target}, max=${max})`);
  if (items.length === 0) return [];
  if (items.length <= max) return [items.slice()];
  const numChunks = Math.ceil(items.length / target);
  const base = Math.floor(items.length / numChunks);
  const extra = items.length % numChunks;
  const chunks: T[][] = [];
  let offset = 0;
  for (let i = 0; i < numChunks; i++) {
    const size = base + (i < extra ? 1 : 0);
    chunks.push(items.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

/**
 * Run `fn` over items in concurrent waves of `batchSize`, preserving input
 * order in the returned settled results. A rejection does not abort the wave
 * or the run — callers decide per-item whether a failure is fatal.
 */
export async function mapInBatches<T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (batchSize < 1) throw new Error(`mapInBatches: batchSize must be >= 1 (got ${batchSize})`);
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const wave = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(wave.map((item, k) => fn(item, i + k)));
    results.push(...settled);
  }
  return results;
}
