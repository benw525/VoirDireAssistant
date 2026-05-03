# Voir Dire Analyst — Case Summary Brief

> **Audience:** an AI agent (or human researcher) being asked to produce a case summary that will be loaded into the Voir Dire Analyst.
> **Goal:** turn a pile of pleadings, motions, depositions, and discovery into the four short fields the tool actually consumes — written in a way that maximizes the quality of every downstream AI analysis (juror scoring, Batson, strike-for-cause, voir dire authoring, live follow-up suggestions, and Perplexity background research).

---

## 1. What this tool is

**Voir Dire Analyst** is a jury-selection assistant for trial attorneys. It runs the full voir dire workflow on a single case at a time:

1. **Strike-list intake** — OCR + parse a court-issued juror panel sheet (PDF or image) into structured juror records (name, demographics, occupation, employer, address).
2. **Background research (Perplexity Sonar Pro)** — automatically pulls publicly available information on each juror (employment history, business ties, public statements, legal history, community involvement).
3. **Per-juror analysis (Claude Opus 4.7)** — assigns a *lean* (favorable / neutral / unfavorable), a *risk tier* (low / medium / high), and a written rationale.
4. **Voir dire question authoring (Claude Opus 4.7)** — generates 12–20 strategic questions plus juror-specific follow-ups, cause flags, and a strike guide tied to the case facts.
5. **Live courtroom mode** — collaborative session where attorneys record juror answers in real time; **Claude Sonnet 4.6** suggests 2–3 follow-up questions on the fly based on each answer.
6. **Strike-for-cause memos & Batson tracking (Claude Opus 4.7)** — drafts the actual record-ready cause challenges and runs Batson defensive/offensive analysis on the strike pattern.

Every one of these features is fed by **one short case description** the attorney enters at case creation. Garbage in = garbage everywhere downstream. The point of this brief is to make sure that one description is *not* garbage.

---

## 2. The four fields you must produce

The tool stores exactly four case-context fields. Match these names exactly.

| Field | Type | What it is |
|---|---|---|
| `name` | string | A short case caption, e.g. `"Rivera v. Apex Logistics"`. |
| `areaOfLaw` | string | One of the recognized areas: `Employment Discrimination`, `Personal Injury`, `Medical Malpractice`, `Products Liability`, `Premises Liability`, `Commercial / Contract`, `Criminal — Prosecution`, `Criminal — Defense`, `Civil Rights / §1983`, `Family Law`, `Insurance Bad Faith`, `Wrongful Death`, `Toxic Tort / Environmental`. If none fits, pick the closest and note it. |
| `side` | `"plaintiff"` \| `"defense"` | Whose side the attorney is on. For criminal cases, `plaintiff` = prosecution, `defense` = defense. **This flips every analysis downstream — get it right.** |
| `summary` | string, ~150–300 words | The case facts and themes. See §3. |
| `favorableTraits` | string[] | The attorney's "golden juror" profile — traits that suggest a juror will lean *toward our side*. See §4. |
| `riskTraits` | string[] | The "strike trigger" profile — traits that suggest a juror will lean *against our side*. See §4. |

That's it. There are no other case-level fields. Don't invent ones.

---

## 3. How to write the `summary` (the most important field)

This single paragraph is concatenated into **every** AI prompt the tool runs. Optimize for it.

### Required content (in this order)
1. **Parties.** Who is suing whom, with the human-relatable identifier (age, role, demographics where legally relevant — e.g., *"Maria Rivera, a 47-year-old Latina logistics dispatcher"*).
2. **Core facts.** What happened, in chronological order, in 2–4 sentences. No legalese. A juror should be able to follow it.
3. **Causes of action / charges.** The actual legal claims (e.g., *"Title VII race + sex discrimination, ADEA age discrimination, retaliation"*).
4. **The opposing theory.** What the other side is going to argue happened (e.g., *"Defendant claims the demotion was performance-based, citing a single missed-deadline incident"*). The voir dire generator uses this to write inoculation questions.
5. **Damages or stakes.** Numerical demand if applicable, or the punishment range in a criminal case. Helps the AI calibrate questions about reluctance to award/convict.
6. **One sentence on the trial themes the attorney plans to argue** if known (e.g., *"trial themes: pretext, retaliation, accountability of large employers"*).

### Style rules
- **Plain English, present tense.** Write it as if explaining the case to a smart friend, not to a judge.
- **No citations, no statute numbers** unless the statute itself is recognizable to lay jurors (Title VII is fine; "29 U.S.C. § 626(b)" is not).
- **Name the protected class or sympathetic facts explicitly** if they are part of the trial story. The Batson agent and the per-juror analyzer rely on this to weight demographic factors honestly.
- **Do not include attorney work product or trial strategy beyond themes.** This field is stored in the database; treat it as confidential but not privileged.
- **No bullet points, no headers** — write it as a single flowing paragraph. The AI prompts inject it inline.

### Example (good)
> Maria Rivera, a 47-year-old Latina logistics dispatcher with 12 years of strong performance reviews at Apex Logistics, was passed over for a Regional Operations Manager promotion in favor of a younger white male coworker with less operational experience. Two weeks after she raised the issue with HR, she was demoted from dispatcher to warehouse clerk, losing roughly $22,000 in annual pay. She brings claims under Title VII (race and sex discrimination), the ADEA (age discrimination), and Title VII's anti-retaliation provision. Apex contends the demotion was performance-based, pointing to a single missed-deadline incident the week before the demotion, and denies any discriminatory motive. Plaintiff seeks back pay, front pay, and punitive damages. Trial themes: pretext, the timing of the demotion relative to her HR complaint, and corporate accountability.

### Example (bad — do not do this)
> Plaintiff Rivera alleges violations of 42 U.S.C. § 2000e-2(a)(1), 29 U.S.C. § 623(a)(1), and 42 U.S.C. § 2000e-3(a) arising from adverse employment actions taken against her by Defendant Apex Logistics, Inc. Damages sought include but are not limited to economic losses, emotional distress damages, and punitive damages pursuant to applicable statutory caps.
*(This is legally accurate but useless for jury selection. The AI cannot extract themes from it.)*

---

## 4. How to write `favorableTraits` and `riskTraits`

These are **arrays of short strings** — not paragraphs. Each entry is one trait, written the way you would describe a juror in shorthand. They feed directly into juror scoring and into the voir dire question generator's "preserve / strike" logic.

### Rules
- **Aim for 6–12 entries per array.** Fewer than 4 starves the AI; more than 15 dilutes the signal.
- **Each entry should be one trait, 2–8 words.** Combine demographic, occupational, ideological, and life-experience cues.
- **Write them from the attorney's perspective.** "Anyone who has personally experienced workplace discrimination" — not "jurors plaintiff likes."
- **Be concrete, not coy.** If union members are favorable for your case, say "union members" — don't write "pro-worker individuals."
- **Demographic traits are allowed and expected** (race, sex, age range, immigration status), because they are inputs to the Batson analyzer's protected-class detection. Just be honest about *why* you've listed them — the analyzer reads the case summary alongside.
- **Do not duplicate** between favorable and risk lists. Pick a side or omit.

### Examples (Employment Discrimination, plaintiff side)

**`favorableTraits`:**
- women of color, especially in their 40s and older
- union members, current or former
- nurses, teachers, social workers
- jurors who have personally experienced or watched a close family member experience workplace unfairness
- people who have been passed over for a promotion
- jurors who openly value workplace fairness
- single parents
- people with non-supervisory roles in large organizations

**`riskTraits`:**
- HR managers and HR consultants
- defense-side employment lawyers or paralegals
- small-business owners (especially with employees)
- jurors openly skeptical of discrimination claims
- "pull-yourself-up-by-your-bootstraps" worldview
- jurors who refer to lawsuits as a "lottery"
- corporate executives in compliance, legal, or risk roles
- jurors with prior service on a defense verdict in a discrimination case

### A second example (Criminal — Defense)

**`favorableTraits`:**
- jurors who have had negative experiences with police
- younger jurors (18–35)
- people with friends or family members who have been arrested
- jurors who value civil liberties or have donated to ACLU-type causes
- people who work in social services, mental health, or addiction recovery
- jurors who express skepticism of government overreach

**`riskTraits`:**
- current or retired law enforcement officers and family members
- crime victims (recent and serious)
- prosecutors' family members
- jurors who say "if they were arrested they probably did it"
- military officers in command roles
- private security industry

---

## 5. What good output looks like (delivery format)

When you finish, hand the attorney **one block** they can paste into the case-creation form, in this exact shape:

```
Name: Rivera v. Apex Logistics
Area of Law: Employment Discrimination
Side: plaintiff

Summary:
[150–300 word paragraph following §3]

Favorable Traits:
- trait
- trait
- ...

Risk Traits:
- trait
- trait
- ...
```

Nothing else. No preamble, no caveats, no "I hope this helps."

---

## 6. Where to get the source material

In rough priority order:

1. **The complaint / indictment** — gives you parties, claims/charges, factual allegations.
2. **The answer or defense pleadings** — gives you the opposing theory.
3. **Any motions in limine that have been ruled on** — tells you what the jury *will* and *won't* hear; rewrite your summary to match what jurors will actually be told.
4. **Demand letters or settlement statements** — for damages numbers.
5. **The attorney's own opening-statement outline or trial brief** — gold for trial themes if available.
6. **Deposition summaries** — only if needed to clarify a fact pattern.

Do not pull facts from news coverage of the case unless the attorney explicitly asks; jurors are typically instructed to disregard pretrial publicity, and including those facts can taint the AI's analysis.

---

## 7. Pitfalls to avoid

- **Don't editorialize about juror groups.** Stating "union members tend to be plaintiff-favorable in employment cases" is fine in the trait list. Writing "we want to avoid bigoted suburbanites" in the summary will skew every analysis the tool runs and can create ugly Batson exposure.
- **Don't omit damages.** A $50K wage-loss case and a $5M punitive case need very different juror profiles. The voir dire generator uses damages magnitude to calibrate questions about willingness to award.
- **Don't write the summary in the third-person legal-brief voice** ("Plaintiff alleges that…"). Write it in plain narrative voice.
- **Don't list traits the attorney can't actually probe in voir dire.** "Jurors who secretly distrust corporations" is unfalsifiable. "Jurors who say in voir dire that big companies usually act in good faith" is something the question generator can build a question around.
- **Don't duplicate the case name inside the summary.** It's already in the `name` field.
- **Don't include the juror panel itself.** Jurors are uploaded separately from the strike list.

---

## 8. Quick checklist before you hand it off

- [ ] `name`: short caption, no styling
- [ ] `areaOfLaw`: one of the recognized values
- [ ] `side`: `plaintiff` or `defense`, correct from the attorney's POV
- [ ] `summary`: 150–300 words, plain English, includes parties, facts, claims, opposing theory, damages, themes
- [ ] `favorableTraits`: 6–12 short, concrete entries
- [ ] `riskTraits`: 6–12 short, concrete entries
- [ ] No statute citations, no legalese, no editorializing
- [ ] No duplication between favorable/risk
- [ ] Damages or stakes are stated
- [ ] Trial themes are stated if known

If every box is checked, the case is ready to load.
