---
name: Enrichment confidence gating
description: Principle for preventing hallucinated "confirmed" web-research matches from reaching analysis
---

**Rule:** Web-enrichment matches enter analysis as fact only after code-side verification, never on model say-so. A confirmation needs all of: a source URL the search API itself retrieved (its citations list is the only ground truth a page was really fetched), the returned name matching a searched name variant, and a juror-specific corroborator in the record — employer, birth year, or street-level address. A shared name or city is never enough. Everything weaker stays a pending lead behind attorney review, and web-derived text is sanitized and framed as quoted data before reaching downstream prompts.

**Why:** Review twice caught "confirmed" registry hits surviving on the model's claim alone; with common names that attributes the wrong person's record to a juror during voir dire.

**How to apply:** Any new discriminator or search category must define which juror-provided datum corroborates it before it may auto-confirm. In end-to-end tests, verify lead gating with per-match evidence snippets or markers, not name inclusion — distinct candidates legitimately share names.
