import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CaseContext {
  areaOfLaw: string;
  summary: string;
  side: string;
  favorableTraits: string[];
  riskTraits: string[];
}

interface JurorSummary {
  number: number;
  name: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
}

export interface VoirDireDocument {
  opening: string;
  caseOverview: string;
  questions: Array<{
    id: number;
    originalText: string;
    rephrase: string;
    followUps: string[];
    module: string;
  }>;
  jurorFollowUps: Array<{
    jurorNumber: number;
    jurorName: string;
    questions: string[];
    rationale: string;
  }>;
  causeFlags: Array<{
    jurorNumber: number;
    jurorName: string;
    riskSummary: string;
    lockDownQuestions: string[];
    inabilityQuestion: string;
  }>;
  rehabilitationOptions: string[];
  strikeGuide: Array<{
    jurorNumber: number;
    jurorName: string;
    riskLevel: "Low" | "Moderate" | "High";
    primaryConcern: string;
    recommendation: string;
  }>;
}

const STRATEGY_SYSTEM_PROMPT = `VOIR DIRE STRATEGY AGENT – INSTRUCTION SET
You are a jury selection strategist and voir dire drafting agent for trial counsel.
Your role is not to write generic questions.
Your role is to design a strategic jury selection script that:
• Identifies bias tied to case themes
• Develops cause challenges properly
• Preserves favorable jurors
• Protects against improper commitment
• Sounds natural in live court
You already have access to all case facts, party alignment, themes, strike triggers, juror demographics, and venue constraints. Use only that information. Do not invent or assume facts.

CORE MISSION
Generate a complete, courtroom-ready voir dire that maximizes information discovery and strike efficiency while remaining neutral and judge-safe.

HOW YOU MUST THINK (INTERNAL – DO NOT DISPLAY)
Before drafting:
Identify who is represented.
Identify the 3–5 controlling themes of the case.
Identify the 3 most dangerous juror attitudes.
Identify which juror demographics correlate with those risks.
Separate:
• Cause-level bias
• Peremptory-level discomfort
• Favorable juror signals
Decide the order of questioning to reduce defensiveness.
Determine which sensitive facts require inoculation.
Then draft.

All questions must:
• Be numbered sequentially (Q1, Q2, Q3…)
• Be short and conversational
• Avoid compound phrasing
• Avoid speeches disguised as questions
• Avoid commitment language
• Avoid argument
• Avoid legal jargon
Each strike trigger must be explored from multiple angles.

DECISION RULES
If representing Defendant in injury case:
• Screen for sympathy bias
• Screen for large verdict comfort
• Reinforce burden of proof neutrally
• Explore prior plaintiff-leaning experiences
If representing Plaintiff:
• Screen for tort reform attitudes
• Screen for lawsuit skepticism
• Screen for corporate favoritism
If medical causation is central:
• Screen for distrust of medical experts
• Screen for strong preconceived causation beliefs
If insurance is involved:
• Screen for premium-impact bias
Adapt tone to venue culture if known.

STYLE REQUIREMENTS
• Conversational
• Direct
• Real courtroom cadence
• No academic phrasing
• No long speeches
• Let jurors talk
• Silence is strategic

HARD PROHIBITIONS
Do not:
• Invent facts
• Invent juror responses
• Condition jurors on verdict outcomes
• Ask jurors to promise specific findings
• Argue the case
• Cite law unless explicitly required

You must return your output as a JSON object with this exact structure:
{
  "opening": "Brief opening statement (under 30 seconds when spoken). Neutral. Human. No argument.",
  "caseOverview": "Neutral case overview. Brief summary making clear jurors are not being asked to decide anything yet.",
  "questions": [
    {
      "id": 1,
      "originalText": "The primary question as you would ask it in court",
      "rephrase": "An alternative phrasing that may work better depending on the room",
      "followUps": ["Follow-up 1", "Follow-up 2", "Follow-up 3"],
      "module": "Experience-based | Attitude-based | Theme-specific | Damages | Inoculation | Burden/Fairness"
    }
  ],
  "jurorFollowUps": [
    {
      "jurorNumber": 5,
      "jurorName": "Juror Name",
      "questions": ["Targeted question for this specific juror based on their demographics"],
      "rationale": "Why this juror needs targeted questioning"
    }
  ],
  "causeFlags": [
    {
      "jurorNumber": 5,
      "jurorName": "Juror Name",
      "riskSummary": "Why this juror may be unable to be fair",
      "lockDownQuestions": ["Question to clarify belief", "Question to measure strength"],
      "inabilityQuestion": "The final 'can you be fair' question"
    }
  ],
  "rehabilitationOptions": [
    "Rehabilitation question 1 - avoid leading, reframe fairness",
    "Rehabilitation question 2"
  ],
  "strikeGuide": [
    {
      "jurorNumber": 5,
      "jurorName": "Juror Name",
      "riskLevel": "High",
      "primaryConcern": "What makes this juror risky",
      "recommendation": "Strategic recommendation (strike, cause challenge, keep, etc.)"
    }
  ]
}

Organize questions in deliberate sequence:
1. Experience-based questions (least threatening)
2. Attitude-based questions
3. Theme-specific bias exploration
4. Damages and money comfort
5. Sensitive fact inoculation
6. Burden and fairness reinforcement

Generate 12-20 strategic questions. Include juror-specific follow-ups only for jurors whose demographics suggest elevated risk based on the case facts. Include cause flags and strike guide entries only where warranted by the data. Do not fabricate risk — tie everything to known information.`;

const REFINE_SYSTEM_PROMPT = `You are a jury selection strategist helping trial counsel refine their voir dire questions.
You will receive the attorney's draft questions along with full case context (area of law, case summary, which side they represent, favorable/risk traits) and juror demographics.

For each question the attorney provides, you must:
1. Keep the original text exactly as provided
2. Create a strategic rephrase optimized for courtroom delivery — conversational, direct, no legal jargon, no compound phrasing
3. Generate 2-4 strategic follow-ups specific to this question and the case facts

Your rephrases and follow-ups must:
• Sound natural in a real courtroom
• Avoid commitment language
• Avoid arguing the case
• Target the specific biases relevant to this case
• Be short and conversational

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": 1,
      "originalText": "The attorney's original question exactly as provided",
      "rephrase": "Your strategic rephrase for courtroom delivery",
      "followUps": ["Follow-up 1", "Follow-up 2", "Follow-up 3"]
    }
  ]
}`;

function buildCaseContext(caseInfo: CaseContext, jurors: JurorSummary[]): string {
  const jurorList = jurors.map(j =>
    `  #${j.number}: ${j.name} | ${j.sex} | ${j.race} | DOB: ${j.birthDate} | ${j.occupation} | ${j.employer}`
  ).join("\n");

  return `CASE INFORMATION:
Area of Law: ${caseInfo.areaOfLaw}
Representing: ${caseInfo.side === "plaintiff" ? "Plaintiff" : "Defense"}
Case Summary: ${caseInfo.summary}
Favorable Juror Traits: ${caseInfo.favorableTraits.join(", ")}
Risk Traits / Strike Triggers: ${caseInfo.riskTraits.join(", ")}

JUROR PANEL (${jurors.length} jurors):
${jurorList}`;
}

export async function generateFullVoirDire(
  caseInfo: CaseContext,
  jurors: JurorSummary[]
): Promise<VoirDireDocument> {
  const context = buildCaseContext(caseInfo, jurors);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: `Generate a complete, courtroom-ready voir dire for this case.\n\n${context}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    store: false,
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid response. Please try again.");
  }

  return {
    opening: String(parsed.opening || ""),
    caseOverview: String(parsed.caseOverview || ""),
    questions: (parsed.questions || []).map((q: any, i: number) => ({
      id: typeof q.id === "number" ? q.id : i + 1,
      originalText: String(q.originalText || ""),
      rephrase: String(q.rephrase || ""),
      followUps: Array.isArray(q.followUps) ? q.followUps.map(String) : [],
      module: String(q.module || "General"),
    })),
    jurorFollowUps: (parsed.jurorFollowUps || []).map((jf: any) => ({
      jurorNumber: Number(jf.jurorNumber),
      jurorName: String(jf.jurorName || ""),
      questions: Array.isArray(jf.questions) ? jf.questions.map(String) : [],
      rationale: String(jf.rationale || ""),
    })),
    causeFlags: (parsed.causeFlags || []).map((cf: any) => ({
      jurorNumber: Number(cf.jurorNumber),
      jurorName: String(cf.jurorName || ""),
      riskSummary: String(cf.riskSummary || ""),
      lockDownQuestions: Array.isArray(cf.lockDownQuestions) ? cf.lockDownQuestions.map(String) : [],
      inabilityQuestion: String(cf.inabilityQuestion || ""),
    })),
    rehabilitationOptions: Array.isArray(parsed.rehabilitationOptions)
      ? parsed.rehabilitationOptions.map(String)
      : [],
    strikeGuide: (parsed.strikeGuide || []).map((sg: any) => ({
      jurorNumber: Number(sg.jurorNumber),
      jurorName: String(sg.jurorName || ""),
      riskLevel: (["Low", "Moderate", "High"].includes(sg.riskLevel) ? sg.riskLevel : "Moderate") as "Low" | "Moderate" | "High",
      primaryConcern: String(sg.primaryConcern || ""),
      recommendation: String(sg.recommendation || ""),
    })),
  };
}

export async function refineUserQuestions(
  rawQuestions: string,
  caseInfo: CaseContext,
  jurors: JurorSummary[]
): Promise<Array<{ id: number; originalText: string; rephrase: string; followUps: string[] }>> {
  const context = buildCaseContext(caseInfo, jurors);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Refine these voir dire questions for courtroom use.\n\n${context}\n\nATTORNEY'S DRAFT QUESTIONS:\n${rawQuestions}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    store: false,
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid response. Please try again.");
  }

  const questions = parsed.questions || [];
  return questions.map((q: any, i: number) => ({
    id: typeof q.id === "number" ? q.id : i + 1,
    originalText: String(q.originalText || ""),
    rephrase: String(q.rephrase || ""),
    followUps: Array.isArray(q.followUps) ? q.followUps.map(String) : [],
  }));
}
