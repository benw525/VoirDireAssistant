import type { CaseInfo, Juror, VoirDireQuestion, JurorResponse, SavedCase, AppPhase, VoirDireDocument } from '../types';
import { getAuthToken } from './auth';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(err.message || 'Request failed', res.status, err.code);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface DbCase {
  id: string;
  name: string;
  areaOfLaw: string;
  summary: string;
  side: string;
  favorableTraits: string[];
  riskTraits: string[];
  lastPhase: number;
  completedPhases: number[];
  questionsLocked: boolean;
  savedAt: number;
  mattrmindrCaseId?: string | null;
  strikesForCause?: Array<{ jurorNumber: number; category: string; basis: string; reasoning: string; argument: string }>;
  batsonAnalysis?: {
    overallRisk: string;
    summary: string;
    defensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; riskLevel: string; statisticalFlag: string; comparativeConcern: string; currentJustification: string; recommendedArticulation: string; warning?: string }>;
    offensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; strengthOfChallenge: string; statisticalPattern: string; comparativeEvidence: string; suggestedArgument: string }>;
  } | null;
}

interface DbJuror {
  id: string;
  caseId: string;
  number: number;
  name: string;
  address: string;
  cityStateZip: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  lean: string;
  riskTier: string;
  notes: string;
  aiSummary: string;
  aiAnalysis: string;
}

interface DbQuestion {
  id: string;
  caseId: string;
  questionNumber: number;
  originalText: string;
  rephrase: string;
  followUps: string[];
  locked: boolean;
}

interface DbResponse {
  id: string;
  caseId: string;
  jurorNumber: number;
  questionId: number | null;
  responseText: string;
  side: string;
  questionSummary: string | null;
  followUps: Array<{question: string, answer: string}>;
  timestamp: number;
}

interface DbFullCase extends DbCase {
  jurors: DbJuror[];
  questions: DbQuestion[];
  responses: DbResponse[];
}

function dbCaseToSavedCase(c: DbCase, jurors: Juror[] = [], questions: VoirDireQuestion[] = [], responses: JurorResponse[] = []): SavedCase {
  return {
    id: c.id,
    savedAt: c.savedAt,
    lastPhase: c.lastPhase as AppPhase,
    caseInfo: {
      name: c.name,
      areaOfLaw: c.areaOfLaw,
      summary: c.summary,
      side: c.side as 'plaintiff' | 'defense',
      favorableTraits: c.favorableTraits,
      riskTraits: c.riskTraits,
    },
    jurors,
    questions,
    questionsLocked: c.questionsLocked,
    responses,
    completedPhases: c.completedPhases,
    mattrmindrCaseId: c.mattrmindrCaseId || null,
    strikesForCause: c.strikesForCause || [],
    batsonAnalysis: c.batsonAnalysis || null,
  };
}

function dbJurorToJuror(j: DbJuror): Juror {
  return {
    number: j.number,
    name: j.name,
    address: j.address,
    cityStateZip: j.cityStateZip,
    sex: j.sex,
    race: j.race,
    birthDate: j.birthDate,
    occupation: j.occupation,
    employer: j.employer,
    responses: [],
    lean: j.lean as Juror['lean'],
    riskTier: j.riskTier as Juror['riskTier'],
    notes: j.notes,
    aiSummary: j.aiSummary || '',
    aiAnalysis: j.aiAnalysis || '',
  };
}

function dbQuestionToQuestion(q: DbQuestion): VoirDireQuestion {
  return {
    id: q.questionNumber,
    originalText: q.originalText,
    rephrase: q.rephrase,
    followUps: q.followUps,
    locked: q.locked,
  };
}

function dbResponseToResponse(r: DbResponse): JurorResponse {
  return {
    id: r.id,
    jurorNumber: r.jurorNumber,
    questionId: r.questionId,
    responseText: r.responseText,
    side: (r.side === 'opposing' ? 'opposing' : 'yours') as JurorResponse['side'],
    questionSummary: r.questionSummary || undefined,
    followUps: r.followUps && r.followUps.length > 0 ? r.followUps : undefined,
    timestamp: r.timestamp,
  };
}

export async function fetchCases(): Promise<SavedCase[]> {
  const cases = await fetchJson<DbCase[]>(`${API_BASE}/cases`);
  return cases.map(c => dbCaseToSavedCase(c));
}

export async function fetchFullCase(id: string): Promise<SavedCase> {
  const data = await fetchJson<DbFullCase>(`${API_BASE}/cases/${id}/full`);
  const jurors = data.jurors.map(dbJurorToJuror);
  const questions = data.questions.map(dbQuestionToQuestion);
  const responses = data.responses.map(dbResponseToResponse);
  return dbCaseToSavedCase(data, jurors, questions, responses);
}

export async function createCase(caseInfo: CaseInfo, lastPhase: number, completedPhases: number[]): Promise<string> {
  const result = await fetchJson<DbCase>(`${API_BASE}/cases`, {
    method: 'POST',
    body: JSON.stringify({
      name: caseInfo.name,
      areaOfLaw: caseInfo.areaOfLaw,
      summary: caseInfo.summary,
      side: caseInfo.side,
      favorableTraits: caseInfo.favorableTraits,
      riskTraits: caseInfo.riskTraits,
      lastPhase,
      completedPhases,
      questionsLocked: false,
      savedAt: Date.now(),
    }),
  });
  return result.id;
}

export async function updateCase(id: string, updates: Record<string, any>): Promise<void> {
  await fetchJson(`${API_BASE}/cases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, savedAt: Date.now() }),
  });
}

export async function deleteCase(id: string): Promise<void> {
  await fetchJson(`${API_BASE}/cases/${id}`, { method: 'DELETE' });
}

export async function saveJurors(caseId: string, jurors: Juror[]): Promise<void> {
  await fetchJson(`${API_BASE}/cases/${caseId}/jurors`, { method: 'DELETE' });
  if (jurors.length > 0) {
    await fetchJson(`${API_BASE}/cases/${caseId}/jurors`, {
      method: 'POST',
      body: JSON.stringify(jurors.map(j => ({
        number: j.number,
        name: j.name,
        address: j.address,
        cityStateZip: j.cityStateZip,
        sex: j.sex,
        race: j.race,
        birthDate: j.birthDate,
        occupation: j.occupation,
        employer: j.employer,
        lean: j.lean,
        riskTier: j.riskTier,
        notes: j.notes,
      }))),
    });
  }
}

export async function saveQuestions(caseId: string, questions: VoirDireQuestion[]): Promise<void> {
  await fetchJson(`${API_BASE}/cases/${caseId}/questions`, { method: 'DELETE' });
  if (questions.length > 0) {
    await fetchJson(`${API_BASE}/cases/${caseId}/questions`, {
      method: 'POST',
      body: JSON.stringify(questions.map(q => ({
        questionNumber: q.id,
        originalText: q.originalText,
        rephrase: q.rephrase,
        followUps: q.followUps,
        locked: q.locked,
      }))),
    });
  }
}

export async function saveResponse(caseId: string, response: JurorResponse): Promise<JurorResponse> {
  const result = await fetchJson<DbResponse>(`${API_BASE}/cases/${caseId}/responses`, {
    method: 'POST',
    body: JSON.stringify({
      jurorNumber: response.jurorNumber,
      questionId: response.questionId,
      responseText: response.responseText,
      side: response.side,
      questionSummary: response.questionSummary || null,
      timestamp: response.timestamp,
    }),
  });
  return dbResponseToResponse(result);
}

export async function addFollowUp(responseId: string, followUp: {question: string, answer: string}): Promise<JurorResponse> {
  const result = await fetchJson<DbResponse>(`${API_BASE}/responses/${responseId}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(followUp),
  });
  return dbResponseToResponse(result);
}

export async function parseStrikeList(fileOrText: File[] | string): Promise<Juror[]> {
  const formData = new FormData();
  if (typeof fileOrText === 'string') {
    formData.append('text', fileOrText);
  } else {
    for (const file of fileOrText) {
      formData.append('files', file);
    }
  }

  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/parse-strike-list`, {
    method: 'POST',
    body: formData,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  const rawText = await res.text();
  const jsonText = rawText.trim();

  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('Failed to parse server response');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Failed to parse strike list');
  }
  return (data.jurors || []).map((j: any) => ({
    number: j.number,
    name: j.name || 'Unknown',
    address: j.address || 'Unknown',
    cityStateZip: j.cityStateZip || 'Unknown',
    sex: j.sex || 'U',
    race: j.race || 'U',
    birthDate: j.birthDate || 'Unknown',
    occupation: j.occupation || 'Unknown',
    employer: j.employer || 'Unknown',
    responses: [],
    lean: 'unknown' as const,
    riskTier: 'unassessed' as const,
    notes: '',
    aiSummary: '',
    aiAnalysis: '',
    needsReview: Boolean(j.needsReview),
  }));
}

export async function generateVoirDire(caseInfo: CaseInfo, jurors: Juror[]): Promise<VoirDireDocument> {
  const jurorSummaries = jurors.map(j => ({
    number: j.number,
    name: j.name,
    sex: j.sex,
    race: j.race,
    birthDate: j.birthDate,
    occupation: j.occupation,
    employer: j.employer,
  }));
  return fetchJson<VoirDireDocument>(`${API_BASE}/generate-voir-dire`, {
    method: 'POST',
    body: JSON.stringify({ caseInfo, jurors: jurorSummaries }),
  });
}

export async function refineQuestions(rawText: string, caseInfo: CaseInfo, jurors: Juror[]): Promise<VoirDireQuestion[]> {
  const jurorSummaries = jurors.map(j => ({
    number: j.number,
    name: j.name,
    sex: j.sex,
    race: j.race,
    birthDate: j.birthDate,
    occupation: j.occupation,
    employer: j.employer,
  }));
  const result = await fetchJson<{ questions: Array<{ id: number; originalText: string; rephrase: string; followUps: string[] }> }>(
    `${API_BASE}/refine-questions`,
    {
      method: 'POST',
      body: JSON.stringify({ rawQuestions: rawText, caseInfo, jurors: jurorSummaries }),
    }
  );
  return result.questions.map(q => ({
    id: q.id,
    originalText: q.originalText,
    rephrase: q.rephrase,
    followUps: q.followUps,
    locked: false,
  }));
}

export async function analyzeJuror(
  caseInfo: CaseInfo,
  juror: Juror,
  responses: JurorResponse[],
  questions: Array<{ id: number; originalText: string }>
): Promise<string> {
  const mappedResponses = responses.map(r => ({
    questionText: r.questionId ? (questions.find(q => q.id === r.questionId)?.originalText || null) : null,
    questionSummary: r.questionSummary || null,
    responseText: r.responseText,
    side: r.side,
    followUps: r.followUps || [],
  }));
  const result = await fetchJson<{ analysis: string }>(`${API_BASE}/analyze-juror`, {
    method: 'POST',
    body: JSON.stringify({
      caseInfo,
      juror: {
        number: juror.number,
        name: juror.name,
        sex: juror.sex,
        race: juror.race,
        birthDate: juror.birthDate,
        occupation: juror.occupation,
        employer: juror.employer,
        lean: juror.lean,
        riskTier: juror.riskTier,
        notes: juror.notes,
      },
      responses: mappedResponses,
    }),
  });
  return result.analysis;
}

export async function analyzeJurorsBatch(
  caseInfo: CaseInfo,
  jurors: Juror[],
  responses: JurorResponse[],
  questions: Array<{ id: number; originalText: string }>
): Promise<Record<number, string>> {
  const jurorsWithResponses = jurors.map(j => {
    const jurorResponses = responses.filter(r => r.jurorNumber === j.number);
    return {
      number: j.number,
      name: j.name,
      sex: j.sex,
      race: j.race,
      birthDate: j.birthDate,
      occupation: j.occupation,
      employer: j.employer,
      lean: j.lean,
      riskTier: j.riskTier,
      notes: j.notes || '',
      responses: jurorResponses.map(r => ({
        questionText: r.questionId ? (questions.find(q => q.id === r.questionId)?.originalText || null) : null,
        questionSummary: r.questionSummary || null,
        responseText: r.responseText,
        side: r.side,
        followUps: r.followUps || [],
      })),
    };
  });
  const result = await fetchJson<{ summaries: Record<number, string> }>(`${API_BASE}/analyze-jurors-batch`, {
    method: 'POST',
    body: JSON.stringify({ caseInfo, jurors: jurorsWithResponses }),
  });
  return result.summaries;
}

export interface StrikeForCauseResult {
  jurorNumber: number;
  category: "Highly Likely" | "Possible" | "Unlikely";
  reasoning: string;
  argument: string;
  basis: string;
}

export async function analyzeStrikesForCause(
  caseInfo: CaseInfo,
  jurors: Juror[],
  responses: JurorResponse[],
  questions: Array<{ id: number; originalText: string }>
): Promise<StrikeForCauseResult[]> {
  const jurorsWithResponses = jurors.map(j => {
    const jurorResponses = responses.filter(r => r.jurorNumber === j.number);
    return {
      number: j.number,
      name: j.name,
      sex: j.sex,
      race: j.race,
      birthDate: j.birthDate,
      occupation: j.occupation,
      employer: j.employer,
      lean: j.lean,
      riskTier: j.riskTier,
      notes: j.notes || '',
      responses: jurorResponses.map(r => ({
        questionText: r.questionId ? (questions.find(q => q.id === r.questionId)?.originalText || null) : null,
        questionSummary: r.questionSummary || null,
        responseText: r.responseText,
        side: r.side,
        followUps: r.followUps || [],
      })),
    };
  });
  const result = await fetchJson<{ strikes: StrikeForCauseResult[] }>(`${API_BASE}/analyze-strikes-for-cause`, {
    method: 'POST',
    body: JSON.stringify({ caseInfo, jurors: jurorsWithResponses }),
  });
  return result.strikes;
}

export interface BatsonAnalysisResult {
  overallRisk: string;
  summary: string;
  defensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; riskLevel: string; statisticalFlag: string; comparativeConcern: string; currentJustification: string; recommendedArticulation: string; warning?: string }>;
  offensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; strengthOfChallenge: string; statisticalPattern: string; comparativeEvidence: string; suggestedArgument: string }>;
}

export async function analyzeBatson(
  caseInfo: CaseInfo,
  jurors: Juror[],
  yourStrikes: number[],
  theirStrikes: number[]
): Promise<BatsonAnalysisResult> {
  const jurorData = jurors.map(j => ({
    number: j.number,
    name: j.name,
    sex: j.sex,
    race: j.race,
    birthDate: j.birthDate,
    occupation: j.occupation,
    employer: j.employer,
    lean: j.lean,
    riskTier: j.riskTier,
    notes: j.notes || '',
    aiSummary: j.aiSummary || '',
  }));
  const result = await fetchJson<BatsonAnalysisResult>(`${API_BASE}/analyze-batson`, {
    method: 'POST',
    body: JSON.stringify({ caseInfo, jurors: jurorData, yourStrikes, theirStrikes }),
  });
  return result;
}

export interface BillingStatus {
  tier: string;
  casesUsed: number;
  casesPurchased: number;
  casesRemaining: number | null;
  isFreeAccess: boolean;
  hasActiveSubscription: boolean;
  canCreateCase: boolean;
  upgradeReason?: string;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  return fetchJson<BillingStatus>(`${API_BASE}/billing/status`);
}

export async function createCheckout(plan: 'monthly' | 'per_case'): Promise<{ url: string }> {
  return fetchJson<{ url: string }>(`${API_BASE}/billing/checkout`, {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return fetchJson<{ url: string }>(`${API_BASE}/billing/portal`, {
    method: 'POST',
  });
}

export async function updateJurorOnServer(caseId: string, jurorNumber: number, updates: Partial<Juror>): Promise<void> {
  const jurors = await fetchJson<DbJuror[]>(`${API_BASE}/cases/${caseId}/jurors`);
  const dbJuror = jurors.find(j => j.number === jurorNumber);
  if (dbJuror) {
    const patchData: Record<string, any> = {};
    if (updates.lean !== undefined) patchData.lean = updates.lean;
    if (updates.riskTier !== undefined) patchData.riskTier = updates.riskTier;
    if (updates.notes !== undefined) patchData.notes = updates.notes;
    if (updates.aiSummary !== undefined) patchData.aiSummary = updates.aiSummary;
    if (updates.aiAnalysis !== undefined) patchData.aiAnalysis = updates.aiAnalysis;
    await fetchJson(`${API_BASE}/jurors/${dbJuror.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
  }
}

// --- MattrMindr Integration ---

export async function getMattrMindrStatus(): Promise<{ connected: boolean; url?: string; user?: any; expired?: boolean }> {
  return fetchJson(`${API_BASE}/mattrmindr/status`);
}

export async function connectMattrMindr(url: string, email: string, password: string): Promise<{ connected: boolean; user?: any }> {
  return fetchJson(`${API_BASE}/mattrmindr/connect`, {
    method: 'POST',
    body: JSON.stringify({ url, email, password }),
  });
}

export async function disconnectMattrMindr(): Promise<void> {
  await fetchJson(`${API_BASE}/mattrmindr/disconnect`, { method: 'POST' });
}

export interface MattrMindrCaseListItem {
  id: string;
  caseNum: string;
  title: string;
  defendantName: string;
  caseType: string;
  status: string;
  stage: string;
  court: string;
  judge: string;
  inTrialCenter: boolean;
  trialDate?: string;
}

export interface MattrMindrCaseDetail extends MattrMindrCaseListItem {
  charges: Array<{ description: string; statute?: string; severity?: string }>;
  arrestDate?: string;
  arraignmentDate?: string;
  nextCourtDate?: string;
  trialDate?: string;
  sentencingDate?: string;
  dispositionDate?: string;
  custodyStatus?: string;
  bondAmount?: string;
  prosecutor?: string;
  county?: string;
  parties: Array<{ name: string; partyType: string; entityKind?: string; phone?: string; email?: string }>;
  notes: Array<{ content: string; category: string; createdAt: string }>;
}

export async function fetchMattrMindrCases(): Promise<MattrMindrCaseListItem[]> {
  return fetchJson(`${API_BASE}/mattrmindr/cases`);
}

export async function fetchMattrMindrCase(caseId: string): Promise<MattrMindrCaseDetail> {
  return fetchJson(`${API_BASE}/mattrmindr/cases/${caseId}`);
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Transcription failed' }));
    throw new Error(err.message || 'Transcription failed');
  }

  const result = await response.json();
  return result.text;
}

export async function pushJuryAnalysisToMattrMindr(
  caseId: string,
  data: { jurors: any[]; strikeStrategy: string; strikesForCause?: Array<{ jurorNumber: number; jurorName: string; category: string; basis: string; argument: string }>; batsonAnalysis?: BatsonAnalysisResult }
): Promise<any> {
  return fetchJson(`${API_BASE}/mattrmindr/cases/${caseId}/jury-analysis`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
