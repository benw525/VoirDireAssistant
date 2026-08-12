---
name: Analysis fail-loud contract
description: Cross-cutting rules for juror AI analysis integrity (statuses, no silent defaults, stale marking, demographic-rationale enforcement) that all analysis work must stay consistent with.
---

# Fail-loud analysis contract

**Rule 1:** AI analysis outputs (full analysis, brief summary, cause, Batson) are zod-validated, retried once with an explicit "complete valid JSON only" suffix, then throw `AIOutputError` (→ HTTP 502 `ai_output_invalid`). Never reintroduce silent defaults (score 50, 'medium', fabricated "Unlikely"/"No Batson concerns") anywhere — server or client.

**Rule 2:** Any flow that records juror answers (new response, follow-up, collab variants, future voice/chat flows) must mark that juror's analysis stale in BOTH places: server-side via the stale-marking helper in routes, and mirrored into local client juror state (an open End Report must see it without reload).

**Rule 3:** Every export surface (PDF print, CSV, MattrMindr push — including automatic pushes like the post-Batson one) must pass the End Report integrity gate / acknowledgment. New export paths must not bypass it.

**Why:** In the Whigham trial, 3 juror analyses silently failed to parse, got default scores, were buried mid-strike-order, and two high-risk jurors deliberated ($500K adverse verdict); the exported report showed "Plaintiff 0 / Defense 0" strikes with no warning.

**How to apply:** When adding prompts/agents (retraining work), new response-recording endpoints, or new export/report features, wire them into: juror `analysisStatus` ('none'|'ok'|'failed'|'stale'), the stale-marking helper, and the report integrity gate.

**Known residual:** freshness is client-guarded for the in-flight-analysis race; a multi-device write race (analysis PATCH 'ok' overwriting server 'stale') is still possible — a server-authoritative revision counter would close it if it ever matters.

## Batson preview separation (added 2026-08-12)
Rule: preview-mode Batson runs (suggested strike order, zero strikes exercised) live in separate client state, are never persisted to the case record, and never resolve the report-integrity "no Batson check" issue — only an executed-strikes run does.
**Why:** a preview is advisory pattern-checking; letting it satisfy the integrity gate would let a report ship without the real check on actual strikes.
**How to apply:** any new surface that consumes Batson results must key off the executed result only; preview results carry mode='preview' end to end.

## Conditional required fields in LLM output (added 2026-08-12)
Rule: when a structured field is required only for some entries (e.g. lock-in questions only for "Possible" cause ratings), a zod .default() silently swallows the violation — validate the condition post-parse, retry once with a targeted correction suffix, then throw AIOutputError.
**Why:** code review caught .default([]) turning "model ignored a REQUIRED field" into an empty list the UI renders as nothing.
**How to apply:** every schema default on LLM output needs the question "is absence legitimate for ALL entries?"; if not, add category-aware post-validation.

## Demographic-rationale enforcement (added 2026-08-12)
Rule: the no-demographics ALWAYS-directive is enforced by one shared pattern module (`server/demographicRationale.ts`) on three surfaces: cause entries (scan reasoning/argument/lockInQuestions — retry once, then throw; `basis` excluded because it quotes the juror's own recorded words), Batson work-product flags (deterministic FULL-text scan of defended jurors' notes/summary/stored analysis merged with model flags — prompt material truncates long analyses, so an LLM "[]" is never treated as verification), and the calibration harness (imports the same module so gate and runtime cannot drift).
**Why:** the model profiled a raise-only juror by DOB ("his age") despite prompt prohibitions, and missed a planted demographic rationale buried in long cached context on consecutive runs.
**How to apply:** new AI output surfaces that narrate about jurors must run the shared scan on model-authored fields (never on verbatim record quotes); patterns must match reasoning ("Black woman may favor plaintiff"), not mere demographic words ("cares for an elderly parent" stays clean).

## ALWAYS-directives are enforced in code, not prompts (added 2026-08-12)
Rule: when a requirement says output must ALWAYS contain specific content, compute that content deterministically outside the model and merge it in code; model output is optional enrichment. On model failure, return the deterministic content (loudly logged) if it applies; otherwise rethrow — never fabricate.
**Why:** prompt-level "always include X" is model compliance, not a guarantee — and merging only after a successful model call means an AI outage erases the guaranteed content entirely.
**How to apply:** every "must always include/behave" product rule needs a code path that works when the AI path is down.
