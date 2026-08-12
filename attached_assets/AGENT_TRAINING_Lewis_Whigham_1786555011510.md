# Voir Dire Analyst — Agent Training Directives (Lewis & Whigham, August 2026)

**Purpose:** Implementation instructions derived from two completed trials in the same venue (Mobile County, AL), same case type (MVA, defense side), analyzed against actual strikes, seated juries, and verdicts. Apply the engineering fixes first, then the prompt changes. Each prompt block is ready to insert verbatim.

**Evidence base:**
- **Lewis v. Chad** — disputed-impact MVA; defense owned the objective evidence (EDR no event, sub-1g biomechanics, pre-incident imaging). Full workflow ran. Quick **defense verdict** from a jury containing 4 jurors the tool rated "Highly Likely" cause candidates and 7 medical-adjacent jurors.
- **Whigham v. Morris** — conceded-liability rear-end; fight was causation/damages ($11,542.50 specials, $2.2M ask). Partial workflow. **$500,000 plaintiff verdict in ~90 minutes.** Three juror analyses failed to parse (raw truncated JSON stored, defaults displayed); two of those three — a practicing PT (true score 73/high/strike) and a CRNP (true 71/high/strike) — displayed as 50/medium/unknown, ranked 23rd and 28th of 30 in the strike order, and **both deliberated**. Defense executed the displayed strike order competently; the displayed order was corrupted.

---

## 0. ENGINEERING FIXES (do before any prompt work)

These are code changes in `server/analyzeJuror.ts` and the app workflow, not prompt edits.

1. **Raise `max_completion_tokens` on the full juror analysis from 800 to ≥1500.** The Whigham failures were JSON truncated mid-string at the cap; the parse failed and the juror silently kept default values (50/medium/unknown).
2. **Enforce JSON mode** (`response_format: { type: "json_object" }`) on every call whose output is parsed. Validate the parse. On failure, retry once with an explicit "return complete, valid JSON only" instruction.
3. **Fail loudly.** If an analysis cannot be parsed after retry:
   - Display a visible error state on the juror card — never a default score.
   - Exclude or flag the juror in the Suggested Strike Order with "ANALYSIS FAILED — regenerate before relying on this ranking."
4. **Report integrity gate.** The Final Report must refuse to render as "complete" while any of the following is true, and must print specific warnings instead of empty sections:
   - Any juror has an unparsed/failed analysis.
   - Peremptory strikes are unrecorded (Whigham report rendered with Plaintiff 0 / Defense 0).
   - Strike-for-Cause or Batson analysis has not been run.
   - All lean/risk values are still AI defaults with no attorney confirmation.
5. **Brief summary truncation:** raise the brief-summary cap from 150 to 250 tokens (15 of 36 Whigham summaries cut off mid-sentence, several exactly at the strategic recommendation; Lewis had zero).
6. **Verify the Pettway strike-for-cause upgrades actually shipped.** The Lewis output shows the Legal Sufficiency Gate language is not in the deployed prompt.

---

## 1. JUROR RISK ASSESSMENT — FULL ANALYSIS (`analyzeJuror()`)

**What the trials showed:** Medical-adjacent jurors were scored adverse by default in both cases; in Lewis, 7 of the 12 seated jurors were medical-adjacent and returned a quick defense verdict. Silent jurors and adverse-evidence jurors occupied the same score band. The Stevenson summary cited demographics as a risk rationale — which the tool's own Batson agent then flagged as impermissible language in discoverable work product.

**Add to the system prompt:**

```
CASE-POSTURE CONDITIONING: Before weighting any occupational or experiential
trait, determine which side owns the objective evidence. If the defense theory
rests on documentation, physics, or imaging chronology (disputed impact, EDR
data, pre-existing findings), records-literate and analytically trained jurors —
including medical-records, pharmacy, compliance, and claims personnel — are
neutral-to-favorable for the defense, not adverse. If liability is conceded and
the fight is subjective injury and damages, clinical and caregiving jurors who
professionally credit self-reported pain (treating clinicians, therapists,
home-health, mental-health) are strongly adverse, and their influence multiplies
because they become the room's unsworn medical expert. Never apply a flat
"medical field = plaintiff-leaning" rule.
```

```
SIGNAL WEIGHTING (strongest to weakest):
(1) the juror's own explicit statements of position or inability;
(2) active claims, open litigation, or unresolved grievances (including barred
    claims);
(3) claimant history weighted by recency and resemblance to the case fact
    pattern (a low-speed rear-end injury in a low-speed rear-end case outweighs
    a generic prior claim);
(4) occupations whose daily FUNCTION is advocacy or crediting self-report
    (caseworker, outreach nurse, case manager) — weight the job's function, not
    its industry;
(5) generic occupation categories;
(6) demographics — near-zero predictive weight, and they MUST NEVER appear as a
    stated risk rationale.
A settled prior claim accompanied by an unequivocal denial of bias is a
peremptory consideration to note, not a dominant risk driver.
```

```
SEPARATE ADVERSITY FROM UNCERTAINTY: Output two distinct measures —
riskScore (0-100, driven ONLY by affirmative evidence; if no substantive
responses exist, anchor near 50 and say so) and informationLevel
("well-developed" | "partial" | "minimal"). Never let missing information
inflate riskScore. A silent juror and a juror with adverse admissions must not
share a score band; if the record is minimal, state that the score is
provisional and name the ONE follow-up question that would most change it.
```

```
PROHIBITED RATIONALES: Never cite race, sex, age, or their statistical
correlation with verdicts as a reason for any risk classification or strike
recommendation. These rationales are legally impermissible under Batson/J.E.B.,
discoverable in work product, and empirically weak. Express every risk driver
as a record-based, demographic-neutral fact (occupation function, stated
experience, specific response).
```

```
DAMAGES ANCHOR (when liability is conceded or weak): Include a damagesAnchor
assessment — is this juror likely to treat claimed specials as a floor, a
ceiling, or a reference point? Note occupational and experiential anchors
(hourly wage-earners and claims-adjacent jurors anchor low; repeat claimants
and clinicians anchor high). State whether this juror could sign a defense
verdict or a bills-only award if causation fails.
```

```
ENRICHMENT NULLS: If background research returned no verified match, state
that in ONE sentence and move on. Do not narrate per-category nulls, and do
not characterize an absence of records as reassuring — for common names and
younger jurors it is simply the absence of data.
```

---

## 2. JUROR RISK ASSESSMENT — BRIEF SUMMARY (`generateBriefSummary()`)

**Replace the output instruction with:**

```
Write EXACTLY two sentences and finish them. Sentence one: the strongest
record-based signal driving the classification (quote or paraphrase a specific
response where one exists). Sentence two: the single most important unresolved
item, or the strategic posture (keep / develop / peremptory candidate). Never
end mid-thought; if space is tight, cut detail, not the conclusion.

If the juror gave any substantive response or meaningful hand raise, it takes
priority over occupational inference. Occupation-only summaries are acceptable
solely for silent jurors, and must say the record is undeveloped.

Never cite race, sex, age, or demographic-statistical verdict patterns as a
reason for a classification.
```

---

## 3. STRIKE-FOR-CAUSE ANALYST (`analyzeStrikesForCause()`)

**What the trials showed:** Lewis classified nine jurors "Highly Likely." The seven profile-based theories (personal DDD diagnosis ×2, settled prior suit with denial, clinical occupation ×2, mirror experience, active litigant) produced **zero** court dismissals — three cost defense peremptories and four sat, on a jury that found for the defense quickly. The courts acted only on explicit statements (Weber) and hardship (Russell, and in Whigham: Welborn, Monroe, Whitney, Croley on statements/relationships/hardship). In Whigham the module never ran at all — and a former patient of a trial witness (McGill / Dr. White-Spunner) deliberated.

**First: deploy the Pettway package** (Legal Sufficiency Gate; anchored category definitions; legal-cause vs. strategic-concern separation; hardship restriction). Lewis independently re-derived every one of those findings.

**Then add:**

```
GRANTABILITY ANCHORS (Alabama civil practice):
GRANTABLE — explicit statements of fixed opinion or inability to be fair that
survive rehabilitation; disqualifying relationships to parties, counsel, or
witnesses; a live personal stake in the same kind of dispute (e.g., an active
injury claim as plaintiff, or a current client relationship with a party's law
firm).
NOT GRANTABLE STANDING ALONE — a medical diagnosis the juror shares with a
party; a prior resolved claim or lawsuit accompanied by a denial of bias;
employment in healthcare or any occupation; general sympathy inferences.
Classify those as Unlikely for cause and note the peremptory concern in the
reasoning instead.
```

```
DIRECTION MATTERS: Before recommending a cause challenge, state WHOSE case the
bias damages. A juror biased toward your side is opposing counsel's cause
material — your options are quiet rehabilitation or silence, never your own
challenge. If a record contains statements cutting both directions, list them
in two columns, identify which side has the stronger cause argument, and advise
accordingly (including the risk that opposing counsel removes the juror for
free).
```

```
REHABILITATION: Treat a bare nod to a leading "can you be unbiased?" question
as non-curative for assessment purposes, but assume the COURT will treat it as
curative. For every "Possible" juror, output the 1-2 lock-in questions that
would convert the concern into a grantable record BEFORE opposing counsel
rehabilitates, and flag when mass-rehabilitation moments (group nods) have
already immunized jurors you would otherwise challenge.

WITNESS/PARTY RELATIONSHIPS: Any disclosed relationship to a party, counsel,
or witness (including having been a witness-physician's patient) must be
classified at minimum "Possible" with the exact development questions —
never left unresolved.
```

**Workflow:** auto-run this module when response recording closes.

---

## 4. BATSON CHALLENGE ANALYST (`analyzeBatson()`)

**What the trials showed:** The Lewis run was the tool's best output — it caught that the tool's own Stevenson summary created Batson exposure, built the Young/Bouie comparator, and produced usable J.E.B. scripts against plaintiff's 6-of-7 male strike pattern. But it only runs after strikes exist; Whigham's suggested strike order (5 women, 3 Black, in the top 7) was never pattern-checked because strikes were never recorded.

**Add a preview mode:**

```
PREVIEW MODE: When given a suggested strike order rather than executed strikes,
run the same statistical and comparative analysis on the TOP N suggested
strikes as if exercised. If the suggested pattern skews by race or sex against
the panel baseline, say so before any strike is made, identify which suggested
strikes drive the skew, and identify record-based alternates with equivalent
risk profiles outside the protected class.
```

```
WORK-PRODUCT SANITATION: As part of every defensive analysis, scan the panel's
stored AI summaries, analyses, and notes for demographic rationales attached to
any struck or strike-listed juror. List each instance verbatim with its juror,
flag it as material that must not be echoed at sidebar, and supply the
record-based articulation that replaces it.
```

**Make the seated-comparator table a required structured output** for every flagged strike (struck juror vs. similarly-situated seated jurors, with the distinguishing record fact for each).

---

## 5. FOLLOW-UP QUESTION ENGINE (`/api/suggest-followups`)

**What the trials showed:** All 36 Whigham jurors raised on the global wreck question; not one raise was valenced. Five deliberating jurors sat on nothing but an unvalenced wreck raise; Barefoot deliberated with her witness-connection raise unresolved; McGill deliberated as a witness's former patient on his own assurance. Lewis had the same gap on DDD raises.

**App feature (not the small model): the unresolved-flag queue.**

```
Maintain a per-juror list of UNRESOLVED FLAGS: any hand raise or note on a
case-critical topic (accident history, injury claims, disability filings,
medical treatment, legal-field ties, party/witness connections) that lacks a
valence-resolving answer. Surface a panel-level rollup on demand and
automatically before the strike phase: "23 jurors have undeveloped wreck
raises; 4 disability filings unexplored; 2 witness connections unresolved."
Rank the queue by case-dispositive value, not chronology.
```

**Add to the follow-up prompt:**

```
For accident/claim raises, always include the four-question valence set:
(1) Were you the driver who was struck, or the one who struck?
(2) Were you hurt — did you treat, and how soon?
(3) Did you or anyone make a claim or hire a lawyer?
(4) Were you satisfied with how it was handled?

When liability is conceded or weak, include commitment-style follow-ups within
legal bounds: whether the juror can return a verdict for the defendant if
causation fails; whether they can award only the medical bills they find were
caused by the collision. Flag for counsel which jurors gave NO damages-posture
answer.
```

---

## 6. VOIR DIRE STRATEGY AGENT (`generateFullVoirDire()`)

**What the trials showed:** The global "who has been in a wreck?" question drew 36 of 36 hands — zero discrimination. The defense funnel (claim brought → hurt in a low-speed rear-ender → disability → chiropractor → legal field) generated nearly every strike-relevant datum. No juror was locked to a damages posture; the one juror who resisted general damages on the record (Whitney, the panel's best defense juror) was lost to a cause challenge while answering open-ended bias questions. The seated Whigham jury — four claimant-adjacent, four clinical/clinical-household, zero favorables — was forecastable from the panel before strikes.

**Add to the system prompt:**

```
EXPERIENCE QUESTIONS MUST FUNNEL: Never rely on a single global experience
question ("who has been in a wreck") — in an auto case it will draw the entire
panel and discriminate nothing. Sequence from broad to valence-resolving:
involvement → injury → claim brought → satisfaction/grievance → the
case-specific mirror question ("hurt in a low-speed rear-end collision").
Budget voir dire time for individually valencing every raise on the mirror
question — those are the highest-signal jurors in the venire.
```

```
DAMAGES MODULE (conceded or weak liability): Generate questions establishing
(within legal bounds, no verdict-promising) that jurors can return a defense
verdict if causation fails, can award bills-only, and can weigh treating-record
entries (treatment gaps, relief notations, prior/subsequent accidents) against
subjective testimony. Identify which jurors to lock in on the record BEFORE
opposing counsel's rehabilitation pass, and warn that leading group
rehabilitation ("can you all be fair?") permanently immunizes claimant-history
jurors against cause.
```

```
PROTECT-LIST DISCIPLINE: For each juror on the PRESERVE list, state explicitly:
do not ask this juror further open-ended bias questions; if opposing counsel
builds a cause record, here are the two rehabilitation questions that restore
them (ability to follow the law as instructed; decide on the evidence). Losing
a favorable juror to cause costs a seat without costing the opponent a strike.
```

```
PANEL PROGNOSIS (new required output, generated when the panel loads and again
when responses close): claimant-history density, clinical/advocacy occupation
density, identified assets and their fragility, both sides' likely strike
targets, and the realistic best-case seated jury under optimal strikes. If the
arithmetic shows adverse jurors surviving any strike plan (e.g., 10+
claimant-adjacent jurors against 8-9 strikes), say so plainly — that is
settlement-posture information the client needs before openings, not after
the verdict.
```

---

## 7. AI CHAT ASSISTANT

**Add to the system prompt:**

```
INTEGRITY FIRST: If the current case context contains data-quality problems —
jurors whose AI analysis failed to generate or parse, assessments still at
AI-default with no attorney confirmation, unrecorded strikes, or un-run
strike-for-cause/Batson modules — disclose the relevant problem BEFORE
answering any question that depends on that data, and name the affected jurors.
Example: "Caution: Jurors #7, #31, and #34 have unparsed risk analyses; their
displayed tiers are defaults, and #7 and #34 are clinicians in a soft-tissue
case."

Be phase-aware: at the end of response recording, remind counsel of the
unresolved-flag rollup; before strikes, remind counsel if strike-for-cause or
Batson has not been run. Keep nudges to one sentence — surface, don't lecture.
```

**Engineering:** extend the dynamic context payload so each juror line carries unresolved flags and key raises (wreck / claim / disability / mirror-question / witness ties), so "who has claim history?" is answered from recorded responses, not lean labels.

---

## 8. CALIBRATION GROUND TRUTH (use for regression testing)

Test any revised agent against these known outcomes:

**Lewis v. Chad (defense verdict, quick):**
- Seated: #1 Jenkins, #5 Sanders, #6 Sullivan, #7 Towner, #10 Bomba, #12 Crumb, #13 Ellis, #14 Griffin, #16 Ladnier, #19 Plasse, #23 Young, #25 Centanni.
- A correct cause model rates Bomba/Ellis/Ladnier/Young "Unlikely" (peremptory-note only). A correct risk model does not rate Jenkins/Sanders/Young strongly adverse given the defense owned the objective evidence. Winston (mirror experience + grievance) remains the #1 strike; Reeves/Stevenson/Bouie (advocacy functions) and De Diaz (active litigant) remain priority strikes.
- Court dismissed only: Weber (explicit statements), Marut/Russell/Hill (hardship/administrative).

**Whigham v. Morris ($500K, ~90 min):**
- Dismissed: #5 Nelson, #15 Welborn, #20 Monroe, #21 Smith, #22 Whitney, #25 Croley.
- Deliberated: #4 Martin, #7 Barefoot, #9 Clark, #11 Fussnecker (foreman), #12 Herman, #13 Martinez, #17 Brannan, #19 Greene, #29 Bull, #32 McGill, #34 Jensen, #35 Roberts. Alternates (did not deliberate): #33 Gueho (P), #8 Brown (D).
- A correct system: parses and displays Barefoot 73/high and Jensen 71/high and ranks both in the top 5 strike targets; flags McGill's witness-patient relationship as a cause-development item; reports a panel prognosis of "multiple claimant/clinical jurors survive any strike plan" before openings.

**Success criteria for the next trial:** zero unparsed analyses; ≤50% of the panel in the "medium" tier after responses close; every mirror-question raise valenced or listed as unresolved at strike time; no demographic rationale anywhere in stored output; a panel prognosis delivered before strikes.

---

## 9. STREAMLINING — BOILERPLATE ELIMINATION AND SPEED

**Evidence:** Every one of the 66 full analyses across both trials opens with a near-identical caution paragraph ("This assessment rests on very limited data and should be treated with caution..."), restates the case facts (the $11,542.50 figure appears in nearly every Whigham analysis), and narrates enrichment nulls category by category. Thin-record jurors received five paragraphs of hedged inference. This wastes tokens (latency + cost), buries the signal, and contributed to the truncation failures.

**Add to the Full Analysis and Brief Summary system prompts:**

```
NO BOILERPLATE: Do not restate case facts the attorney already knows; reference
a case fact only when tied to a specific juror signal. Do not open with
data-limitation caveats — report informationLevel as a structured field and
move on. Do not narrate what is absent (no enrichment, no responses) beyond one
clause. Every sentence must contain juror-specific information or an actionable
recommendation. If the record is thin, the analysis should be SHORT — three
sentences, not five paragraphs of hedged inference. Length must be proportional
to signal, not fixed.
```

**Architecture changes for speed (quality-neutral or quality-positive):**

1. **Deterministic math in code, not the LLM:** Batson strike rates, comparator matching, panel density metrics, tier distributions, and the panel prognosis are computed programmatically; the LLM only writes reasoning and scripts from the computed numbers.
2. **Tier models by juror record, not by agent:** jurors with fewer than 2-3 substantive responses get a short template analysis from the mini model; full GPT-5.4 analysis is reserved for jurors with real signal (statements, claims, flags). Re-run automatically when a thin juror's record grows.
3. **Parallelize per-juror calls** (concurrent batches of 8-10) and **pre-warm**: run risk analyses incrementally as responses are recorded; auto-run strike-for-cause when each examination stage closes. Everything is already computed when the strike conference starts.
4. **Split the monolithic panel calls:** strike-for-cause and Batson process jurors in parallel batches of 5-10 with a fast aggregation pass — the single 8,000-token whole-panel call is slow and truncation-prone (the exact failure mode that buried Barefoot and Jensen).
5. **Prompt caching:** structure every call static-first (system prompt, case context, panel roster) so provider prompt caching applies across the 30+ per-juror calls.
6. **Delta re-analysis:** key each juror's analysis to a hash of responses + notes; regenerate only what changed.

**Quality backstop:** every speed change must still pass the Section 8 ground-truth tests.

---

## 10. ENRICHMENT OVERHAUL

**Why it failed on all but ~2-5 of 36 Whigham jurors (diagnosis):**

1. **Wrong source for the highest-value category.** Web search (Perplexity Sonar) cannot see court dockets, claims history, or arrest records for ordinary people — those live in AlaCourt and county systems. "Legal Issues" is structurally unanswerable by the current pipeline, and it is the category that matters most (claimant history was a top-3 predictive signal in both trials).
2. **Base-rate problem.** Every successful lookup (Bryant, Fries, Jensen, Barefoot, Martin) was a person with a professional or licensed web footprint — LinkedIn, provider directories, broadcast careers. Hourly workers, retirees, retail employees, and young jurors are not published anywhere a crawler reaches. Low yield is expected, not a bug.
3. **Input noise.** Names and employers arrive as court-formatted OCR output ("SHEFIFF DEPARTMENT"; compound surname "MARTINEZ VANEGAS JOSE CRUZ" reformatted into an order nobody uses; "Wigham"/"Whigham"). Exact-match searching on noisy inputs kills recall.
4. **Binary verification discards usable leads.** The prompt correctly forbids attributing unconfirmed matches, but common-name candidates (Lauren Young, Timothy Clark) are thrown away entirely instead of surfaced as confirmable leads.

**Fixes (enrichment runs in the background from strike-list lock, so runtime is not the constraint — sources and inputs are):**

1. **Add AlaCourt party search** (name + DOB against Alabama civil/criminal dockets). This directly answers "has this juror sued or been sued," the single most predictive enrichment datum for this tool. Highest-value upgrade available.
2. **Add deterministic registry lookups:** Alabama licensing boards (nursing, PT, contractors — verifies occupations), Secretary of State business registrations (verifies ownership claims), county property records. These are fast, cheap, and confirmable.
3. **Pre-search cleanup pass:** correct OCR spellings of names/employers before querying; generate name variants (drop middle names, reorder compound surnames, try maiden-name patterns for married women); anchor queries on name + employer — every successful match in Whigham keyed on the employer.
4. **Confidence-scored candidates instead of binary verified/null:**

```
MATCH REPORTING: Return candidateMatches with a confidence level (confirmed /
probable / possible) and the discriminator used (employer, DOB, address,
license). Never attribute a possible match as fact in downstream analysis, but
surface probable matches to the attorney for one-tap confirmation. Skip the
Legal Issues category in web search (structurally unavailable) — source it
from docket lookups instead. Report nulls in one line without narration.
```

5. **Per-category targeted queries** (docket lookup, license lookup, news search, social search) instead of one mega-prompt — each source answers what it can actually answer.
