---
name: Claude model quirks
description: Anthropic model-upgrade constraints for this app (temperature deprecation, validation harness)
---

- `temperature` is unsupported on `claude-opus-4-7` and deprecated on all 5-series Claude models (`claude-opus-5`, `claude-sonnet-5`). The shared helper's `modelSupportsTemperature()` gate must be updated whenever swapping models — the API hard-errors otherwise.
- **Why:** verified live 2026-08-08 by probing the messages API directly; the error is "`temperature` is deprecated for this model."
- **How to apply:** when changing `CLAUDE_OPUS`/`CLAUDE_SONNET` in the shared Anthropic helper, probe the new model with `temperature` first, then re-run the trial-readiness simulation harness (`scripts/simulate-trial.ts --phase=N`, phases 1–4; run full voir dire on a small panel separately — 36-juror generation exceeds the 2-min shell budget).
- Gemini strike-list parser auto-falls back on 404/503; keep the fallback model current (preview primaries get rotated).
