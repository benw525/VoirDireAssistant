import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface CaseContext {
  name: string;
  areaOfLaw: string;
  summary: string;
  side: string;
  favorableTraits: string[];
  riskTraits: string[];
}

interface JurorData {
  number: number;
  name: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  lean: string;
  riskTier: string;
  notes: string;
}

interface ResponseData {
  questionText: string | null;
  questionSummary: string | null;
  responseText: string;
  side: string;
  followUps: Array<{ question: string; answer: string }>;
}

const SYSTEM_PROMPT = `You are a Juror Risk Assessment Analyst — an expert legal strategist who evaluates individual jurors for trial attorneys during jury selection.

You will receive:
1. Case context (area of law, case summary, which side the attorney represents, favorable/risk traits)
2. A single juror's demographic profile
3. All recorded responses from that juror during voir dire (from both sides' examinations, including follow-up exchanges)
4. The juror's current lean assessment and risk tier as set by the attorney
5. Any attorney notes on the juror

Your job is to produce a concise, strategic analysis explaining:

**RISK ASSESSMENT** — Why this juror is classified at their current risk tier. Reference specific responses, demographic factors, and case-relevant concerns. If you disagree with the current tier, say so and explain why.

**KEY CONCERNS** — The 2-3 most important things the attorney should know about this juror. Flag any responses that suggest bias, strong feelings, or potential cause challenges.

**STRATEGIC RECOMMENDATION** — A brief, actionable recommendation: keep, strike for cause (with basis), or use peremptory strike. Explain your reasoning in terms the attorney can use.

Rules:
- Be direct and practical — this is a working tool for a trial attorney
- Reference specific responses by quoting them when relevant
- Consider how the juror's occupation, background, and responses interact with the case facts
- If the juror has no recorded responses, base your analysis on demographics and note that more information is needed
- Keep the total analysis to 3-5 short paragraphs
- Do not use headers, bullet points, or markdown formatting — write in flowing prose paragraphs
- Always frame analysis from the perspective of the attorney's side`;

const BRIEF_SUMMARY_PROMPT = `You are a Juror Risk Assessment Analyst. Given case context and a juror's profile with their voir dire responses, produce a brief 1-2 sentence summary explaining why this juror is classified at their current lean and risk tier. Be specific — reference their occupation, key responses, or demographic factors that drive the classification. Write from the attorney's perspective. No headers, no bullet points — just 1-2 flowing sentences.`;

export async function generateBriefSummary(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[]
): Promise<string> {
  const responsesText = responses.length > 0
    ? responses.map((r, i) => {
        const questionLabel = r.side === 'opposing'
          ? `Opposing: "${r.questionSummary || 'Unknown'}"`
          : r.questionText
            ? `Your Q: "${r.questionText}"`
            : r.questionSummary
              ? `New Q: "${r.questionSummary}"`
              : 'Unknown question';
        let text = `${i + 1}. ${questionLabel} → "${r.responseText}"`;
        if (r.followUps && r.followUps.length > 0) {
          r.followUps.forEach(fu => {
            text += ` | Follow-up: "${fu.question}" → "${fu.answer}"`;
          });
        }
        return text;
      }).join('\n')
    : 'No responses recorded.';

  const userPrompt = `Case: ${caseContext.name} (${caseContext.areaOfLaw}, representing ${caseContext.side})
Summary: ${caseContext.summary}
Favorable traits: ${caseContext.favorableTraits.join(', ') || 'None'}
Risk traits: ${caseContext.riskTraits.join(', ') || 'None'}

Juror #${juror.number}: ${juror.name}, ${juror.occupation} (${juror.sex}/${juror.race}, DOB: ${juror.birthDate})
Lean: ${juror.lean} | Risk: ${juror.riskTier}
Notes: ${juror.notes || 'None'}

Responses:
${responsesText}

Write a 1-2 sentence summary explaining this juror's classification.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: BRIEF_SUMMARY_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 150,
  });

  return completion.choices[0]?.message?.content || "Unable to generate summary.";
}

export async function analyzeJuror(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[]
): Promise<string> {
  const responsesText = responses.length > 0
    ? responses.map((r, i) => {
        const questionLabel = r.side === 'opposing'
          ? `Opposing counsel asked: "${r.questionSummary || 'Unknown question'}"`
          : r.questionText
            ? `Your question: "${r.questionText}"`
            : r.questionSummary
              ? `New question: "${r.questionSummary}"`
              : 'Unknown question';

        let text = `${i + 1}. ${questionLabel}\n   Response: "${r.responseText}"`;

        if (r.followUps && r.followUps.length > 0) {
          r.followUps.forEach(fu => {
            text += `\n   Follow-up: "${fu.question}" → "${fu.answer}"`;
          });
        }

        return text;
      }).join('\n\n')
    : 'No responses recorded for this juror.';

  const userPrompt = `CASE CONTEXT:
Case: ${caseContext.name}
Area of Law: ${caseContext.areaOfLaw}
Summary: ${caseContext.summary}
Representing: ${caseContext.side}
Favorable Traits: ${caseContext.favorableTraits.join(', ') || 'None specified'}
Risk Traits: ${caseContext.riskTraits.join(', ') || 'None specified'}

JUROR PROFILE:
Juror #${juror.number}: ${juror.name}
Sex: ${juror.sex} | Race: ${juror.race} | DOB: ${juror.birthDate}
Occupation: ${juror.occupation} | Employer: ${juror.employer}
Current Lean: ${juror.lean}
Current Risk Tier: ${juror.riskTier}
Attorney Notes: ${juror.notes || 'None'}

RECORDED RESPONSES:
${responsesText}

Provide your risk assessment analysis for this juror.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  return completion.choices[0]?.message?.content || "Unable to generate analysis.";
}

export interface StrikeForCauseEntry {
  jurorNumber: number;
  category: "Highly Likely" | "Possible" | "Unlikely";
  argument: string;
  basis: string;
}

interface JurorWithResponses extends JurorData {
  responses: ResponseData[];
}

const STRIKE_FOR_CAUSE_PROMPT = `You are a Strike-for-Cause Analyst — an expert trial attorney and legal strategist who evaluates every juror in the venire for potential strikes for cause during jury selection.

You will receive:
1. Case context (area of law, case summary, which side the attorney represents, favorable/risk traits)
2. A list of all jurors with their demographic profiles, recorded voir dire responses, current lean assessments, risk tiers, and attorney notes

Your job is to evaluate EVERY juror and determine whether a viable argument exists to strike them for cause. For each juror, you must assess:

- Stated biases or prejudices relevant to the case
- Relationships or connections to parties, witnesses, attorneys, or law enforcement
- Inability or unwillingness to follow the law as instructed by the judge
- Fixed opinions on guilt, liability, or the outcome before hearing evidence
- Prior experiences (victim of similar crime, prior lawsuits, etc.) that would prevent impartiality
- Hardship claims that could affect attention or fairness
- Responses indicating prejudgment or inability to be fair to both sides
- Any statements suggesting the juror cannot set aside personal feelings

For each juror, categorize them as:
- "Highly Likely" — Strong, articulable grounds exist. The juror made statements or has connections that clearly demonstrate bias or inability to be impartial. A judge would likely grant this challenge.
- "Possible" — Some concerning indicators exist. The juror's responses or background raise questions about impartiality, but the grounds may need further development or rehabilitation might cure the issue.
- "Unlikely" — No significant cause basis identified. The juror appears capable of being fair and impartial based on available information.

You MUST respond with valid JSON in this exact format:
{
  "strikes": [
    {
      "jurorNumber": <number>,
      "category": "Highly Likely" | "Possible" | "Unlikely",
      "argument": "<The specific legal argument the attorney should make to the judge to strike this juror for cause. Reference specific statements, responses, or facts. Write as if speaking to the judge.>",
      "basis": "<Short 2-5 word label for the grounds, e.g., 'Stated bias', 'Personal connection to victim', 'Cannot follow law', 'Prior lawsuit experience', 'Fixed opinion on guilt', 'No significant basis'>"
    }
  ]
}

Rules:
- Evaluate EVERY juror — do not skip any
- Be specific — reference actual responses and facts from the juror's profile
- Write arguments as the attorney would present them to the judge
- For "Unlikely" jurors, the argument should briefly explain why no cause basis exists
- Frame everything from the perspective of the attorney's side
- Keep each argument to 2-4 sentences`;

export async function analyzeStrikesForCause(
  caseContext: CaseContext,
  jurors: JurorWithResponses[]
): Promise<StrikeForCauseEntry[]> {
  const jurorsText = jurors.map(j => {
    const responsesText = j.responses.length > 0
      ? j.responses.map((r, i) => {
          const questionLabel = r.side === 'opposing'
            ? `Opposing: "${r.questionSummary || 'Unknown'}"`
            : r.questionText
              ? `Your Q: "${r.questionText}"`
              : r.questionSummary
                ? `New Q: "${r.questionSummary}"`
                : 'Unknown question';
          let text = `  ${i + 1}. ${questionLabel} → "${r.responseText}"`;
          if (r.followUps && r.followUps.length > 0) {
            r.followUps.forEach(fu => {
              text += ` | Follow-up: "${fu.question}" → "${fu.answer}"`;
            });
          }
          return text;
        }).join('\n')
      : '  No responses recorded.';

    return `JUROR #${j.number}: ${j.name}
  Sex: ${j.sex} | Race: ${j.race} | DOB: ${j.birthDate}
  Occupation: ${j.occupation} | Employer: ${j.employer}
  Lean: ${j.lean} | Risk: ${j.riskTier}
  Notes: ${j.notes || 'None'}
  Responses:
${responsesText}`;
  }).join('\n\n---\n\n');

  const userPrompt = `CASE CONTEXT:
Case: ${caseContext.name}
Area of Law: ${caseContext.areaOfLaw}
Summary: ${caseContext.summary}
Representing: ${caseContext.side}
Favorable Traits: ${caseContext.favorableTraits.join(', ') || 'None specified'}
Risk Traits: ${caseContext.riskTraits.join(', ') || 'None specified'}

ALL JURORS (${jurors.length} total):

${jurorsText}

Evaluate every juror for potential strikes for cause and return the JSON result.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: STRIKE_FOR_CAUSE_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content || '{"strikes":[]}';
  let parsed: { strikes: any[] };
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.strikes)) {
      parsed = { strikes: [] };
    }
  } catch {
    parsed = { strikes: [] };
  }

  const VALID_CATEGORIES = new Set(["Highly Likely", "Possible", "Unlikely"]);

  const validatedStrikes: StrikeForCauseEntry[] = parsed.strikes
    .filter((s: any) => s && typeof s.jurorNumber === 'number')
    .map((s: any) => ({
      jurorNumber: s.jurorNumber,
      category: VALID_CATEGORIES.has(s.category) ? s.category : "Unlikely",
      argument: typeof s.argument === 'string' ? s.argument : 'No argument provided.',
      basis: typeof s.basis === 'string' ? s.basis : 'Not assessed',
    }));

  const coveredJurors = new Set(validatedStrikes.map(s => s.jurorNumber));
  for (const j of jurors) {
    if (!coveredJurors.has(j.number)) {
      validatedStrikes.push({
        jurorNumber: j.number,
        category: "Unlikely",
        argument: `No specific basis for a cause challenge was identified for Juror #${j.number} (${j.name}) based on available information.`,
        basis: "No significant basis",
      });
    }
  }

  const categoryOrder: Record<string, number> = { "Highly Likely": 0, "Possible": 1, "Unlikely": 2 };
  validatedStrikes.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3);
    if (catDiff !== 0) return catDiff;
    return a.jurorNumber - b.jurorNumber;
  });

  return validatedStrikes;
}
