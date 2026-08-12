---
name: Claude model quirks
description: Anthropic model-upgrade constraints for this app (temperature deprecation, validation harness)
---

- `temperature` is unsupported on `claude-opus-4-7` and deprecated on all 5-series Claude models (`claude-opus-5`, `claude-sonnet-5`). The shared helper's `modelSupportsTemperature()` gate must be updated whenever swapping models — the API hard-errors otherwise.
- **Why:** verified live 2026-08-08 by probing the messages API directly; the error is "`temperature` is deprecated for this model."
- **How to apply:** when changing `CLAUDE_OPUS`/`CLAUDE_SONNET` in the shared Anthropic helper, probe the new model with `temperature` first, then re-run the trial-readiness simulation harness (`scripts/simulate-trial.ts --phase=N`, phases 1–4; run full voir dire on a small panel separately — 36-juror generation exceeds the 2-min shell budget).
- 5-series models silently spend `max_tokens` on internal reasoning before emitting visible output: JSON calls were observed truncating at 2400/6000/8000 caps with only a fraction of that visible. Size caps 2-4x above the expected visible JSON, and log a truncation warning off `stop_reason` so it's diagnosable without a rerun.
- Because `temperature` cannot be pinned on 5-series, outputs are nondeterministic run-to-run: borderline classifications flip between runs on identical input. Regression fixtures with pinned expected labels must avoid coin-flip records (e.g. a mild stated opinion + inline rehabilitation) — encode the expected label via unambiguous signals, and enforce ALWAYS-directives in code (scan + retry + throw), not prompts.
- Gemini strike-list parser auto-falls back on 404/503; keep the fallback model current (preview primaries get rotated).
