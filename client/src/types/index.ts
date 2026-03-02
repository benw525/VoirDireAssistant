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
  side: 'yours' | 'opposing';
  questionSummary?: string;
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
    riskLevel: 'Low' | 'Moderate' | 'High';
    primaryConcern: string;
    recommendation: string;
  }>;
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