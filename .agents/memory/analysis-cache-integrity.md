---
name: Analysis cache integrity
description: Rules for the juror-analysis result cache — who may write cache-validity fields, how legacy client writes are handled, and how background completions avoid persisting stale results.
---

# Analysis cache integrity

**Rule:** The cache-validity pair (`analysisStatus`, `analysisInputHash`) is server-owned on EVERY client write surface — juror create (both array and single body), juror PATCH, and collab notes PATCH all strip them unconditionally. Rows can only become cache-valid via the two server-side analysis flows (analyze route persistence, background prewarm).

**Why:** An authenticated client that can set `analysisStatus: 'ok'` plus a matching hash can forge a "verified" cached analysis that the fast path then serves as authoritative. A review round found this reachable through PATCH *and* through juror creation (the array-create path bypassed zod entirely).

**How to apply:**
- Never block legacy AI display writes (`aiAnalysis`, `riskScore`, …) — the client echoes them back after analysis runs and carries them through case saves. Instead: identical echo-backs keep the cache warm; DIVERGENT values downgrade the row to `stale` + clear the hash (value still saved and displayed, never cache-served).
- Any edit to a prompt-input field (profile, lean, riskTier, notes — including the collab notes route) marks the row stale and schedules a background re-warm.
- The input hash must cover the FULL prompt surface, including case posture (summary/side/traits) — hash from authoritative DB rows, not client payload, wherever ownership is established.
- Background completions re-load authoritative inputs after the AI call and compare hashes before persisting; on mismatch they discard and re-enqueue. The residual sub-second TOCTOU window self-heals because a stored hash that doesn't match current inputs can never produce a cache hit.
- After stripping server-owned fields an update body can be empty — treat as no-op, not a Drizzle `.set({})` error.
