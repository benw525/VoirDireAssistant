---
name: jsonb merge vs JSON-null defaults
description: Atomic jsonb || merges silently corrupt to arrays when the column holds JSON null; drizzle-kit push can create jsonb columns with DEFAULT 'null'::jsonb.
---

# Atomic jsonb merges must guard against JSON null

**Rule:** Never write `COALESCE(col, '{}'::jsonb) || $new` for an in-database jsonb object merge. Guard the left operand with `jsonb_typeof`: only reuse the stored value when `jsonb_typeof(col) = 'object'`, else substitute `'{}'::jsonb`.

**Why:** drizzle-kit `db:push` created a new jsonb column with `DEFAULT 'null'::jsonb` — JSON null, not SQL NULL — so `COALESCE` never fired. Postgres `||` on a JSON-null scalar and an object degrades to ARRAY CONCATENATION, silently storing `[null, {...}]` instead of a merged object. Reads looked fine (pg driver returns JS null for JSON null), unit tests passed; only a live persistence smoke caught it.

**How to apply:** Any time a server does read-free atomic jsonb merging (`UPDATE ... SET col = <expr> || <fragment>`), wrap the existing value in `CASE WHEN jsonb_typeof(col) = 'object' THEN col ELSE '{}'::jsonb END`. Also remember whole-object writes through the ORM mask the problem — the bug only appears when switching to in-database merges. Verify with a storage-layer probe on a FRESH row, not just rows that were previously written wholesale.
