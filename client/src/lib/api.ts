import type { CaseInfo, Juror, VoirDireQuestion, JurorResponse, SavedCase, AppPhase, VoirDireDocument } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
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
  isOCQ: boolean;
  ocqSummary: string | null;
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
    isOCQ: r.isOCQ,
    ocqSummary: r.ocqSummary || undefined,
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

export async function saveResponse(caseId: string, response: JurorResponse): Promise<void> {
  await fetchJson(`${API_BASE}/cases/${caseId}/responses`, {
    method: 'POST',
    body: JSON.stringify({
      jurorNumber: response.jurorNumber,
      questionId: response.questionId,
      responseText: response.responseText,
      isOCQ: response.isOCQ,
      ocqSummary: response.ocqSummary || null,
      timestamp: response.timestamp,
    }),
  });
}

export async function parseStrikeList(fileOrText: File | string): Promise<Juror[]> {
  const formData = new FormData();
  if (typeof fileOrText === 'string') {
    formData.append('text', fileOrText);
  } else {
    formData.append('file', fileOrText);
  }

  const res = await fetch(`${API_BASE}/parse-strike-list`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to parse strike list');
  }

  const data = await res.json();
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

export async function updateJurorOnServer(caseId: string, jurorNumber: number, updates: Partial<Juror>): Promise<void> {
  const jurors = await fetchJson<DbJuror[]>(`${API_BASE}/cases/${caseId}/jurors`);
  const dbJuror = jurors.find(j => j.number === jurorNumber);
  if (dbJuror) {
    const patchData: Record<string, any> = {};
    if (updates.lean !== undefined) patchData.lean = updates.lean;
    if (updates.riskTier !== undefined) patchData.riskTier = updates.riskTier;
    if (updates.notes !== undefined) patchData.notes = updates.notes;
    await fetchJson(`${API_BASE}/jurors/${dbJuror.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patchData),
    });
  }
}
