import OpenAI from "openai";
import { getArchetypesAndBias } from "./strategyModules";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

You MUST respond with valid JSON in this exact format:
{
  "riskScore": <number 1-100>,
  "aiRiskTier": "low" | "medium" | "high",
  "suggestedLean": "favorable" | "neutral" | "unfavorable" | "unknown",
  "leanConfidence": "high" | "moderate" | "low",
  "analysis": "<your full 3-5 paragraph analysis as a single string>"
}

RISK SCORE (1-100): Assign a numeric risk score reflecting how dangerous this juror is to the attorney's case. 1 = ideal juror, 100 = worst possible juror.

RISK SCORE WEIGHTING — This is critical:
- Recorded voir dire responses are the PRIMARY signal (60-70% weight). What the juror actually said during questioning — their tone, hedging, strong opinions, specific statements about the case issues — matters most.
- Enrichment/background data is the SECONDARY signal (15-25% weight). Employment history, legal issues, community involvement, business ties found through research.
- Demographics alone (occupation, age, race, sex) are a TERTIARY signal (10-15% weight). Demographics inform context but should NOT drive the score by themselves. A healthcare worker or teacher is not automatically high-risk — their responses determine that.
- A juror with zero recorded responses should score between 30-60 (moderate uncertainty), NOT automatically high.

AI RISK TIER: Based on your score, assign "high" (score 70-100), "medium" (score 35-69), or "low" (score 1-34).

SUGGESTED LEAN: Based on all available evidence, recommend whether this juror leans "favorable" (good for the attorney's case), "unfavorable" (bad for the attorney's case), "neutral" (genuinely mixed signals or ambiguous), or "unknown" (insufficient information to classify). Do NOT force a binary favorable/unfavorable classification when the evidence is ambiguous — use "neutral" when signals genuinely cut both ways. Use "unknown" only when the juror has barely spoken and demographics alone are insufficient.

LEAN CONFIDENCE: Rate your confidence in the suggested lean: "high" (strong, consistent signals — clear responses, corroborating background data), "moderate" (some evidence but mixed or limited), or "low" (very little evidence, mostly demographic inference).

ANALYSIS: Produce a concise, strategic analysis covering:
- RISK ASSESSMENT — Why this juror received this risk score. Reference specific responses first, then background data, then demographics. If the attorney's current tier disagrees with yours, explain the discrepancy.
- KEY CONCERNS — The 2-3 most important things the attorney should know. Flag responses suggesting bias, strong feelings, or potential cause challenges.
- STRATEGIC RECOMMENDATION — Keep, strike for cause (with basis), or use peremptory strike. Explain reasoning.

Rules:
- Be direct and practical — this is a working tool for a trial attorney
- Reference specific responses by quoting them when relevant
- Consider how the juror's occupation, background, and responses interact with the case facts
- If the juror has no recorded responses, note that more information is needed and score conservatively (do NOT default to high risk)
- If the juror has fewer than 3 recorded responses, begin your analysis by explicitly noting that the assessment is based on limited data and should be treated with caution. Avoid strong keep/strike recommendations for jurors with minimal response records. Mark leanConfidence as "low" in such cases.
- Keep the analysis to 3-5 short paragraphs
- Do not use headers, bullet points, or markdown formatting in the analysis — write in flowing prose paragraphs
- Always frame analysis from the perspective of the attorney's side
- IMPORTANT: If enriched background data is provided below the juror profile, you MUST reference at least one finding from it in your analysis. Do not ignore enrichment data when it is present.
- NON-VERBAL REACTIONS: Responses prefixed with [Hand], [Nod], [Shake], or [Note] are non-verbal behavioral observations. A hand raise on a sensitive question (e.g., "Has anyone been a victim of a crime?") is meaningful data. Head nods and shakes indicate agreement or disagreement. Reference specific reactions by question when they reveal bias, sympathy, or concern.
- SILENCE RECORDS: Responses marked "[Silent] No response" indicate the juror was explicitly asked and chose not to respond. Deliberate silence on a specific question can be as telling as a verbal answer — consider what the question was and whether non-response suggests discomfort, disengagement, or caution.`;

const BRIEF_SUMMARY_PROMPT = `You are a Juror Risk Assessment Analyst. Given case context and a juror's profile with their voir dire responses, produce a brief 1-2 sentence summary explaining why this juror is classified at their current lean and risk tier. Be specific — reference their occupation, key responses, or demographic factors that drive the classification. If enriched background data is provided, you MUST incorporate at least one relevant finding (employment history, business ties, community involvement, legal history) into the summary. Write from the attorney's perspective. No headers, no bullet points — just 1-2 flowing sentences.

IMPORTANT: If the juror's responses and demographics provide insufficient evidence to determine a lean, or if the signals are genuinely mixed (favorable on some issues but unfavorable on others), recommend a Neutral lean. Do not force a favorable or unfavorable classification when the data is ambiguous. If the juror has barely spoken or provided no meaningful responses, recommend keeping them at Unknown.`;

export async function generateBriefSummary(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[],
  enrichedData?: Record<string, any> | null
): Promise<string> {
  const responsesText = responses.length > 0
    ? responses.map((r, i) => {
        const questionLabel = r.side === 'court'
          ? `Court asked: "${r.questionSummary || 'Unknown'}"`
          : r.side === 'opposing'
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

  let enrichmentSection = '';
  if (enrichedData && Object.keys(enrichedData).length > 0) {
    const enrichText = enrichedData.text || JSON.stringify(enrichedData);
    enrichmentSection = `\nEnriched background data: ${enrichText}\n`;
  }

  const userPrompt = `Case: ${caseContext.name} (${caseContext.areaOfLaw}, representing ${caseContext.side})
Summary: ${caseContext.summary}
Favorable traits: ${caseContext.favorableTraits.join(', ') || 'None'}
Risk traits: ${caseContext.riskTraits.join(', ') || 'None'}

Juror #${juror.number}: ${juror.name}, ${juror.occupation} (${juror.sex}/${juror.race}, DOB: ${juror.birthDate})
Lean: ${juror.lean} | Risk: ${juror.riskTier}
Notes: ${juror.notes || 'None'}
${enrichmentSection}
Responses:
${responsesText}

Write a 1-2 sentence summary explaining this juror's classification.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: BRIEF_SUMMARY_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 150,
    store: false,
  });

  return completion.choices[0]?.message?.content || "Unable to generate summary.";
}

export interface AnalysisResult {
  analysis: string;
  riskScore: number;
  aiRiskTier: 'low' | 'medium' | 'high';
  suggestedLean: 'favorable' | 'neutral' | 'unfavorable' | 'unknown';
  leanConfidence: 'high' | 'moderate' | 'low';
}

export async function analyzeJuror(
  caseContext: CaseContext,
  juror: JurorData,
  responses: ResponseData[],
  enrichedData?: Record<string, any> | null
): Promise<AnalysisResult> {
  const reactionResponses = responses.filter(r => r.responseText.startsWith('['));
  const verbalResponses = responses.filter(r => !r.responseText.startsWith('['));
  const totalChars = responses.reduce((sum, r) => sum + r.responseText.length, 0);

  const formatResponse = (r: ResponseData, i: number) => {
    const questionLabel = r.side === 'court'
      ? `Court asked: "${r.questionSummary || 'Unknown question'}"`
      : r.side === 'opposing'
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
  };

  let responsesText: string;
  if (responses.length === 0) {
    responsesText = 'No responses recorded for this juror.';
  } else {
    const sections: string[] = [];
    if (verbalResponses.length > 0) {
      sections.push('VERBAL RESPONSES:\n' + verbalResponses.map((r, i) => formatResponse(r, i + 1)).join('\n\n'));
    }
    if (reactionResponses.length > 0) {
      sections.push('NON-VERBAL REACTIONS (observed during questioning — treat as behavioral signals):\n' + reactionResponses.map((r, i) => {
        const questionLabel = r.side === 'court'
          ? `Court asked: "${r.questionSummary || 'Unknown question'}"`
          : r.side === 'opposing'
          ? `Opposing: "${r.questionSummary || 'Unknown question'}"`
          : r.questionText
            ? `Your Q: "${r.questionText}"`
            : r.questionSummary
              ? `Q: "${r.questionSummary}"`
              : 'Unknown question';
        return `${i + 1}. ${questionLabel} → ${r.responseText}`;
      }).join('\n'));
    }
    if (verbalResponses.length === 0 && reactionResponses.length > 0) {
      sections.push('\nNote: This juror has ONLY non-verbal reactions and no recorded verbal testimony. Non-verbal signals (hand raises, nods, head shakes) are meaningful behavioral data — a juror who raised their hand on a sensitive question has revealed something important even without speaking.');
    }
    responsesText = sections.join('\n\n');
  }

  const dataSufficiency = responses.length < 2 || (verbalResponses.length === 0 && totalChars < 150)
    ? `\nDATA SUFFICIENCY WARNING: This juror has limited response data (${verbalResponses.length} verbal responses, ${reactionResponses.length} reactions, ${totalChars} total characters). Base your assessment primarily on what data exists, but explicitly note the limitation and avoid strong recommendations.\n`
    : '';

  let enrichmentSection = '';
  if (enrichedData && Object.keys(enrichedData).length > 0) {
    const enrichText = enrichedData.text || JSON.stringify(enrichedData, null, 2);
    enrichmentSection = `\nENRICHED BACKGROUND DATA (from public records / data services):\n${enrichText}\n`;
  }

  const archetypesText = getArchetypesAndBias(caseContext.areaOfLaw);
  const systemPromptWithContext = SYSTEM_PROMPT + '\n\n' + archetypesText;

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
${enrichmentSection}

RECORDED RESPONSES:
${responsesText}
${dataSufficiency}
Provide your risk assessment analysis for this juror.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: systemPromptWithContext },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_completion_tokens: 1200,
    response_format: { type: "json_object" },
    store: false,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    const score = typeof parsed.riskScore === 'number' ? Math.max(1, Math.min(100, Math.round(parsed.riskScore))) : 50;
    const validTiers = new Set(['low', 'medium', 'high']);
    const tier = validTiers.has(parsed.aiRiskTier) ? parsed.aiRiskTier : (score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low');
    const validLeans = new Set(['favorable', 'neutral', 'unfavorable', 'unknown']);
    const suggestedLean = validLeans.has(parsed.suggestedLean) ? parsed.suggestedLean : 'unknown';
    const validConfidences = new Set(['high', 'moderate', 'low']);
    const leanConfidence = validConfidences.has(parsed.leanConfidence) ? parsed.leanConfidence : 'moderate';
    return {
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'Unable to generate analysis.',
      riskScore: score,
      aiRiskTier: tier as 'low' | 'medium' | 'high',
      suggestedLean: suggestedLean as 'favorable' | 'neutral' | 'unfavorable' | 'unknown',
      leanConfidence: leanConfidence as 'high' | 'moderate' | 'low',
    };
  } catch {
    return { analysis: raw, riskScore: 50, aiRiskTier: 'medium', suggestedLean: 'unknown', leanConfidence: 'low' };
  }
}

export interface StrikeForCauseEntry {
  jurorNumber: number;
  category: "Highly Likely" | "Possible" | "Unlikely";
  reasoning: string;
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
      "reasoning": "<Plain-English explanation of WHY you assigned this category. What specific statements, facts, behavioral indicators, or patterns from the juror's responses and profile led to this classification. Be analytical and specific.>",
      "argument": "<See instructions below based on category>",
      "basis": "<Short 2-5 word label for the grounds, e.g., 'Stated bias', 'Personal connection to victim', 'Cannot follow law', 'Prior lawsuit experience', 'Fixed opinion on guilt', 'No significant basis'>"
    }
  ]
}

ARGUMENT FORMAT BY CATEGORY:

For "Highly Likely" jurors — Write a FULL courtroom script the attorney can read verbatim to the judge. The script must include:
1. A formal address: "Your Honor, [the defense/the State/plaintiff's counsel] moves to strike Juror #[number], [full name], for cause."
2. A statement of the specific grounds, quoting the juror's actual words from voir dire where possible (e.g., "When asked about [topic], this juror stated, '[exact quote from responses].'")
3. The legal basis — why these statements or facts demonstrate bias, inability to follow the law, or inability to be impartial
4. An explanation of why rehabilitation would not cure the issue (e.g., "Despite further questioning, this juror was unable to commit to setting aside [their stated belief/experience]. The bias expressed goes to the core of the issues in this case.")
5. A closing: "We respectfully ask the Court to excuse Juror #[number] for cause."

For "Possible" jurors — Write a courtroom script similar to above, but:
1. Same formal address and opening
2. Quote the concerning statements
3. State the legal basis
4. Acknowledge that further development may be needed (e.g., "While this juror attempted to indicate they could be fair, their initial response of '[quote]' raises substantial concern about whether they can truly set aside [the issue]. We believe further examination would reveal this juror cannot be rehabilitated on this point.")
5. Same closing request

For "Unlikely" jurors — Keep it brief: 1-2 sentences explaining why no significant cause basis was identified.

Rules:
- Evaluate EVERY juror — do not skip any
- Be specific — reference actual responses and facts from the juror's profile
- Quote the juror's actual words from their recorded responses whenever possible
- Frame everything from the perspective of the attorney's side
- The courtroom scripts should sound natural and professional — as a seasoned trial attorney would speak to a judge
- Use the case context (area of law, side) to determine proper party references (e.g., "the defense" vs. "the State" vs. "plaintiff's counsel")`;

export async function analyzeStrikesForCause(
  caseContext: CaseContext,
  jurors: JurorWithResponses[]
): Promise<StrikeForCauseEntry[]> {
  const jurorsText = jurors.map(j => {
    const responsesText = j.responses.length > 0
      ? j.responses.map((r, i) => {
          const questionLabel = r.side === 'court'
            ? `Court asked: "${r.questionSummary || 'Unknown'}"`
            : r.side === 'opposing'
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
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: STRIKE_FOR_CAUSE_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 8000,
    response_format: { type: "json_object" },
    store: false,
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
      reasoning: typeof s.reasoning === 'string' ? s.reasoning : '',
      argument: typeof s.argument === 'string' ? s.argument : 'No argument provided.',
      basis: typeof s.basis === 'string' ? s.basis : 'Not assessed',
    }));

  const coveredJurors = new Set(validatedStrikes.map(s => s.jurorNumber));
  for (const j of jurors) {
    if (!coveredJurors.has(j.number)) {
      validatedStrikes.push({
        jurorNumber: j.number,
        category: "Unlikely",
        reasoning: `No concerning statements or indicators were identified in Juror #${j.number}'s responses or profile.`,
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

interface BatsonDefensiveEntry {
  jurorNumber: number;
  jurorName: string;
  protectedClass: string;
  riskLevel: string;
  statisticalFlag: string;
  comparativeConcern: string;
  currentJustification: string;
  recommendedArticulation: string;
  warning?: string;
}

interface BatsonOffensiveEntry {
  jurorNumber: number;
  jurorName: string;
  protectedClass: string;
  strengthOfChallenge: string;
  statisticalPattern: string;
  comparativeEvidence: string;
  suggestedArgument: string;
}

export interface BatsonAnalysisResult {
  overallRisk: string;
  summary: string;
  defensive: BatsonDefensiveEntry[];
  offensive: BatsonOffensiveEntry[];
}

const BATSON_PROMPT = `You are a Batson Challenge Analyst. You evaluate peremptory strike patterns for potential Batson v. Kentucky (1986) violations and its progeny (J.E.B. v. Alabama, 1994; Flowers v. Mississippi, 2019).

You will receive:
1. Case context (area of law, side represented, case summary)
2. The full juror panel with demographics (race, sex, age/DOB, occupation, notes, AI summary)
3. Which jurors were struck by "your side" (the attorney using this tool)
4. Which jurors were struck by the opposing side

You must perform TWO analyses:

## DEFENSIVE ANALYSIS (Your Strikes)
Evaluate whether any of the attorney's own strikes could be vulnerable to a Batson challenge from opposing counsel.

For each protected class (race, sex):
1. Count how many members of that group were in the full panel
2. Count how many were struck by your side
3. Calculate strike rate per group vs. overall strike rate
4. For each potentially problematic strike, find seated jurors outside the protected class who share similar characteristics (occupation, attitudes, responses) — this is the "comparative juror analysis" from Miller-El v. Dretke (2005)
5. Review the attorney's notes/AI summary for each struck juror to assess whether there is a legitimate race/sex-neutral justification

For each flagged strike, output:
- jurorNumber, jurorName
- protectedClass: which class triggers concern (e.g., "Race - Black", "Sex - Female")
- riskLevel: "High" / "Moderate" / "Low"
- statisticalFlag: the disparity numbers (e.g., "3 of 4 Black jurors struck (75%) vs. 2 of 8 White jurors (25%)")
- comparativeConcern: which seated jurors have similar profiles but were not struck
- currentJustification: what the attorney's notes suggest as reasoning
- recommendedArticulation: a stronger race/sex-neutral justification the attorney could prepare, IF one legitimately exists based on the record
- warning: if no legitimate justification exists, state this clearly (optional field, only include when warranted)

## OFFENSIVE ANALYSIS (Their Strikes)
Evaluate whether opposing counsel's strikes show a pattern that could support a Batson challenge.

Same statistical and comparative methodology. For each challengeable strike:
- jurorNumber, jurorName
- protectedClass
- strengthOfChallenge: "Strong" / "Moderate" / "Weak"
- statisticalPattern: the numbers
- comparativeEvidence: seated jurors who share traits with the struck juror
- suggestedArgument: what the attorney should say when raising the Batson challenge, written as if addressing the judge directly

## OVERALL ASSESSMENT
- overallRisk: "Low" / "Moderate" / "High" — how vulnerable is the attorney's strike pattern overall
- summary: 2-4 sentence plain-English summary of the situation, noting any concerning patterns on either side

## CRITICAL RULES
- Be honest. If the attorney's strikes show a genuine Batson problem, say so directly. Do not help disguise discriminatory strikes.
- Batson applies to race (all races), sex (both sexes), and in many jurisdictions ethnicity.
- A prima facie case requires: (1) strikes of members of a cognizable group, (2) circumstances raising an inference of discrimination.
- "Demeanor" alone is the weakest justification. Courts increasingly reject it without specific, documented observations.
- If no strikes have been made by a side, output an empty array for that side's analysis.
- If there are no concerning patterns at all, still provide the summary and set overallRisk to "Low" with empty arrays.

Return valid JSON with this exact structure:
{
  "overallRisk": "Low" | "Moderate" | "High",
  "summary": "string",
  "defensive": [ { "jurorNumber": number, "jurorName": "string", "protectedClass": "string", "riskLevel": "string", "statisticalFlag": "string", "comparativeConcern": "string", "currentJustification": "string", "recommendedArticulation": "string", "warning": "string (optional)" } ],
  "offensive": [ { "jurorNumber": number, "jurorName": "string", "protectedClass": "string", "strengthOfChallenge": "string", "statisticalPattern": "string", "comparativeEvidence": "string", "suggestedArgument": "string" } ]
}`;

export async function analyzeBatson(
  caseContext: CaseContext,
  jurors: Array<JurorData & { aiSummary?: string }>,
  yourStrikes: number[],
  theirStrikes: number[]
): Promise<BatsonAnalysisResult> {
  const jurorsText = jurors.map(j => {
    const struckBy = yourStrikes.includes(j.number) ? 'YOUR SIDE' : theirStrikes.includes(j.number) ? 'OPPOSING SIDE' : 'NOT STRUCK (SEATED)';
    return `JUROR #${j.number}: ${j.name}
  Sex: ${j.sex} | Race: ${j.race} | DOB: ${j.birthDate}
  Occupation: ${j.occupation} | Employer: ${j.employer}
  Lean: ${j.lean} | Risk: ${j.riskTier}
  Notes: ${j.notes || 'None'}
  AI Summary: ${j.aiSummary || 'None'}
  STRIKE STATUS: ${struckBy}`;
  }).join('\n\n---\n\n');

  const userPrompt = `CASE CONTEXT:
Case: ${caseContext.name}
Area of Law: ${caseContext.areaOfLaw}
Summary: ${caseContext.summary}
Representing: ${caseContext.side}

FULL PANEL (${jurors.length} jurors):

${jurorsText}

YOUR STRIKES (${yourStrikes.length}): Jurors ${yourStrikes.length > 0 ? yourStrikes.map(n => `#${n}`).join(', ') : 'None'}
OPPOSING STRIKES (${theirStrikes.length}): Jurors ${theirStrikes.length > 0 ? theirStrikes.map(n => `#${n}`).join(', ') : 'None'}

Perform the full Batson analysis and return the JSON result.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-2026-03-05",
    messages: [
      { role: "system", content: BATSON_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 8000,
    response_format: { type: "json_object" },
    store: false,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const VALID_RISKS = new Set(["Low", "Moderate", "High"]);
  const VALID_STRENGTHS = new Set(["Strong", "Moderate", "Weak"]);

  const result: BatsonAnalysisResult = {
    overallRisk: VALID_RISKS.has(parsed.overallRisk) ? parsed.overallRisk : "Low",
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'No Batson concerns identified.',
    defensive: Array.isArray(parsed.defensive)
      ? parsed.defensive.filter((d: any) => d && typeof d.jurorNumber === 'number').map((d: any) => ({
          jurorNumber: d.jurorNumber,
          jurorName: typeof d.jurorName === 'string' ? d.jurorName : `Juror #${d.jurorNumber}`,
          protectedClass: typeof d.protectedClass === 'string' ? d.protectedClass : 'Unknown',
          riskLevel: VALID_RISKS.has(d.riskLevel) ? d.riskLevel : 'Low',
          statisticalFlag: typeof d.statisticalFlag === 'string' ? d.statisticalFlag : '',
          comparativeConcern: typeof d.comparativeConcern === 'string' ? d.comparativeConcern : '',
          currentJustification: typeof d.currentJustification === 'string' ? d.currentJustification : '',
          recommendedArticulation: typeof d.recommendedArticulation === 'string' ? d.recommendedArticulation : '',
          ...(typeof d.warning === 'string' ? { warning: d.warning } : {}),
        }))
      : [],
    offensive: Array.isArray(parsed.offensive)
      ? parsed.offensive.filter((o: any) => o && typeof o.jurorNumber === 'number').map((o: any) => ({
          jurorNumber: o.jurorNumber,
          jurorName: typeof o.jurorName === 'string' ? o.jurorName : `Juror #${o.jurorNumber}`,
          protectedClass: typeof o.protectedClass === 'string' ? o.protectedClass : 'Unknown',
          strengthOfChallenge: VALID_STRENGTHS.has(o.strengthOfChallenge) ? o.strengthOfChallenge : 'Weak',
          statisticalPattern: typeof o.statisticalPattern === 'string' ? o.statisticalPattern : '',
          comparativeEvidence: typeof o.comparativeEvidence === 'string' ? o.comparativeEvidence : '',
          suggestedArgument: typeof o.suggestedArgument === 'string' ? o.suggestedArgument : '',
        }))
      : [],
  };

  return result;
}
