---
name: Analysis fail-loud contract
description: Cross-cutting rules for juror AI analysis integrity (statuses, no silent defaults, stale marking) that tasks #27/#28/#29/#31-era work must stay consistent with.
---

# Fail-loud analysis contract

**Rule 1:** AI analysis outputs (full analysis, brief summary, cause, Batson) are zod-validated, retried once with an explicit "complete valid JSON only" suffix, then throw `AIOutputError` (→ HTTP 502 `ai_output_invalid`). Never reintroduce silent defaults (score 50, 'medium', fabricated "Unlikely"/"No Batson concerns") anywhere — server or client.

**Rule 2:** Any flow that records juror answers (new response, follow-up, collab variants, future voice/chat flows) must mark that juror's analysis stale in BOTH places: server-side via the stale-marking helper in routes, and mirrored into local client juror state (an open End Report must see it without reload).

**Rule 3:** Every export surface (PDF print, CSV, MattrMindr push — including automatic pushes like the post-Batson one) must pass the End Report integrity gate / acknowledgment. New export paths must not bypass it.

**Why:** In the Whigham trial, 3 juror analyses silently failed to parse, got default scores, were buried mid-strike-order, and two high-risk jurors deliberated ($500K adverse verdict); the exported report showed "Plaintiff 0 / Defense 0" strikes with no warning.

**How to apply:** When adding prompts/agents (retraining work), new response-recording endpoints, or new export/report features, wire them into: juror `analysisStatus` ('none'|'ok'|'failed'|'stale'), the stale-marking helper, and the report integrity gate.

**Known residual:** freshness is client-guarded for the in-flight-analysis race; a multi-device write race (analysis PATCH 'ok' overwriting server 'stale') is still possible — a server-authoritative revision counter would close it if it ever matters.
