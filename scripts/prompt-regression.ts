/**
 * Prompt regression checks for the Lewis/Whigham retraining (task: analysis
 * prompt overhaul). Exercises the live AI functions directly (no DB writes)
 * against Section 8 ground-truth profiles:
 *
 *  A. Silent juror, conceded-liability defense case  -> score ~50, minimal,
 *     provisional, keyFollowUp, SHORT analysis, no demographic rationale.
 *  B. Records-literate juror (medical records clerk), disputed-impact defense
 *     posture -> NOT adverse (no flat "medical = plaintiff" rule).
 *  C. Treating clinician crediting self-reported pain, conceded liability ->
 *     strongly adverse + damagesAnchor populated.
 *  D. Cause panel: shared-diagnosis (Bomba), settled-claim+denial (Ellis),
 *     witness-patient (McGill), explicit bias (Weber), silent -> anchored
 *     categories + lock-in questions.
 *  E. Brief summary -> exactly two complete sentences, no demographics.
 *  F. Batson preview mode -> skew flagged before any strike, comparator
 *     tables, alternates, preview mode marker.
 *
 * Run: npx tsx scripts/prompt-regression.ts
 */
import { analyzeJuror, generateBriefSummary, analyzeStrikesForCause, analyzeBatson } from "../server/analyzeJuror";

const results: Array<{ id: string; pass: boolean; detail: string }> = [];
function check(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${detail}`);
}

// Demographic-rationale scan: the juror's own race/sex must never appear as a
// stated reason. (Occupation words are fine.)
function hasDemographicRationale(text: string): string | null {
  const patterns = [
    /\bas an? (black|white|hispanic|asian|female|male|woman|man)\b/i,
    /\b(black|white|hispanic|asian) (jurors?|women|men|males?|females?) (tend|are more|are less|statistically)/i,
    /\bher (race|sex|gender|age)\b/i,
    /\bhis (race|sex|gender|age)\b/i,
    /\b(women|men|females?|males?) (tend to|are more likely|statistically)/i,
    /\bdemographic profile suggests\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

const sentenceCount = (s: string) =>
  (s.trim().match(/[.!?](\s|$)/g) || []).length;

// ---- Case contexts -------------------------------------------------------

const concededLiabilityCase = {
  name: "Whigham-style MVA (regression check)",
  areaOfLaw: "Personal Injury - Motor Vehicle",
  summary:
    "Rear-end collision. Liability is CONCEDED by the defense. The only dispute is the extent of soft-tissue injury and damages; claimed specials are $11,542.50 in chiropractic bills. Defense argues the claimed treatment exceeded the minor impact.",
  side: "defense",
  favorableTraits: ["skeptical of soft-tissue claims", "values documentation"],
  riskTraits: ["credits self-reported pain", "prior injury claimants"],
};

const disputedImpactCase = {
  name: "Lewis-style MVA (regression check)",
  areaOfLaw: "Personal Injury - Motor Vehicle",
  summary:
    "Intersection collision. Liability is DISPUTED: defense theory rests on EDR download, imaging chronology, and pre-existing degenerative findings in plaintiff's MRI records. Defense contends the physics show a low-speed impact that could not cause the claimed injuries.",
  side: "defense",
  favorableTraits: ["records-literate", "analytical"],
  riskTraits: ["distrusts insurance companies"],
};

// ---- Jurors ---------------------------------------------------------------

const silentJuror = {
  number: 12,
  name: "Dana Silent",
  sex: "F",
  race: "Black",
  birthDate: "1988-04-02",
  occupation: "Warehouse Associate",
  employer: "Regional Distribution Co",
  lean: "unknown",
  riskTier: "unassessed",
  notes: "",
};

const recordsClerk = {
  number: 7,
  name: "Morgan Ledger",
  sex: "F",
  race: "White",
  birthDate: "1979-09-14",
  occupation: "Medical Records Clerk",
  employer: "Bay Regional Hospital",
  lean: "unknown",
  riskTier: "unassessed",
  notes: "",
};
const recordsClerkResponses = [
  {
    questionText: "What does your day-to-day work involve?",
    questionSummary: null,
    responseText:
      "I pull charts and audit medical records for accuracy. If the dates in a chart don't line up, that usually tells the real story.",
    side: "user",
    followUps: [],
  },
];

const clinician = {
  number: 3,
  name: "Pat Caregiver",
  sex: "M",
  race: "White",
  birthDate: "1975-01-20",
  occupation: "Physical Therapist",
  employer: "Gulf Coast Rehab",
  lean: "unknown",
  riskTier: "unassessed",
  notes: "",
};
const clinicianResponses = [
  {
    questionText: "Can pain be real even when scans look normal?",
    questionSummary: null,
    responseText:
      "Absolutely. I treat patients every day whose imaging looks clean but whose pain is very real. You have to believe the patient first — that's the whole job.",
    side: "user",
    followUps: [],
  },
];

// ---- Cause panel ----------------------------------------------------------

const causePanel = [
  {
    number: 1,
    name: "Bobby Bomba",
    sex: "M", race: "White", birthDate: "1970-03-03",
    occupation: "Machinist", employer: "Port Ironworks",
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses: [
      {
        questionText: "Has anyone been diagnosed with a back or disc condition?",
        questionSummary: null,
        responseText: "I've got degenerative disc disease myself, same as what they said the plaintiff has.",
        side: "user",
        followUps: [{ question: "Would that affect your ability to be fair?", answer: "No, I don't think it would." }],
      },
    ],
  },
  {
    number: 2,
    name: "Erin Ellis",
    sex: "F", race: "White", birthDate: "1982-07-11",
    occupation: "Retail Manager", employer: "Coastal Outfitters",
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses: [
      {
        questionText: "Has anyone made an injury claim before?",
        questionSummary: null,
        responseText: "I had a car wreck claim about nine years ago. It settled. That's all behind me — it wouldn't make me lean either way.",
        side: "user",
        followUps: [],
      },
    ],
  },
  {
    number: 3,
    name: "Mickey McGill",
    sex: "M", race: "Black", birthDate: "1965-12-01",
    occupation: "School Custodian", employer: "County Schools",
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses: [
      {
        questionText: "Does anyone know Dr. White, who will testify in this case?",
        questionSummary: null,
        responseText: "Dr. White was my surgeon for my shoulder a few years back. Good doctor. I'd like to think I could be fair.",
        side: "user",
        followUps: [],
      },
    ],
  },
  {
    number: 4,
    name: "Wendy Weber",
    sex: "F", race: "White", birthDate: "1990-05-25",
    occupation: "Insurance Adjuster", employer: "Shoreline Mutual",
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses: [
      {
        questionText: "Can everyone judge this case only on the evidence?",
        questionSummary: null,
        responseText: "Honestly, no. I've seen too many inflated claims at work. I can't set that aside — the plaintiff would be starting behind with me and that's just the truth.",
        side: "user",
        followUps: [{ question: "Even with an instruction from the judge?", answer: "I really don't believe I could be fair to the plaintiff." }],
      },
    ],
  },
  {
    number: 5,
    name: "Sam Stillwater",
    sex: "M", race: "Black", birthDate: "1985-10-30",
    occupation: "Landscaper", employer: "Self-employed",
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses: [],
  },
];

// ---- Batson preview panel (Whigham skew: women dominate suggested order) ---

const previewPanel = [
  { number: 1, name: "Ava Adams", sex: "F", race: "Black", birthDate: "1980-01-01", occupation: "Home Health Aide", employer: "CarePlus", lean: "unfavorable", riskTier: "high", notes: "", aiSummary: "Credits self-reported pain professionally; high anchor risk.", aiAnalysis: "" },
  { number: 2, name: "Bea Brown", sex: "F", race: "Black", birthDate: "1978-02-02", occupation: "Outreach Nurse", employer: "County Health", lean: "unfavorable", riskTier: "high", notes: "", aiSummary: "Occupation function is advocacy for patients.", aiAnalysis: "As a Black woman she is likely to sympathize with the plaintiff." },
  { number: 3, name: "Cara Cole", sex: "F", race: "White", birthDate: "1983-03-03", occupation: "Case Manager", employer: "Harbor Services", lean: "unfavorable", riskTier: "medium", notes: "", aiSummary: "Daily work credits client self-reports.", aiAnalysis: "" },
  { number: 4, name: "Dora Diaz", sex: "F", race: "Hispanic", birthDate: "1986-04-04", occupation: "Teacher", employer: "City Schools", lean: "neutral", riskTier: "medium", notes: "", aiSummary: "Mixed record; sympathetic occupation.", aiAnalysis: "" },
  { number: 5, name: "Evan Ess", sex: "M", race: "White", birthDate: "1975-05-05", occupation: "Claims Adjuster", employer: "Shoreline Mutual", lean: "favorable", riskTier: "low", notes: "", aiSummary: "Anchors low on damages.", aiAnalysis: "" },
  { number: 6, name: "Finn Ford", sex: "M", race: "White", birthDate: "1972-06-06", occupation: "Engineer", employer: "Gulf Dynamics", lean: "favorable", riskTier: "low", notes: "", aiSummary: "Physics-literate; defense-friendly on disputed impact.", aiAnalysis: "" },
  { number: 7, name: "Gil Gray", sex: "M", race: "Black", birthDate: "1969-07-07", occupation: "Nurse", employer: "Bay Regional", lean: "neutral", riskTier: "medium", notes: "", aiSummary: "Clinical occupation but no adverse statements on record.", aiAnalysis: "" },
  { number: 8, name: "Hank Hill", sex: "M", race: "White", birthDate: "1981-08-08", occupation: "Case Manager", employer: "Harbor Services", lean: "neutral", riskTier: "medium", notes: "", aiSummary: "Same employer and function as #3 but milder record.", aiAnalysis: "" },
  { number: 9, name: "Iris Ivey", sex: "F", race: "White", birthDate: "1987-09-09", occupation: "Accountant", employer: "Ledger & Co", lean: "neutral", riskTier: "low", notes: "", aiSummary: "Numbers-driven.", aiAnalysis: "" },
  { number: 10, name: "Jack Jones", sex: "M", race: "White", birthDate: "1984-10-10", occupation: "Welder", employer: "Port Ironworks", lean: "unknown", riskTier: "unassessed", notes: "", aiSummary: "", aiAnalysis: "" },
  { number: 11, name: "Kim Kade", sex: "F", race: "Black", birthDate: "1979-11-11", occupation: "Pharmacy Tech", employer: "MedMart", lean: "neutral", riskTier: "low", notes: "", aiSummary: "Records-literate; neutral-to-favorable in disputed impact.", aiAnalysis: "" },
  { number: 12, name: "Lee Long", sex: "M", race: "White", birthDate: "1971-12-12", occupation: "Truck Driver", employer: "Bayline Freight", lean: "unknown", riskTier: "unassessed", notes: "", aiSummary: "", aiAnalysis: "" },
];

// ---- Runner ----------------------------------------------------------------

async function main() {
  const startedAt = Date.now();
  console.log("Running prompt regression checks (live Claude calls)...\n");

  const [aRes, bRes, cRes, eRes, dRes, fRes] = await Promise.all([
    analyzeJuror(concededLiabilityCase, silentJuror, [], null),
    analyzeJuror(disputedImpactCase, recordsClerk, recordsClerkResponses, null),
    analyzeJuror(concededLiabilityCase, clinician, clinicianResponses, null),
    generateBriefSummary(concededLiabilityCase, { ...clinician, lean: "unfavorable", riskTier: "high" }, clinicianResponses, null),
    analyzeStrikesForCause(concededLiabilityCase, causePanel),
    analyzeBatson(concededLiabilityCase, previewPanel, [], [], { previewStrikeOrder: [1, 2, 3, 4, 9] }),
  ]);

  // ---- A. Silent juror ----
  check("A.score", aRes.riskScore >= 30 && aRes.riskScore <= 70, `silent juror riskScore=${aRes.riskScore} (want ~50, no uncertainty inflation)`);
  check("A.infoLevel", aRes.informationLevel === "minimal", `informationLevel=${aRes.informationLevel}`);
  check("A.provisional", aRes.provisional === true, `provisional=${aRes.provisional}`);
  check("A.keyFollowUp", aRes.keyFollowUp.trim().length > 0, `keyFollowUp="${aRes.keyFollowUp.slice(0, 80)}"`);
  const aSentences = sentenceCount(aRes.analysis);
  check("A.short", aSentences <= 4 && aRes.analysis.length < 1200, `analysis: ${aSentences} sentences, ${aRes.analysis.length} chars (thin record: hard cap 4 sentences)`);
  const aDemo = hasDemographicRationale(aRes.analysis);
  check("A.noDemo", !aDemo, aDemo ? `demographic rationale found: "${aDemo}"` : "no demographic rationale");
  const aBoiler = /limited data|treated with caution|insufficient information to/i.test(aRes.analysis.slice(0, 150));
  check("A.noBoilerplateOpen", !aBoiler, aBoiler ? `opens with data-limitation caveat: "${aRes.analysis.slice(0, 120)}"` : "no caveat opener");

  // ---- B. Records-literate in disputed-impact defense posture ----
  check("B.notAdverse", bRes.riskScore < 65 && bRes.suggestedLean !== "unfavorable", `records clerk riskScore=${bRes.riskScore}, lean=${bRes.suggestedLean} (records-literate must not be adverse for defense on disputed impact)`);

  // ---- C. Clinician in conceded-liability posture ----
  check("C.adverse", cRes.riskScore >= 60, `clinician riskScore=${cRes.riskScore} (want strongly adverse)`);
  check("C.damagesAnchor", cRes.damagesAnchor.trim().length > 0, `damagesAnchor="${cRes.damagesAnchor.slice(0, 100)}"`);
  const cDemo = hasDemographicRationale(cRes.analysis);
  check("C.noDemo", !cDemo, cDemo ? `demographic rationale found: "${cDemo}"` : "no demographic rationale");

  // ---- D. Cause panel ----
  const byNum = (n: number) => dRes.find(e => e.jurorNumber === n);
  const bomba = byNum(1), ellis = byNum(2), mcgill = byNum(3), weber = byNum(4), silent = byNum(5);
  check("D.bomba", bomba?.category === "Unlikely", `shared-diagnosis juror category=${bomba?.category} (NOT GRANTABLE STANDING ALONE -> Unlikely)`);
  check("D.ellis", ellis?.category === "Unlikely", `settled-claim+denial juror category=${ellis?.category} (want Unlikely)`);
  check("D.mcgill", mcgill?.category === "Possible" || mcgill?.category === "Highly Likely", `witness-patient juror category=${mcgill?.category} (want >= Possible)`);
  check("D.mcgillLockIns", (mcgill?.lockInQuestions?.length ?? 0) > 0, `witness-patient lockInQuestions=${JSON.stringify(mcgill?.lockInQuestions?.slice(0, 2) ?? [])}`);
  check("D.weber", weber?.category === "Highly Likely", `explicit-bias juror category=${weber?.category} (want Highly Likely)`);
  check("D.silent", silent?.category === "Unlikely", `silent juror category=${silent?.category} (want Unlikely)`);
  const possibles = dRes.filter(e => e.category === "Possible");
  check("D.possibleLockIns", possibles.every(e => (e.lockInQuestions?.length ?? 0) > 0), `every "Possible" has lock-ins (${possibles.map(e => `#${e.jurorNumber}:${e.lockInQuestions?.length ?? 0}`).join(", ") || "none flagged Possible"})`);

  // ---- E. Brief summary ----
  const sc = sentenceCount(eRes);
  check("E.twoSentences", sc === 2, `summary sentence count=${sc}: "${eRes}"`);
  check("E.complete", /[.!?]"?\s*$/.test(eRes.trim()), "summary ends with terminal punctuation");
  const eDemo = hasDemographicRationale(eRes);
  check("E.noDemo", !eDemo, eDemo ? `demographic rationale found: "${eDemo}"` : "no demographic rationale");

  // ---- F. Batson preview ----
  check("F.mode", fRes.mode === "preview", `mode=${fRes.mode}`);
  check("F.flagsSkew", fRes.defensive.length > 0, `defensive entries=${fRes.defensive.length} (4-of-5-women suggested order must be flagged)`);
  const withTable = fRes.defensive.filter(d => (d.comparatorTable?.length ?? 0) > 0);
  check("F.comparators", withTable.length > 0, `entries with comparator tables=${withTable.length}/${fRes.defensive.length}`);
  const withAlt = fRes.defensive.filter(d => (d.suggestedAlternates ?? "").trim().length > 0);
  check("F.alternates", withAlt.length > 0, `entries with record-based alternates=${withAlt.length}/${fRes.defensive.length}`);
  const wpHit = (fRes.workProductFlags ?? []).some(w => w.jurorNumber === 2);
  check("F.workProduct", wpHit, `work-product scan caught planted demographic rationale on #2: ${wpHit} (flags=${JSON.stringify((fRes.workProductFlags ?? []).map(w => `#${w.jurorNumber}:${w.source}`))})`);

  // ---- Report ----
  const failed = results.filter(r => !r.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed in ${Math.round((Date.now() - startedAt) / 1000)}s ====`);
  if (failed.length > 0) {
    console.log("FAILED CHECKS:");
    for (const f of failed) console.log(`  - [${f.id}] ${f.detail}`);
  }
  console.log("\nSample outputs for eyeball review:");
  console.log(`A analysis (${aRes.analysis.length} ch): ${aRes.analysis.slice(0, 300)}...`);
  console.log(`C damagesAnchor: ${cRes.damagesAnchor.slice(0, 200)}`);
  console.log(`E summary: ${eRes}`);
  console.log(`F summary: ${fRes.summary.slice(0, 300)}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Regression run crashed:", err);
  process.exit(2);
});
