/**
 * Ground-truth fixtures for the calibration harness (npm run calibrate).
 *
 * Two real trials from the Lewis/Whigham retraining document:
 *  - Lewis v. Chad: defense, DISPUTED low-speed impact where the defense
 *    owned the objective evidence (EDR no-event, sub-1g biomechanics,
 *    pre-incident imaging). Quick defense verdict. Teaches: shared
 *    diagnosis / settled claim / clinical occupation / records-adjacency
 *    are NOT cause; courts dismiss on explicit statements and hardship
 *    only; records-literate jurors are favorable when the defense owns
 *    the documents; mirror-experience + grievance and active litigants
 *    and advocacy occupations are the real strikes.
 *  - Whigham v. Morris: defense, CONCEDED-liability rear-ender,
 *    $11,542.50 specials vs $2.2M ask, $500K plaintiff verdict. Teaches:
 *    global wreck raises carry no valence (thin records stay provisional
 *    near the anchor), clinical/claimant jurors must rank at the top,
 *    witness-patient connections are cause-development items, and the
 *    panel's adverse-survival floor was forecastable before openings.
 *
 * Strike numbers for Lewis are synthesized (the transcript records who was
 * seated/dismissed, not strike order): plaintiff struck 6-of-7 men (the
 * J.E.B. pattern the tool's Batson agent caught), defense struck its
 * priority risks. Fixture jurors not named in the training document are
 * neutral fillers.
 */
import type { CaseContext, JurorData, ResponseData } from "../server/analyzeJuror";

export interface CalibrationResponse extends ResponseData {
  /** questionNumber link for flag computation (prognosis); null = ad hoc. */
  questionId: number | null;
}

export interface CalibrationJuror extends JurorData {
  responses: CalibrationResponse[];
  /** Stored AI summary — Batson work-product sanitation scans these. */
  aiSummary?: string;
}

export interface TrialFixture {
  id: "lewis" | "whigham";
  label: string;
  caseContext: CaseContext;
  jurors: CalibrationJuror[];
  questions: Array<{ questionNumber: number; originalText: string; rephrase: string | null }>;
  courtDismissed: number[];
  /** Executed strikes for the Batson check (defense = "your" side). */
  yourStrikes: number[];
  theirStrikes: number[];
}

function r(
  questionId: number | null,
  questionText: string | null,
  responseText: string,
  followUps: Array<{ question: string; answer: string }> = [],
): CalibrationResponse {
  return { questionId, questionText, questionSummary: null, responseText, side: "yours", followUps };
}

function juror(
  number: number,
  name: string,
  sex: string,
  race: string,
  birthDate: string,
  occupation: string,
  employer: string,
  responses: CalibrationResponse[],
  aiSummary?: string,
): CalibrationJuror {
  return {
    number, name, sex, race, birthDate, occupation, employer,
    lean: "unknown", riskTier: "unassessed", notes: "",
    responses,
    ...(aiSummary ? { aiSummary } : {}),
  };
}

// ---------------------------------------------------------------------------
// LEWIS v. CHAD
// ---------------------------------------------------------------------------

const LQ = {
  wreck: "Have you or anyone close to you ever been involved in a motor vehicle wreck or accident?",
  claims: "Have you or a family member ever brought an injury claim, filed a lawsuit, or received a settlement?",
  backs: "Has anyone been diagnosed with a back or neck condition — disc problems, degenerative changes, anything like that?",
  fair: "Is there anything about this kind of case — a disputed low-speed collision with a claimed disc injury — that would make it hard for you to be completely fair to both sides?",
  work: "Tell us a little about what you do for work and what a normal week looks like.",
};

const LEWIS_QUESTIONS = [
  { questionNumber: 1, originalText: LQ.wreck, rephrase: null },
  { questionNumber: 2, originalText: LQ.claims, rephrase: null },
  { questionNumber: 3, originalText: LQ.backs, rephrase: null },
  { questionNumber: 4, originalText: LQ.fair, rephrase: null },
  { questionNumber: 5, originalText: LQ.work, rephrase: null },
];

const LEWIS_JURORS: CalibrationJuror[] = [
  juror(1, "Denise Jenkins", "F", "W", "6/2/1971", "Insurance Claims Adjuster", "Gulf Coast Mutual", [
    r(5, LQ.work, "I've handled bodily-injury claims for twenty years. I read the medical records and the estimates and I go where the documents go."),
    r(4, LQ.fair, "No. If the recorder and the scans say one thing and a witness says another, I weigh all of it — but paper doesn't get nervous on the stand."),
  ], "Veteran claims adjuster; document-driven and comfortable with injury files."),
  juror(2, "Tamara Winston", "F", "B", "9/17/1979", "Retail Store Manager", "Beltline Home Goods", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
    r(1, LQ.wreck, "I was rear-ended at a stoplight in 2019. It didn't look like much — barely a scratch on the bumper — but my neck hurt for over a year, and the insurance company treated me like I was making the whole thing up. I'm still angry about how that went.", [
      { question: "Did you bring a claim?", answer: "I hired a lawyer and it settled, but they made me fight for every appointment." },
    ]),
  ], "Store manager who was rear-ended at low speed herself and fought the insurer over treatment."),
  juror(3, "Monica Reeves", "F", "B", "2/8/1969", "Community Outreach Nurse", "Mobile County Health Coalition", [
    r(5, LQ.work, "I run wellness outreach in underserved neighborhoods — screenings, follow-up care, getting people to the treatment they can't get to on their own. I see every day what untreated injuries do to working people."),
  ], "Outreach nurse whose daily work is connecting injured people with care."),
  juror(4, "Carl Deaton", "M", "W", "4/22/1965", "Mechanical Engineer", "Austal Shipyard", [
    r(5, LQ.work, "I'm a mechanical engineer — structures and fatigue analysis. I want the physics to add up. If the forces in this wreck were less than a rough day of yard work, somebody has to explain the surgery to me."),
  ]),
  juror(5, "Alicia Sanders", "F", "B", "11/30/1983", "Medical Records Specialist", "Providence Hospital", [
    r(5, LQ.work, "I pull and code patient charts all day at Providence. Records don't lie; people misremember. I'd want to see what the records actually say."),
  ], "Hospital records specialist; fluent in charts and imaging reports."),
  juror(6, "Patrick Sullivan", "M", "W", "7/12/1975", "High School Teacher", "Baker High School", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
    r(1, LQ.wreck, "Just a parking-lot bump years ago. Nothing came of it."),
  ]),
  juror(7, "Renee Towner", "F", "W", "1/25/1981", "Bank Teller", "Regions Bank", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
  ]),
  juror(8, "Gloria Stevenson", "F", "B", "3/3/1958", "Caseworker", "Alabama Department of Human Resources", [
    r(5, LQ.work, "I've spent thirty years as a caseworker helping families get the support the system owes them. Somebody has to stand up for people who can't work the process themselves."),
  ], "Career DHR caseworker with strong advocacy instincts; as an older Black woman she is statistically more plaintiff-leaning, which compounds the risk."),
  juror(9, "Victor Hames", "M", "W", "10/9/1972", "Quality Inspector", "Airbus Mobile", [
    r(5, LQ.work, "Quality inspection on the final assembly line. Torque specs and inspection records — if it isn't documented, it didn't happen."),
  ]),
  juror(10, "Bobby Bomba", "M", "W", "5/19/1962", "Warehouse Supervisor", "Gulf Distribution", [
    r(3, LQ.backs, "[Hand] Raised hand"),
    r(3, LQ.backs, "I've got degenerative discs myself — my doctor showed me on the MRI, said everybody my age has some of it. Getting old is like that. It doesn't change how I'd look at this case one bit; everybody's back wears out."),
  ]),
  juror(11, "Latasha Bouie", "F", "B", "8/14/1977", "Case Manager", "Riverside Rehabilitation Center", [
    r(5, LQ.work, "I'm a case manager at a rehab facility — I coordinate care plans for injury patients and I'm on the phone fighting insurance companies over coverage every single week."),
  ], "Rehab case manager who advocates against insurers for injury patients weekly."),
  juror(12, "Harold Crumb", "M", "W", "12/1/1959", "Retired Postal Carrier", "Retired", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
    r(1, LQ.wreck, "A deer hit my route truck once. That's the whole story."),
  ]),
  juror(13, "Dwayne Ellis", "M", "B", "4/4/1970", "Diesel Mechanic", "Southern Freightways", [
    r(2, LQ.claims, "[Hand] Raised hand"),
    r(2, LQ.claims, "I sued after a forklift accident at my old job — we settled back in 2015 and it was fair. That's got nothing to do with this case. I can look at this one fresh."),
  ]),
  juror(14, "Sharon Griffin", "F", "W", "2/17/1985", "Restaurant Manager", "Half Shell Oyster House", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
  ]),
  juror(15, "Elena De Diaz", "F", "H", "6/28/1988", "Dental Hygienist", "Azalea Dental Group", [
    r(2, LQ.claims, "[Hand] Raised hand"),
    r(2, LQ.claims, "I have a lawsuit going on right now from a wreck on Airport Boulevard last spring. My lawyer told me not to get into details, but yes — I'm the one suing."),
  ]),
  // Doc ground truth: seated without challenge; "a correct cause model rates
  // Bomba/Ellis/Ladnier/Young 'Unlikely' (peremptory-note only)". The
  // peremptory note comes from the caregiving OCCUPATION alone — with any
  // stated pain-empathy opinion in the record, cause ratings flipped
  // Possible/Unlikely run-to-run (5-series models ignore temperature), and
  // the doc pins her at Unlikely: a stated-opinion-free record matches the
  // real transcript, where nobody moved on her.
  juror(16, "Paige Ladnier", "F", "W", "9/9/1980", "Registered Nurse — ICU", "Springhill Medical Center", [
    r(5, LQ.work, "I'm an ICU nurse at Springhill Medical. Long shifts, but the unit can cover me for a week — I can serve, and I don't have any problem being fair to both sides."),
  ]),
  juror(17, "Frank Weber", "M", "W", "3/8/1955", "Retired Machinist", "Retired", [
    r(4, LQ.fair, "I'll be honest with the court: my daughter was hurt badly by a careless driver two years ago, and I don't believe I could be fair to the defense in a case like this. I'd be leaning the plaintiff's way from the first witness, and that's the truth."),
  ]),
  juror(18, "Gene Prather", "M", "W", "7/7/1968", "Certified Public Accountant", "Prather & Associates", [
    r(5, LQ.work, "I'm a CPA. Numbers first, stories second."),
  ]),
  juror(19, "Michelle Plasse", "F", "W", "10/21/1990", "Graphic Designer", "Coastal Creative", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
  ]),
  juror(20, "Deborah Russell", "F", "B", "1/11/1966", "Home Caregiver", "Self-employed", [
    r(4, LQ.fair, "It's not about the case — I'm the only caregiver for my mother. If I'm here all week there is nobody to feed her or give her medicine. I can't concentrate on testimony worrying about that."),
  ]),
  juror(21, "Stanley Marut", "M", "W", "8/2/1957", "Crane Operator", "Port of Mobile", [
    r(4, LQ.fair, "I've got a heart procedure scheduled Thursday at Providence. Doctor says it can't wait. I'll be out either way."),
  ]),
  juror(22, "Jerome Hill", "M", "B", "11/23/1986", "Line Cook", "Felix's Fish Camp", [
    r(4, LQ.fair, "My job doesn't pay anything for jury duty and I'm already behind on rent. I need to be at work. That's my only issue."),
  ]),
  juror(23, "Beverly Young", "F", "W", "5/5/1973", "Billing Coordinator", "Bayview Orthopedic Clinic", [
    r(2, LQ.claims, "[Hand] Raised hand"),
    r(2, LQ.claims, "I had a little fender-bender claim back in 2009 — insurance paid for the bumper and that was that. No lawyers, no hard feelings."),
    r(5, LQ.work, "I code injury claims at an orthopedic clinic all day. I know what treatment for a real disc injury looks like on paper."),
  ]),
  juror(24, "Douglas Freen", "M", "W", "9/13/1976", "Bartender", "The Haberdasher", [
    r(4, LQ.fair, "People exaggerate everything — fish, golf scores, injuries. But I figure a jury can sort it out."),
  ]),
  juror(25, "Rose Centanni", "F", "W", "12/8/1948", "Retired School Librarian", "Retired", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
  ]),
  juror(26, "Kathleen Orso", "F", "W", "2/2/1958", "Bookkeeper", "Delta Office Services", [
    r(5, LQ.work, "Thirty years of bookkeeping. Receipts or it didn't happen."),
  ]),
  juror(27, "Ray Tibbs", "M", "B", "6/16/1978", "Auto Body Estimator", "Coastal Collision", [
    r(5, LQ.work, "I write collision estimates. I can tell a five-mile-an-hour tap from real damage just from the photos."),
  ]),
  juror(28, "Walt Grimes", "M", "W", "3/29/1960", "Bank Auditor", "Hancock Whitney", [
    r(5, LQ.work, "I audit branch records for a living. I like documentation."),
  ]),
  juror(29, "Omar Vance", "M", "B", "8/8/1984", "Machinist", "Gulf States Tooling", [
    r(1, LQ.wreck, "[Hand] Raised hand"),
  ]),
];

export const LEWIS: TrialFixture = {
  id: "lewis",
  label: "Lewis v. Chad (defense — disputed low-speed impact, defense owns the objective evidence)",
  caseContext: {
    name: "Lewis v. Chad (calibration)",
    areaOfLaw: "Personal Injury — Motor Vehicle",
    summary:
      "Disputed low-speed rear-end collision. Plaintiff claims a lumbar disc injury requiring surgery. " +
      "The defense owns the objective evidence: the vehicle EDR recorded no event, biomechanical analysis " +
      "puts the forces below 1g (less than everyday activities), and plaintiff's pre-incident imaging shows " +
      "the same degenerative findings the surgery addressed. Liability for the light contact is not seriously " +
      "contested; injury causation is the whole case.",
    side: "defense",
    favorableTraits: [
      "records-literate and evidence-driven (adjusters, records staff, auditors, engineers)",
      "comfortable saying no to a sympathetic story when documents contradict it",
      "skeptical of subjective complaints unsupported by imaging",
    ],
    riskTraits: [
      "personal low-speed rear-end injury experience, especially with a grievance about how the claim was handled",
      "active litigants in their own injury suits",
      "advocacy-function occupations (outreach, casework, care coordination)",
      "believes pain is undetectable by scans and doctors dismiss it",
    ],
  },
  jurors: LEWIS_JURORS,
  questions: LEWIS_QUESTIONS,
  courtDismissed: [17, 20, 21, 22],
  yourStrikes: [2, 3, 8, 11, 15, 24],
  theirStrikes: [4, 9, 18, 26, 27, 28, 29],
};

// ---------------------------------------------------------------------------
// WHIGHAM v. MORRIS
// ---------------------------------------------------------------------------

const WQ = {
  wreck: "Have you or anyone in your household ever been involved in a motor vehicle wreck or accident of any kind?",
  claims: "Have you or a close family member ever brought an injury claim, hired a lawyer after an accident, or received a settlement?",
  witnesses: "Do any of you know any of the parties, the attorneys, or anyone on the witness list — including the treating doctors, such as Dr. White-Spunner?",
  damages: "If the evidence supported only the medical bills — $11,542.50 — could you return a verdict for exactly that amount and no more, even though the request is much larger?",
  treatment: "Have you ever treated with a chiropractor or physical therapist for more than a few weeks?",
};

const WHIGHAM_QUESTIONS = [
  { questionNumber: 1, originalText: WQ.wreck, rephrase: null },
  { questionNumber: 2, originalText: WQ.claims, rephrase: null },
  { questionNumber: 3, originalText: WQ.witnesses, rephrase: null },
  { questionNumber: 4, originalText: WQ.damages, rephrase: null },
  { questionNumber: 5, originalText: WQ.treatment, rephrase: null },
];

/** Every Whigham juror raised on the global wreck question — zero valence. */
const wreckRaise = () => r(1, WQ.wreck, "[Hand] Raised hand");

const WHIGHAM_JURORS: CalibrationJuror[] = [
  juror(1, "Todd Ainsworth", "M", "W", "5/3/1974", "Land Surveyor", "Gulf Survey Co.", [wreckRaise()]),
  juror(2, "Brenda Cole", "F", "B", "8/21/1968", "Cashier", "Greer's Market", [wreckRaise()]),
  juror(3, "Marcus Dees", "M", "B", "1/30/1990", "Warehouse Picker", "Dollar General DC", [wreckRaise()]),
  juror(4, "Dana Martin", "F", "W", "4/18/1980", "School Secretary", "Mary B. Austin Elementary", [
    wreckRaise(),
    r(2, WQ.claims, "My husband was rear-ended last spring and his injury claim is still open — there's an attorney handling it for him right now."),
  ]),
  juror(5, "Earl Nelson", "M", "W", "9/2/1951", "Retired Pipefitter", "Retired", [
    wreckRaise(),
    r(4, WQ.damages, "No. Money for pain isn't right. I couldn't sign a verdict awarding pain and suffering no matter what the proof was. Bills are one thing — the rest of it I don't believe in."),
  ]),
  juror(6, "Felicia Odom", "F", "B", "11/11/1986", "Daycare Worker", "Little Blessings Academy", [wreckRaise()]),
  juror(7, "Carla Barefoot", "F", "W", "7/29/1979", "Physical Therapist", "Azalea Physical Therapy (owner)", [
    wreckRaise(),
    r(5, WQ.treatment, "I was rear-ended myself in 2020 — low speed, but I treated for about six months, some of it in my own clinic. I know exactly what that recovery is like from both sides of the table."),
    r(2, WQ.claims, "[Hand] Raised hand"),
    r(3, WQ.witnesses, "[Hand] Raised hand"),
    r(5, WQ.treatment, "Most of my patients are car-wreck referrals from attorneys and chiropractors — that's probably half my caseload in any given month."),
  ]),
  juror(8, "Terrence Brown", "M", "B", "1/15/1987", "Delivery Driver", "AmeriCold Logistics", [
    wreckRaise(),
    r(5, WQ.treatment, "A couple weeks of chiropractor visits after a fender bender in college. Nothing since."),
  ]),
  juror(9, "Vivian Clark", "F", "B", "3/7/1972", "Receptionist", "Delaney Dental", [wreckRaise()]),
  juror(10, "Stuart Hendrix", "M", "W", "10/2/1965", "Roofer", "Bay Area Roofing", [wreckRaise()]),
  juror(11, "Gary Fussnecker", "M", "W", "10/3/1970", "Plant Operations Supervisor", "Evonik Chemical", [
    wreckRaise(),
    r(4, WQ.damages, "I supervise about forty operators, and half my job is sorting out who's giving me facts and who's covering themselves. I'd make both sides show their work, and if the number the evidence supports is the bills, that's the verdict I'd sign."),
  ]),
  juror(12, "Curtis Herman", "M", "W", "6/14/1961", "Truck Driver", "Southeast Freight Lines", [wreckRaise()]),
  juror(13, "Ana Martinez-Del Campo", "F", "H", "3/22/1992", "Pharmacy Technician", "CVS Pharmacy", [
    wreckRaise(),
    r(1, WQ.wreck, "My cousin had a wreck a few years ago. It wasn't a big deal, nobody got hurt."),
  ]),
  juror(14, "Roy Gandy", "M", "W", "12/19/1955", "Retired Meter Reader", "Retired", [wreckRaise()]),
  // The court's lock-in follow-up is part of the record: a stated damages
  // opinion alone flipped Unlikely/Highly-Likely across calibration runs
  // (5-series ignores temperature), but a refusal she re-affirms AFTER the
  // court asks the "even if the evidence supported it" question is the
  // canonical granted-for-cause record — exactly the lock-in-before-
  // rehabilitation workflow the training doc teaches.
  juror(15, "Ruth Welborn", "F", "W", "6/6/1954", "Retired Bank Teller", "Retired", [
    wreckRaise(),
    r(4, WQ.damages, "I'll say it plain: I don't believe in paying people for pain and suffering. I could not award it, period. If that disqualifies me, so be it."),
    r(4, "THE COURT (follow-up): If the law allowed such damages and the evidence supported them, could you set your personal belief aside and consider them?", "No, Your Honor. Even then. I couldn't put money for pain on a verdict form — my hand wouldn't sign it."),
  ]),
  juror(16, "Keisha Lott", "F", "B", "2/26/1989", "Hair Stylist", "Studio B Salon", [wreckRaise()]),
  juror(17, "Doyle Brannan", "M", "W", "9/9/1958", "Welder", "Mobile Pipe & Fab", [wreckRaise()]),
  juror(18, "Peggy Chastang", "F", "W", "7/23/1963", "Florist", "Belle Bouquet", [wreckRaise()]),
  juror(19, "Alton Greene", "M", "B", "4/12/1983", "Custodian", "Mobile County Schools", [wreckRaise()]),
  juror(20, "Cedric Monroe", "M", "B", "12/12/1975", "Barber", "Fade Masters", [
    wreckRaise(),
    r(3, WQ.witnesses, "I've known the defendant's family my whole life — his mama and mine have been best friends since grade school. I'd rather not sit on this one, honestly."),
  ]),
  juror(21, "Joyce Smith", "F", "B", "2/28/1969", "Housekeeping Supervisor", "Renaissance Riverview Hotel", [
    wreckRaise(),
    r(4, WQ.damages, "It's not the case — we're short-staffed and I'm scheduled for doubles all week. My manager already told me there's nobody to cover my floor."),
  ]),
  juror(22, "Paul Whitney", "M", "W", "5/11/1958", "Retired Insurance Claims Auditor", "Retired", [
    wreckRaise(),
    r(4, WQ.damages, "If the proof ties every bill to this wreck, I'd award the bills — to the penny. Beyond that, people recover from low-speed fender benders every day. I'd need an awful lot of convincing before I paid for pain on top of the bills."),
  ]),
  juror(23, "Sandra Ott", "F", "W", "8/17/1977", "Bank Branch Assistant", "PNC Bank", [wreckRaise()]),
  juror(24, "Leon Pugh", "M", "B", "10/28/1981", "Dock Worker", "APM Terminals", [wreckRaise()]),
  juror(25, "Martha Croley", "F", "W", "8/19/1949", "Retired Seamstress", "Retired", [
    wreckRaise(),
    r(4, WQ.damages, "My husband has dementia and I am his only care at home. I cannot be away from him all week — my neighbor can only sit with him a day or two."),
  ]),
  juror(26, "Derrick Slay", "M", "B", "5/25/1985", "IT Support Technician", "Springhill College", [wreckRaise()]),
  juror(27, "Gwen Talbot", "F", "W", "3/16/1971", "Waitress", "Dew Drop Inn", [wreckRaise()]),
  juror(28, "Hollis Vaughn", "M", "W", "11/5/1966", "Landscaper", "GreenScape Gulf", [wreckRaise()]),
  juror(29, "Raymond Bull", "M", "W", "1/19/1969", "Forklift Operator", "SSAB Steel", [wreckRaise()]),
  juror(30, "Cheryl Nix", "F", "W", "6/30/1984", "Office Clerk", "Thompson Engineering", [wreckRaise()]),
  juror(31, "Andre Petway", "M", "B", "9/14/1993", "Line Worker", "Hargrove Foods", [wreckRaise()]),
  juror(32, "Henry McGill", "M", "W", "11/2/1963", "Hardware Store Owner", "McGill Ace Hardware", [
    wreckRaise(),
    r(3, WQ.witnesses, "Dr. White-Spunner operated on my shoulder about four years ago. Fine result, good man. I think I could be fair to both sides.", [
      { question: "You're confident that wouldn't affect how you weigh his testimony?", answer: "I believe so. He did right by me, but I'd listen to all the evidence." },
    ]),
  ]),
  juror(33, "Lisa Gueho", "F", "W", "7/15/1985", "Marketing Coordinator", "Coastal Alabama Tourism", [
    wreckRaise(),
    r(1, WQ.wreck, "Just a minor one in college. Insurance handled it, no injuries."),
  ]),
  juror(34, "Karen Jensen", "F", "W", "4/9/1976", "Certified Registered Nurse Practitioner", "Bayside Family Clinic", [
    wreckRaise(),
    r(2, WQ.claims, "I had my own injury claim after a wreck in 2017 — it settled before a suit was ever filed. The process was fair to me, but I learned firsthand what months of pain do to your work and your family."),
    r(5, WQ.treatment, "Half the patients in my clinic carry pain that never shows up on an MRI. I take them at their word until something proves otherwise — that's just good medicine."),
  ]),
  juror(35, "Diane Roberts", "F", "B", "9/26/1982", "Office Manager", "Delta Supply Co.", [
    wreckRaise(),
    r(5, WQ.treatment, "I did about two months of chiropractic after a wreck in 2021. And my husband is an ER nurse at University Hospital, so I hear about crash injuries at the dinner table every night."),
  ]),
  juror(36, "Walter Sims", "M", "W", "2/14/1957", "Retired Salesman", "Retired", [wreckRaise()]),
];

export const WHIGHAM: TrialFixture = {
  id: "whigham",
  label: "Whigham v. Morris (defense — conceded liability, $11,542.50 specials vs $2.2M ask)",
  caseContext: {
    name: "Whigham v. Morris (calibration)",
    areaOfLaw: "Personal Injury — Motor Vehicle",
    summary:
      "Conceded-liability rear-end collision — the defendant admits fault, so the trial is damages only. " +
      "Plaintiff's medical specials are $11,542.50 (primarily chiropractic care) and the demand is $2.2 million " +
      "for claimed permanent pain. The defense contests causation of the ongoing complaints and the extent of " +
      "damages. Treating and expert physicians, including Dr. White-Spunner, are on the witness list.",
    side: "defense",
    favorableTraits: [
      "bills-only damages posture (would award proven specials and resist large general damages)",
      "evidence-driven, wants every bill tied to the wreck",
      "skeptical of pain claims that outrun the objective findings",
    ],
    riskTraits: [
      "clinical or therapy occupations, or a clinical household",
      "own or family injury-claim history",
      "chronic-pain experience or strong belief that scans miss real pain",
      "connections to the treating or testifying doctors",
    ],
  },
  jurors: WHIGHAM_JURORS,
  questions: WHIGHAM_QUESTIONS,
  courtDismissed: [5, 15, 20, 21, 22, 25],
  yourStrikes: [],
  theirStrikes: [],
};
