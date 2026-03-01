export type AppPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CaseInfo {
  name: string;
  areaOfLaw: string;
  summary: string;
  side: 'plaintiff' | 'defense';
  favorableTraits: string[];
  riskTraits: string[];
}

export interface JurorResponse {
  id: string;
  jurorNumber: number;
  questionId: number | null;
  responseText: string;
  isOCQ: boolean;
  ocqSummary?: string;
  timestamp: number;
}

export interface Juror {
  number: number;
  name: string;
  address: string;
  cityStateZip: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  responses: JurorResponse[];
  lean: 'favorable' | 'neutral' | 'unfavorable' | 'unknown';
  riskTier: 'low' | 'medium' | 'high' | 'unassessed';
  notes: string;
}

export interface VoirDireQuestion {
  id: number;
  originalText: string;
  rephrase: string;
  followUps: string[];
  locked: boolean;
}

export interface SavedCase {
  id: string;
  savedAt: number;
  lastPhase: AppPhase;
  caseInfo: CaseInfo;
  jurors: Juror[];
  questions: VoirDireQuestion[];
  questionsLocked: boolean;
  responses: JurorResponse[];
  completedPhases: number[];
}