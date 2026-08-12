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
  side: 'yours' | 'opposing' | 'court';
  questionSummary?: string;
  followUps?: Array<{question: string, answer: string}>;
  timestamp: number;
  recordedBy?: string;
}

export interface Juror {
  id?: string;
  number: number;
  name: string;
  address: string;
  cityStateZip: string;
  phone: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  responses: JurorResponse[];
  lean: 'favorable' | 'neutral' | 'unfavorable' | 'unknown';
  leanConfidence: 'high' | 'moderate' | 'low' | 'none';
  riskTier: 'low' | 'medium' | 'high' | 'unassessed';
  aiRiskTier: 'low' | 'medium' | 'high' | 'unassessed';
  riskScore: number;
  notes: string;
  aiSummary: string;
  aiAnalysis: string;
  /** 'none' = never analyzed, 'ok' = valid analysis, 'failed' = failed after retry (no defaults shown), 'stale' = new responses since last analysis */
  analysisStatus?: 'none' | 'ok' | 'failed' | 'stale';
  /** How developed the voir dire record was at analysis time ('' = not assessed). */
  informationLevel?: 'well-developed' | 'partial' | 'minimal' | '';
  /** True when the record was too thin for a settled score. */
  analysisProvisional?: boolean;
  /** The ONE follow-up question that would most change a provisional score. */
  keyFollowUp?: string;
  /** Damages-anchor assessment (conceded/weak liability cases). */
  damagesAnchor?: string;
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

export interface SeatingConfig {
  rows: number;
  direction: 'bottom-right-first' | 'top-left-first' | 'bottom-left-first';
  seatsPerRow?: number[];
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
  mattrmindrCaseId?: string | null;
  strikesForCause?: Array<{ jurorNumber: number; category: string; basis: string; reasoning: string; argument: string; lockInQuestions?: string[] }>;
  courtDismissed?: number[];
  seatingConfig?: SeatingConfig | null;
  batsonAnalysis?: {
    overallRisk: string;
    summary: string;
    mode?: 'executed' | 'preview';
    defensive: Array<{
      jurorNumber: number; jurorName: string; protectedClass: string; riskLevel: string; statisticalFlag: string; comparativeConcern: string; currentJustification: string; recommendedArticulation: string; warning?: string;
      comparatorTable?: Array<{ seatedJurorNumber: number; seatedJurorName: string; sharedTraits: string; distinguishingFact: string }>;
      suggestedAlternates?: string;
    }>;
    offensive: Array<{ jurorNumber: number; jurorName: string; protectedClass: string; strengthOfChallenge: string; statisticalPattern: string; comparativeEvidence: string; suggestedArgument: string }>;
    workProductFlags?: Array<{ jurorNumber: number; jurorName: string; source: string; quote: string; replacement: string }>;
  } | null;
  demographicsChangedAt?: number | null;
  batsonAnalyzedAt?: number | null;
  causeAnalyzedAt?: number | null;
}