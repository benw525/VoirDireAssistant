/**
 * ALWAYS-directive enforcement (training doc): demographics must NEVER
 * appear as a strike rationale in generated work product — it is
 * Batson-discoverable liability. The prompts already prohibit this; this
 * module is the code-level guarantee (the model was observed profiling a
 * raise-only juror by his DOB — "his age" — despite the prompt directive).
 *
 * Patterns are a superset of the calibration harness's independent gate
 * (scripts/calibrate-trials.ts / scripts/prompt-regression.ts): the harness
 * stays an outer end-to-end check; this module is runtime enforcement with
 * retry-then-throw semantics. NEVER silently rewrite flagged text.
 */
export const DEMOGRAPHIC_RATIONALE_PATTERNS: RegExp[] = [
  // Optional adjectives allowed: "as an older Black woman" must match.
  /\bas an? (?:\w+[- ])?(black|white|hispanic|latino|latina|asian|african[- ]american|female|male|woman|man)\b/i,
  // Demographic subject followed (within a clause) by a lean/behavior verb:
  // catches "Black woman may favor plaintiff", "African American juror is
  // likely to sympathize", "Hispanic men tend to..." — reasoning, not the
  // mere presence of a demographic word.
  /\b(black|white|hispanic|latino|latina|asian|african[- ]american) (jurors?|wom[ae]n|m[ae]n|males?|females?)\b.{0,60}\b(tends?|are more|are less|is more|is less|statistically|may favor|likely to|will favor|favors?|leans?|sympath)/i,
  /\b(his|her|their) (race|sex|gender|age|ethnicity)\b/i,
  /\b(women|men|females?|males?) (tend to|are more likely|statistically)/i,
  /\bstatistically more (plaintiff|defense)/i,
  /\bdemographic profile suggests\b/i,
  // "elderly" only as a characterization of the juror — "cares for an
  // elderly parent" is a legitimate record fact and must NOT flag.
  /\belderly (juror|man|woman|male|female|gentleman|lady)\b/i,
  /\b(he|she|they) (is|are) elderly\b/i,
  /\b(older|younger) (man|woman|male|female|juror)/i,
];

/** Returns the first demographic-rationale snippet found, or null if clean. */
export function findDemographicRationale(text: string): string | null {
  for (const rx of DEMOGRAPHIC_RATIONALE_PATTERNS) {
    const m = text.match(rx);
    if (m) return m[0];
  }
  return null;
}
