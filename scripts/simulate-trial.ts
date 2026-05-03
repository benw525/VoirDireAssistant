/**
 * Trial-readiness simulation harness.
 *
 * Exercises every AI agent end-to-end against a synthetic 36-juror panel:
 *   1. Gemini 3.1 Pro    — strike-list parsing
 *   2. Claude Opus 4.7   — brief summary (per juror)
 *   3. Claude Opus 4.7   — full juror analysis JSON (per juror)
 *   4. Claude Opus 4.7   — strike-for-cause panel analysis
 *   5. Claude Opus 4.7   — Batson analysis
 *   6. Claude Opus 4.7   — full voir dire generation
 *   7. Claude Opus 4.7   — refine attorney's draft questions
 *   8. Claude Sonnet 4.6 — live follow-up suggestions
 *
 * Usage: npx tsx scripts/simulate-trial.ts
 */

import { generateBriefSummary, analyzeJuror, analyzeStrikesForCause, analyzeBatson } from "../server/analyzeJuror";
import { generateFullVoirDire, refineUserQuestions } from "../server/generateVoirDire";
import { parseStrikeListWithAI } from "../server/parseStrikeList";
import { claudeJson, CLAUDE_SONNET } from "../server/anthropic";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

import * as fsSync from "fs";
const SINK = process.env.SIM_SINK;
const sink = (line: string) => { if (SINK) try { fsSync.appendFileSync(SINK, line + "\n"); } catch {} };

interface CheckResult { name: string; ok: boolean; ms: number; details: string; sample?: string }
const results: CheckResult[] = [];

function ok(name: string, ms: number, details: string, sample?: string) {
  results.push({ name, ok: true, ms, details, sample });
  console.log(`${GREEN}✓${RESET} ${BOLD}${name}${RESET} ${DIM}(${ms}ms)${RESET} — ${details}`);
  if (sample) console.log(`  ${DIM}sample:${RESET} ${sample}`);
  sink(`OK\t${ms}\t${name}\t${details}${sample ? "\t" + sample.replace(/\s+/g," ").slice(0,200) : ""}`);
}
function fail(name: string, ms: number, details: string) {
  results.push({ name, ok: false, ms, details });
  console.log(`${RED}✗${RESET} ${BOLD}${name}${RESET} ${DIM}(${ms}ms)${RESET} — ${RED}${details}${RESET}`);
  sink(`FAIL\t${ms}\t${name}\t${details.replace(/\s+/g," ").slice(0,400)}`);
}
function section(title: string) {
  console.log(`\n${CYAN}${BOLD}━━━ ${title} ━━━${RESET}\n`);
  sink(`SECTION\t${title}`);
}

const caseInfo = {
  name: "Rivera v. Apex Logistics",
  areaOfLaw: "Employment Discrimination",
  summary:
    "Plaintiff Maria Rivera, a Latina warehouse supervisor, alleges she was passed over for promotion three times and ultimately terminated in retaliation for raising concerns about racially disparate discipline. Defendant Apex Logistics denies discrimination, claiming Rivera was let go for documented performance issues. Damages sought: lost wages, emotional distress, punitive damages.",
  side: "plaintiff",
  favorableTraits: [
    "Personal experience with workplace discrimination or retaliation",
    "Skepticism toward large corporate employers",
    "Belief that HR processes can be manipulated",
    "Empathy for working-class women of color",
  ],
  riskTraits: [
    "Management or HR background",
    "Belief that lawsuits are frivolous or excessive",
    "Loyalty to corporate employers",
    "Distrust of disparate-impact statistical evidence",
  ],
};

const FIRST = ["James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Barbara","William","Susan","Richard","Jessica","Joseph","Sarah","Thomas","Karen","Charles","Nancy","Christopher","Lisa","Daniel","Margaret","Matthew","Betty","Anthony","Sandra","Mark","Ashley","Donald","Kimberly","Steven","Emily","Paul","Donna"];
const LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott"];
const OCC = [
  ["Registered Nurse","Mercy General Hospital"],
  ["Warehouse Manager","Walmart Distribution"],
  ["Elementary Teacher","Lincoln Elementary"],
  ["HR Director","FirstBank Corp"],
  ["Software Engineer","TechCorp"],
  ["Retired"," — "],
  ["Construction Foreman","Bay Area Builders"],
  ["Small Business Owner","Owner-operated"],
  ["Police Officer","Oakland PD"],
  ["Accountant","Self-employed"],
  ["Stay-at-home Parent"," — "],
  ["Restaurant Server","Olive Garden"],
  ["Real Estate Agent","Coldwell Banker"],
  ["Truck Driver","Amazon Freight"],
  ["Pharmacist","CVS Health"],
  ["Marketing Manager","Salesforce"],
  ["Plumber","Self-employed"],
  ["Social Worker","County Services"],
  ["Insurance Adjuster","State Farm"],
  ["Graduate Student","UC Berkeley"],
  ["Auto Mechanic","Jiffy Lube"],
  ["Bank Teller","Wells Fargo"],
  ["Paralegal","Morrison & Foerster LLP"],
  ["Retail Manager","Target"],
  ["Electrician","IBEW Local 595"],
  ["High School Counselor","Berkeley High"],
  ["Hair Stylist","Self-employed"],
  ["Civil Engineer","Caltrans"],
  ["Bus Driver","AC Transit"],
  ["Retired Military","US Army"],
  ["Daycare Worker","KinderCare"],
  ["Property Manager","Greystar"],
  ["Hospital Administrator","Kaiser Permanente"],
  ["Freelance Photographer","Self-employed"],
  ["Security Guard","Allied Universal"],
  ["Pastor","First Baptist Church"],
];
const RACES = ["White","Black","Hispanic","Asian","White","Black","Hispanic","Asian","White","Mixed"];
const SEXES = ["F","M"];

function makePanel(n = 36) {
  return Array.from({ length: n }, (_, i) => {
    const num = i + 1;
    const [occupation, employer] = OCC[i % OCC.length];
    const yearOffset = 22 + ((i * 7) % 50);
    const year = 2026 - yearOffset;
    return {
      number: num,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
      sex: SEXES[i % 2],
      race: RACES[i % RACES.length],
      birthDate: `${String((i % 12) + 1).padStart(2, "0")}/${String(((i * 11) % 28) + 1).padStart(2, "0")}/${year}`,
      occupation,
      employer,
      lean: ["unknown", "favorable", "neutral", "unfavorable"][i % 4],
      riskTier: ["low", "medium", "high"][i % 3],
      notes: i % 5 === 0 ? "Soft-spoken, made eye contact during opening" : "",
    };
  });
}

function makeResponses(jurorNumber: number) {
  const all: Array<{ jurorNumber: number; questionText: string | null; questionSummary: string | null; responseText: string; side: string; followUps: any[] }> = [];
  const seed = jurorNumber * 17;
  if (seed % 5 !== 4) {
    all.push({
      jurorNumber, side: "your", questionText: "Have you or anyone close to you ever felt treated unfairly at work because of who you are?",
      questionSummary: null,
      responseText: jurorNumber % 3 === 0 ? "Yes, my sister was passed over for a promotion she clearly earned, it was hard to watch." : jurorNumber % 3 === 1 ? "I don't think so, no." : "Maybe once, but I let it go.",
      followUps: [],
    });
  }
  if (seed % 7 < 5) {
    all.push({
      jurorNumber, side: "opposing", questionText: null,
      questionSummary: "Could you set aside sympathy and decide based only on the evidence?",
      responseText: jurorNumber % 4 === 0 ? "I would try, but I can't promise I'd be perfect about it." : "Yes, I can absolutely follow the law.",
      followUps: [],
    });
  }
  if (jurorNumber % 6 === 0) {
    all.push({
      jurorNumber, side: "your", questionText: "Do you believe HR processes are usually fair?",
      questionSummary: null,
      responseText: "Honestly? Not always. I've seen HR protect the company more than the employee.",
      followUps: [{ question: "Has that shaped how you'd view a discrimination case?", answer: "It makes me skeptical of the company's version, yeah." }],
    });
  }
  if (jurorNumber % 8 === 0) {
    all.push({
      jurorNumber, side: "court", questionText: null,
      questionSummary: "Any reason you cannot serve as a juror?",
      responseText: "[Raised Hand] — work conflict",
      followUps: [],
    });
  }
  return all;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t };
}

const panel = makePanel(36);
const enrichmentMap: Record<string, Record<string, any>> = {};

async function checkStrikeListParse() {
  const text = panel
    .slice(0, 12)
    .map(j => `${j.number}. ${j.name}, ${j.sex}, ${j.race}, DOB ${j.birthDate}, ${j.occupation} at ${j.employer}`)
    .join("\n");
  try {
    const { value, ms } = await timed(() => parseStrikeListWithAI(text));
    if (!Array.isArray(value) || value.length < 8) {
      fail("1. Gemini 3.1 Pro — strike-list parse", ms, `Expected ≥8 jurors, got ${Array.isArray(value) ? value.length : "non-array"}`);
      return;
    }
    const j0 = value[0];
    ok("1. Gemini 3.1 Pro — strike-list parse", ms, `${value.length} jurors parsed`, `#${(j0 as any).number} ${(j0 as any).name} — ${(j0 as any).occupation}`);
  } catch (err: any) {
    fail("1. Gemini 3.1 Pro — strike-list parse", 0, err?.message || String(err));
  }
}

async function checkBriefSummary() {
  const j = panel[0];
  try {
    const { value, ms } = await timed(() => generateBriefSummary(caseInfo, j, makeResponses(j.number)));
    if (typeof value !== "string" || value.length < 20) {
      fail("2. Opus 4.7 — brief summary", ms, `Output too short or wrong type: "${value}"`);
      return;
    }
    ok("2. Opus 4.7 — brief summary", ms, `${value.length} chars`, value.slice(0, 140) + (value.length > 140 ? "…" : ""));
  } catch (err: any) {
    fail("2. Opus 4.7 — brief summary", 0, err?.message || String(err));
  }
}

async function checkAnalyzeJuror() {
  const j = panel[5];
  try {
    const { value, ms } = await timed(() => analyzeJuror(caseInfo, j, makeResponses(j.number)));
    const okShape = typeof value.riskScore === "number" && value.riskScore >= 1 && value.riskScore <= 100
      && ["low","medium","high"].includes(value.aiRiskTier)
      && ["favorable","neutral","unfavorable","unknown"].includes(value.suggestedLean)
      && ["high","moderate","low"].includes(value.leanConfidence)
      && typeof value.analysis === "string" && value.analysis.length > 30;
    if (!okShape) {
      fail("3. Opus 4.7 — analyzeJuror JSON", ms, `Bad shape: ${JSON.stringify(value).slice(0, 200)}`);
      return;
    }
    ok("3. Opus 4.7 — analyzeJuror JSON", ms,
       `risk=${value.riskScore} tier=${value.aiRiskTier} lean=${value.suggestedLean} conf=${value.leanConfidence}`,
       value.analysis.slice(0, 140) + "…");
  } catch (err: any) {
    fail("3. Opus 4.7 — analyzeJuror JSON", 0, err?.message || String(err));
  }
}

async function checkStrikeForCause() {
  const jurorsForStrikes = panel.slice(0, 12).map(j => ({ ...j, responses: makeResponses(j.number) }));
  try {
    const { value, ms } = await timed(() => analyzeStrikesForCause(caseInfo, jurorsForStrikes));
    if (!Array.isArray(value) || value.length === 0) {
      fail("4. Opus 4.7 — strike-for-cause", ms, "No strikes returned");
      return;
    }
    const cats = value.reduce<Record<string, number>>((m, s) => { m[s.category] = (m[s.category] ?? 0) + 1; return m; }, {});
    const sample = value.find(v => v.category === "Highly Likely") ?? value[0];
    ok("4. Opus 4.7 — strike-for-cause", ms,
       `${value.length} entries (${Object.entries(cats).map(([k,v]) => `${k}:${v}`).join(", ")})`,
       `#${sample.jurorNumber} [${sample.category}] ${sample.reasoning.slice(0,100)}…`);
  } catch (err: any) {
    fail("4. Opus 4.7 — strike-for-cause", 0, err?.message || String(err));
  }
}

async function checkBatson() {
  const yourStrikes = [4, 12, 20, 28];
  const theirStrikes = [3, 11, 19, 27];
  const jurorsWithSummaries = panel.slice(0, 30).map(j => ({ ...j, aiSummary: `Sample summary for juror #${j.number}.` }));
  try {
    const { value, ms } = await timed(() => analyzeBatson(caseInfo, jurorsWithSummaries, yourStrikes, theirStrikes));
    const okShape = ["Low","Moderate","High"].includes(value.overallRisk)
      && typeof value.summary === "string"
      && Array.isArray(value.defensive) && Array.isArray(value.offensive);
    if (!okShape) {
      fail("5. Opus 4.7 — Batson analysis", ms, `Bad shape: ${JSON.stringify(value).slice(0,200)}`);
      return;
    }
    ok("5. Opus 4.7 — Batson analysis", ms,
       `risk=${value.overallRisk}, ${value.defensive.length} defensive / ${value.offensive.length} offensive`,
       value.summary.slice(0,140) + (value.summary.length > 140 ? "…" : ""));
  } catch (err: any) {
    fail("5. Opus 4.7 — Batson analysis", 0, err?.message || String(err));
  }
}

async function checkVoirDire() {
  try {
    const { value, ms } = await timed(() => generateFullVoirDire(caseInfo, panel, enrichmentMap));
    const okShape = typeof value.opening === "string" && value.opening.length > 50
      && Array.isArray(value.questions) && value.questions.length >= 5
      && Array.isArray(value.strikeGuide);
    if (!okShape) {
      fail("6. Opus 4.7 — voir dire generation", ms, `Bad shape: opening=${value.opening?.length} qs=${value.questions?.length}`);
      return;
    }
    ok("6. Opus 4.7 — voir dire generation", ms,
       `${value.questions.length} questions, ${value.jurorFollowUps.length} juror follow-ups, ${value.causeFlags.length} cause flags, ${value.strikeGuide.length} strike guide entries`,
       `Q1: "${value.questions[0]?.rephrase?.slice(0,120) || value.questions[0]?.originalText?.slice(0,120)}…"`);
  } catch (err: any) {
    fail("6. Opus 4.7 — voir dire generation", 0, err?.message || String(err));
  }
}

async function checkRefine() {
  const draft = `1. Have you ever sued anyone before?
2. Do you think most discrimination lawsuits are made up?
3. Can you be fair to my client even though she is suing a big company?
4. What do you think about HR departments?`;
  try {
    const { value, ms } = await timed(() => refineUserQuestions(draft, caseInfo, panel.slice(0, 10), enrichmentMap));
    if (!Array.isArray(value) || value.length < 3) {
      fail("7. Opus 4.7 — refine draft questions", ms, `Expected ≥3 refined questions, got ${value?.length}`);
      return;
    }
    ok("7. Opus 4.7 — refine draft questions", ms,
       `${value.length} refined`,
       `"${value[0].rephrase.slice(0,140)}…"`);
  } catch (err: any) {
    fail("7. Opus 4.7 — refine draft questions", 0, err?.message || String(err));
  }
}

async function checkFollowUps() {
  // Inline copy of generateFollowUpSuggestionsViaClaude (server/routes.ts) — keeps the harness self-contained.
  const j = panel[0];
  const questionText = "Have you or anyone close to you ever felt treated unfairly at work because of who you are?";
  const responseText = "Yes, my sister was passed over for a promotion she clearly earned, it was hard to watch.";
  try {
    const t = Date.now();
    const system = `You are a trial attorney assistant. Based on a juror's response during voir dire, suggest 2-3 brief follow-up questions that would help assess this juror further. The case is a ${caseInfo.areaOfLaw} case where you represent the ${caseInfo.side}. Keep each question to one sentence. Return ONLY a JSON array of strings, no other text.`;
    const userPrompt = `Juror #${j.number} (${j.name}) was asked: "${questionText}"\n\nTheir response: "${responseText}"\n\nSuggest 2-3 targeted follow-up questions.`;
    type FollowUpJson = string[] | { questions?: unknown; followUps?: unknown; suggestions?: unknown };
    const { parsed } = await claudeJson<FollowUpJson>({ model: CLAUDE_SONNET, system, userPrompt, temperature: 0.6, maxTokens: 600 });
    const ms = Date.now() - t;
    const onlyStrings = (xs: unknown): string[] => Array.isArray(xs) ? xs.filter((s): s is string => typeof s === "string") : [];
    const list = Array.isArray(parsed) ? onlyStrings(parsed)
      : (parsed && typeof parsed === "object") ? onlyStrings((parsed as any).questions ?? (parsed as any).followUps ?? (parsed as any).suggestions ?? [])
      : [];
    if (list.length < 2) {
      fail("8. Sonnet 4.6 — live follow-up suggestions", ms, `Expected ≥2 suggestions, got ${list.length}`);
      return;
    }
    ok("8. Sonnet 4.6 — live follow-up suggestions", ms,
       `${list.length} suggestions`,
       `"${list[0].slice(0,140)}…"`);
  } catch (err: any) {
    fail("8. Sonnet 4.6 — live follow-up suggestions", 0, err?.message || String(err));
  }
}

process.on("unhandledRejection", (reason) => {
  console.error(`\n${"\x1b[31m"}UNHANDLED REJECTION:${"\x1b[0m"}`, reason);
  process.exit(3);
});
process.on("uncaughtException", (err) => {
  console.error(`\n${"\x1b[31m"}UNCAUGHT EXCEPTION:${"\x1b[0m"}`, err);
  process.exit(4);
});
process.on("exit", (code) => {
  console.error(`[harness exit code=${code}]`);
});

async function main() {
  console.log(`${BOLD}${CYAN}Trial-Readiness Simulation${RESET}`);
  console.log(`${DIM}Case:${RESET} ${caseInfo.name} (${caseInfo.areaOfLaw}, representing ${caseInfo.side})`);
  console.log(`${DIM}Panel:${RESET} ${panel.length} jurors`);

  const onlyArg = process.argv.find(a => a.startsWith("--phase="));
  const onlyPhase = onlyArg ? Number(onlyArg.split("=")[1]) : 0;
  const runPhase = (n: number) => onlyPhase === 0 || onlyPhase === n;

  if (runPhase(1)) {
    section("Phase 1 — quick checks (run in parallel)");
    await Promise.all([
      checkStrikeListParse(),
      checkBriefSummary(),
      checkFollowUps(),
    ]);
  }

  if (runPhase(2)) {
    section("Phase 2 — per-juror analysis");
    await checkAnalyzeJuror();
  }

  if (runPhase(3)) {
    section("Phase 3 — full panel analyses (run in parallel)");
    await Promise.all([
      checkStrikeForCause(),
      checkBatson(),
    ]);
  }

  const skipVoirDire = process.argv.includes("--skip-voirdire");
  const skipRefine = process.argv.includes("--skip-refine");
  if (runPhase(4)) {
    section("Phase 4 — voir dire authoring (run in parallel)");
    const tasks: Promise<any>[] = [];
    if (!skipVoirDire) tasks.push(checkVoirDire());
    if (!skipRefine) tasks.push(checkRefine());
    await Promise.all(tasks);
  }

  section("Final report");
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const totalMs = results.reduce((s, r) => s + r.ms, 0);
  console.log(`${BOLD}${passed}/${results.length} agents passed${RESET}  ${DIM}(total wall time across checks: ${(totalMs/1000).toFixed(1)}s)${RESET}`);
  if (failed > 0) {
    console.log(`\n${RED}${BOLD}FAILURES:${RESET}`);
    for (const r of results.filter(r => !r.ok)) console.log(`  ${RED}✗${RESET} ${r.name} — ${r.details}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}All AI agents are operational and trial-ready.${RESET}`);
  }
}

main().catch(err => {
  console.error(`${RED}${BOLD}Harness crashed:${RESET}`, err);
  process.exit(2);
});
