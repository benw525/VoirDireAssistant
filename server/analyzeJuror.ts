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
