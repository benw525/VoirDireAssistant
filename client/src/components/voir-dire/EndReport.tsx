import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Scale,
  Target,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Brain,
  Loader2,
  MessageSquare,
  Download,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Gavel,
  UserX,
  ShieldCheck,
  ShieldQuestion,
  ShieldOff,
} from 'lucide-react';
import { CaseInfo, Juror, JurorResponse, VoirDireQuestion } from '../../types';
import * as api from '../../lib/api';
import type { StrikeForCauseResult, BatsonAnalysisResult } from '../../lib/api';

function isCriminalCase(areaOfLaw: string): boolean {
  const lc = areaOfLaw.toLowerCase();
  return lc.includes('criminal') || lc.includes('felony') || lc.includes('misdemeanor');
}

function getPlaintiffLabel(areaOfLaw: string): string {
  return isCriminalCase(areaOfLaw) ? 'Prosecution' : 'Plaintiff';
}

type SortField = 'number' | 'name' | 'lean' | 'riskTier';
type SortDir = 'asc' | 'desc';

const LEAN_ORDER: Record<string, number> = { unfavorable: 0, neutral: 1, unknown: 2, favorable: 3 };
const RISK_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, unassessed: 3 };

interface EndReportProps {
  caseInfo: CaseInfo;
  jurors: Juror[];
  responses: JurorResponse[];
  questions: VoirDireQuestion[];
  mattrmindrCaseId?: string | null;
  isMattrMindrConnected?: boolean;
  activeCaseId?: string | null;
  onUpdateJuror?: (jurorNumber: number, updates: Partial<Juror>) => void;
  savedStrikesForCause?: StrikeForCauseResult[];
  savedBatsonAnalysis?: BatsonAnalysisResult | null;
}

export function EndReport({
  caseInfo,
  jurors,
  responses,
  questions,
  mattrmindrCaseId,
  isMattrMindrConnected,
  activeCaseId,
  onUpdateJuror,
  savedStrikesForCause,
  savedBatsonAnalysis,
}: EndReportProps) {
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedJuror, setExpandedJuror] = useState<number | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    jurors.forEach(j => { if (j.aiSummary) initial[j.number] = j.aiSummary; });
    return initial;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingToMm, setIsSendingToMm] = useState(false);
  const [mmSendResult, setMmSendResult] = useState<'success' | 'error' | null>(null);
  const [mmSendMessage, setMmSendMessage] = useState('');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [plaintiffStrikes, setPlaintiffStrikes] = useState<Set<number>>(new Set());
  const [defenseStrikes, setDefenseStrikes] = useState<Set<number>>(new Set());
  const [causeStrikes, setCauseStrikes] = useState<StrikeForCauseResult[]>(savedStrikesForCause || []);
  const [isAnalyzingCause, setIsAnalyzingCause] = useState(false);
  const [causeAnalysisError, setCauseAnalysisError] = useState('');
  const [collapsedCauseCategories, setCollapsedCauseCategories] = useState<Set<string>>(new Set());
  const [peremptoryCollapsed, setPeremptoryCollapsed] = useState(false);
  const [causeCollapsed, setCauseCollapsed] = useState(false);
  const [strikeOrderCollapsed, setStrikeOrderCollapsed] = useState(false);
  const [batsonResult, setBatsonResult] = useState<BatsonAnalysisResult | null>(savedBatsonAnalysis || null);
  const [isAnalyzingBatson, setIsAnalyzingBatson] = useState(false);
  const [batsonError, setBatsonError] = useState('');
  const [batsonCollapsed, setBatsonCollapsed] = useState(false);

  useEffect(() => {
    if (savedBatsonAnalysis && !batsonResult) {
      setBatsonResult(savedBatsonAnalysis);
    }
  }, [savedBatsonAnalysis]);

  const plaintiffLabel = getPlaintiffLabel(caseInfo.areaOfLaw);

  const toggleStrike = (side: 'plaintiff' | 'defense', jurorNumber: number) => {
    if (side === 'plaintiff') {
      setPlaintiffStrikes(prev => {
        const next = new Set(prev);
        if (next.has(jurorNumber)) {
          next.delete(jurorNumber);
        } else {
          next.add(jurorNumber);
          setDefenseStrikes(d => { const nd = new Set(d); nd.delete(jurorNumber); return nd; });
        }
        return next;
      });
    } else {
      setDefenseStrikes(prev => {
        const next = new Set(prev);
        if (next.has(jurorNumber)) {
          next.delete(jurorNumber);
        } else {
          next.add(jurorNumber);
          setPlaintiffStrikes(p => { const np = new Set(p); np.delete(jurorNumber); return np; });
        }
        return next;
      });
    }
  };

  const jurorsWithResponses = useMemo(() => {
    return jurors.map(juror => {
      const jurorResponses = responses.filter(r => r.jurorNumber === juror.number);
      return { ...juror, jurorResponses };
    });
  }, [jurors, responses]);

  const sortedJurors = useMemo(() => {
    const sorted = [...jurorsWithResponses];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.number - b.number;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'lean':
          cmp = (LEAN_ORDER[a.lean] ?? 99) - (LEAN_ORDER[b.lean] ?? 99);
          break;
        case 'riskTier':
          cmp = (RISK_ORDER[a.riskTier] ?? 99) - (RISK_ORDER[b.riskTier] ?? 99);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [jurorsWithResponses, sortField, sortDir]);

  const strikeOrder = useMemo(() => {
    const scored = jurorsWithResponses.map(juror => {
      let score = 0;
      if (juror.lean === 'unfavorable') score += 50;
      if (juror.lean === 'neutral') score += 15;
      if (juror.riskTier === 'high') score += 30;
      if (juror.riskTier === 'medium') score += 10;
      return { ...juror, strikeScore: score };
    });
    return scored.filter(j => j.strikeScore > 0).sort((a, b) => b.strikeScore - a.strikeScore);
  }, [jurorsWithResponses]);

  const favorableCount = jurors.filter(j => j.lean === 'favorable').length;
  const unfavorableCount = jurors.filter(j => j.lean === 'unfavorable').length;
  const neutralCount = jurors.filter(j => j.lean === 'neutral').length;
  const unknownCount = jurors.filter(j => j.lean === 'unknown').length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleSendToMattrMindr = async () => {
    if (!mattrmindrCaseId) return;
    setIsSendingToMm(true);
    setMmSendResult(null);
    setMmSendMessage('');
    try {
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
        notes: j.notes,
        aiSummary: aiSummaries[j.number] || '',
      }));

      const strikeStrategy = strikeOrder.length > 0
        ? `Suggested strike order: ${strikeOrder.map((j, i) => `${i + 1}. #${j.number} ${j.name} (${j.lean}, ${j.riskTier} risk)`).join('; ')}`
        : 'No strikes recommended based on current classifications.';

      const strikesForCause = causeStrikes.map(s => {
        const juror = jurors.find(j => j.number === s.jurorNumber);
        return {
          jurorNumber: s.jurorNumber,
          jurorName: juror?.name || `Juror #${s.jurorNumber}`,
          category: s.category,
          basis: s.basis,
          reasoning: s.reasoning || '',
          argument: s.argument,
        };
      });

      await api.pushJuryAnalysisToMattrMindr(mattrmindrCaseId, {
        jurors: jurorData,
        strikeStrategy,
        ...(strikesForCause.length > 0 ? { strikesForCause } : {}),
        ...(batsonResult ? { batsonAnalysis: batsonResult } : {}),
      });
      setMmSendResult('success');
      setMmSendMessage('Jury analysis sent to MattrMindr successfully');
    } catch (err: any) {
      setMmSendResult('error');
      setMmSendMessage(err.message || 'Failed to send to MattrMindr');
    } finally {
      setIsSendingToMm(false);
    }
  };

  const handleGenerateSummaries = async () => {
    setIsGenerating(true);
    try {
      const summaries = await api.analyzeJurorsBatch(caseInfo, jurors, responses, questions);
      setAiSummaries(summaries);
      if (activeCaseId && onUpdateJuror) {
        for (const [numStr, summary] of Object.entries(summaries)) {
          const jurorNumber = parseInt(numStr, 10);
          onUpdateJuror(jurorNumber, { aiSummary: summary });
        }
      }
    } catch (err) {
      console.error('Failed to generate summaries:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeCauseStrikes = async () => {
    setIsAnalyzingCause(true);
    setCauseAnalysisError('');
    try {
      const results = await api.analyzeStrikesForCause(caseInfo, jurors, responses, questions);
      setCauseStrikes(results);
      if (activeCaseId) {
        try {
          await api.updateCase(activeCaseId, { strikesForCause: results });
        } catch (err) {
          console.error('Failed to persist strikes for cause:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to analyze strikes for cause:', err);
      setCauseAnalysisError(err.message || 'Failed to analyze strikes for cause');
    } finally {
      setIsAnalyzingCause(false);
    }
  };

  const handleBatsonCheck = async () => {
    setIsAnalyzingBatson(true);
    setBatsonError('');
    try {
      const yourStrikeNums = caseInfo.side === 'defense'
        ? Array.from(defenseStrikes)
        : Array.from(plaintiffStrikes);
      const theirStrikeNums = caseInfo.side === 'defense'
        ? Array.from(plaintiffStrikes)
        : Array.from(defenseStrikes);

      const result = await api.analyzeBatson(caseInfo, jurors, yourStrikeNums, theirStrikeNums);
      setBatsonResult(result);

      if (activeCaseId) {
        try {
          await api.updateCase(activeCaseId, { batsonAnalysis: result });
        } catch (err) {
          console.error('Failed to persist Batson analysis:', err);
        }
      }

      if (mattrmindrCaseId && isMattrMindrConnected) {
        try {
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
            notes: j.notes,
            aiSummary: aiSummaries[j.number] || '',
          }));
          const strikeStrategy = strikeOrder.length > 0
            ? `Suggested strike order: ${strikeOrder.map((j, i) => `${i + 1}. #${j.number} ${j.name} (${j.lean}, ${j.riskTier} risk)`).join('; ')}`
            : 'No strikes recommended based on current classifications.';
          await api.pushJuryAnalysisToMattrMindr(mattrmindrCaseId, {
            jurors: jurorData,
            strikeStrategy,
            batsonAnalysis: result,
          });
        } catch (err) {
          console.error('Failed to push Batson analysis to MattrMindr:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to run Batson check:', err);
      setBatsonError(err.message || 'Failed to run Batson challenge check');
    } finally {
      setIsAnalyzingBatson(false);
    }
  };

  const toggleCauseCategory = (cat: string) => {
    setCollapsedCauseCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const causeByCategory = useMemo(() => {
    const groups: Record<string, StrikeForCauseResult[]> = {
      'Highly Likely': [],
      'Possible': [],
      'Unlikely': [],
    };
    causeStrikes.forEach(s => {
      if (groups[s.category]) groups[s.category].push(s);
      else groups['Unlikely'].push(s);
    });
    return groups;
  }, [causeStrikes]);

  const getQuestionText = (r: JurorResponse): string => {
    if (r.side === 'opposing') {
      return r.questionSummary || 'Opposing counsel question';
    }
    if (r.questionId) {
      const q = questions.find(q => q.id === r.questionId);
      return q ? q.originalText : `Question #${r.questionId}`;
    }
    if (r.questionSummary) {
      return r.questionSummary;
    }
    return 'Unknown question';
  };

  const getLeanBadge = (lean: string) => {
    switch (lean) {
      case 'favorable': return 'bg-emerald-100 text-emerald-800';
      case 'unfavorable': return 'bg-rose-100 text-rose-800';
      case 'neutral': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-rose-100 text-rose-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-900 transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-slate-900' : 'text-slate-300'}`} />
      {sortField === field && (
        <span className="text-slate-400 text-[10px]">{sortDir === 'asc' ? '(A)' : '(D)'}</span>
      )}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col" id="voir-dire-report">
      <div className="mb-8 text-center print-header">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 text-amber-500 mb-4 shadow-lg no-print-icon">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900" data-testid="text-report-title">
          Final Voir Dire Report
        </h2>
        <p className="text-slate-600 mt-2 max-w-2xl mx-auto" data-testid="text-report-subtitle">
          Complete jury panel analysis for {caseInfo.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-12 print-content">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-4">
            <Scale className="w-5 h-5 mr-2 text-slate-500" />
            Case Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Case Name</div>
              <div className="font-medium text-slate-900" data-testid="text-case-name">{caseInfo.name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Area of Law</div>
              <div className="font-medium text-slate-900" data-testid="text-area-of-law">{caseInfo.areaOfLaw}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Side Represented</div>
              <div className="font-medium text-slate-900 capitalize" data-testid="text-side">
                {caseInfo.side === 'plaintiff' ? plaintiffLabel : 'Defense'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Panel Overview</div>
              <div className="font-medium text-slate-900" data-testid="text-panel-overview">
                {jurors.length} Total &bull;{' '}
                <span className="text-emerald-600">{favorableCount} Favorable</span> &bull;{' '}
                <span className="text-rose-600">{unfavorableCount} Unfavorable</span> &bull;{' '}
                <span className="text-amber-600">{neutralCount} Neutral</span>
                {unknownCount > 0 && <> &bull; <span className="text-slate-500">{unknownCount} Unknown</span></>}
              </div>
            </div>
          </div>
          {caseInfo.summary && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Case Summary</div>
              <p className="text-sm text-slate-700 leading-relaxed" data-testid="text-case-summary">{caseInfo.summary}</p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 no-print-controls">
            <button
              onClick={() => setPanelCollapsed(!panelCollapsed)}
              data-testid="button-toggle-panel"
              className="text-lg font-bold text-slate-900 flex items-center hover:text-slate-700 transition-colors"
            >
              <Users className="w-5 h-5 mr-2 text-slate-500" />
              Complete Juror Panel ({jurors.length})
              {panelCollapsed ? (
                <ChevronDown className="w-5 h-5 ml-2 text-slate-400" />
              ) : (
                <ChevronUp className="w-5 h-5 ml-2 text-slate-400" />
              )}
            </button>
            {!panelCollapsed && (
              <button
                onClick={handleGenerateSummaries}
                disabled={isGenerating}
                data-testid="button-generate-summaries"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Summaries...
                  </>
                ) : Object.keys(aiSummaries).length > 0 ? (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Regenerate AI Summaries
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Summaries
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence>
            {!panelCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_1fr_100px_100px_60px] md:grid-cols-[60px_1.5fr_1fr_100px_100px_2fr_60px] gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 items-center">
              <SortHeader field="number" label="#" />
              <SortHeader field="name" label="Name" />
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupation</div>
              <SortHeader field="lean" label="Lean" />
              <SortHeader field="riskTier" label="Risk" />
              <div className="hidden md:block text-xs font-bold text-slate-500 uppercase tracking-wider">AI Summary</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Resp</div>
            </div>

            {sortedJurors.map(juror => {
              const isStruckPlaintiff = plaintiffStrikes.has(juror.number);
              const isStruckDefense = defenseStrikes.has(juror.number);
              const isStruck = isStruckPlaintiff || isStruckDefense;

              return (
              <div key={juror.number} className={`border-b border-slate-100 last:border-b-0 print-juror-row ${isStruck ? 'bg-rose-50/40' : ''}`}>
                <button
                  onClick={() => setExpandedJuror(expandedJuror === juror.number ? null : juror.number)}
                  data-testid={`button-expand-juror-${juror.number}`}
                  className={`w-full grid grid-cols-[60px_1fr_1fr_100px_100px_60px] md:grid-cols-[60px_1.5fr_1fr_100px_100px_2fr_60px] gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center text-left ${isStruck ? 'opacity-60' : ''}`}
                >
                  <div className="font-bold text-slate-900" data-testid={`text-juror-number-${juror.number}`}>
                    #{juror.number}
                  </div>
                  <div>
                    <div className={`font-semibold text-slate-900 text-sm ${isStruck ? 'line-through' : ''}`} data-testid={`text-juror-name-${juror.number}`}>
                      {juror.name}
                    </div>
                    <div className="text-xs text-slate-500">{juror.sex}/{juror.race}</div>
                    {isStruck && (
                      <span className="text-[10px] font-bold uppercase text-rose-600">
                        Struck by {isStruckPlaintiff ? plaintiffLabel : 'Defense'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 truncate" data-testid={`text-juror-occupation-${juror.number}`}>
                    {juror.occupation}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold capitalize ${getLeanBadge(juror.lean)}`} data-testid={`badge-lean-${juror.number}`}>
                      {juror.lean}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold capitalize ${getRiskBadge(juror.riskTier)}`} data-testid={`badge-risk-${juror.number}`}>
                      {juror.riskTier}
                    </span>
                  </div>
                  <div className="hidden md:block text-xs text-slate-600 truncate" data-testid={`text-ai-summary-${juror.number}`}>
                    {isGenerating ? (
                      <span className="text-violet-500 italic">Generating...</span>
                    ) : aiSummaries[juror.number] ? (
                      aiSummaries[juror.number]
                    ) : (
                      <span className="text-slate-400 italic">--</span>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-slate-600" data-testid={`text-response-count-${juror.number}`}>
                      {juror.jurorResponses.length}
                    </span>
                    {expandedJuror === juror.number ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 mx-auto mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 mx-auto mt-0.5" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedJuror === juror.number && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-4 print-expanded">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">DOB</span>
                            <div className="text-slate-800">{juror.birthDate}</div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">Employer</span>
                            <div className="text-slate-800">{juror.employer}</div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">Location</span>
                            <div className="text-slate-800">{juror.cityStateZip}</div>
                          </div>
                          {juror.notes && (
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase">Notes</span>
                              <div className="text-slate-800">{juror.notes}</div>
                            </div>
                          )}
                        </div>

                        {aiSummaries[juror.number] && (
                          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Brain className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-slate-800 leading-relaxed">{aiSummaries[juror.number]}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1.5" />
                            Responses ({juror.jurorResponses.length})
                          </h5>
                          {juror.jurorResponses.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No responses recorded.</p>
                          ) : (
                            <div className="space-y-2">
                              {juror.jurorResponses.map((r, idx) => (
                                <div key={r.id || idx} className="bg-white rounded-lg border border-slate-200 p-3">
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.side === 'yours' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {r.side === 'yours' ? 'Your Side' : 'Opposing'}
                                    </span>
                                    {r.questionId === null && r.side === 'yours' && r.questionSummary && (
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">New</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mb-1 font-medium">{getQuestionText(r)}</p>
                                  <p className="text-sm text-slate-800">{r.responseText}</p>
                                  {r.followUps && r.followUps.length > 0 && (
                                    <div className="mt-2 pl-3 border-l-2 border-violet-200 space-y-1">
                                      {r.followUps.map((fu, fi) => (
                                        <div key={fi}>
                                          {fu.question ? (
                                            <p className="text-xs text-violet-600 font-medium">Follow-up: {fu.question}</p>
                                          ) : (
                                            <p className="text-xs text-violet-400 font-medium">Follow-up response</p>
                                          )}
                                          <p className="text-xs text-slate-700">{fu.answer}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
            })}
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setPeremptoryCollapsed(p => !p)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            data-testid="toggle-peremptory-strikes"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Gavel className="w-5 h-5 mr-2 text-slate-500" />
              Peremptory Strikes
            </h3>
            {peremptoryCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
          </button>
          <AnimatePresence initial={false}>
            {!peremptoryCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
                <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  {plaintiffLabel} Strikes
                </h4>
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full" data-testid="count-plaintiff-strikes">
                  {plaintiffStrikes.size}
                </span>
              </div>
              <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
                {sortedJurors.map(juror => {
                  const isStruckHere = plaintiffStrikes.has(juror.number);
                  const isStruckOther = defenseStrikes.has(juror.number);
                  return (
                    <button
                      key={juror.number}
                      onClick={() => toggleStrike('plaintiff', juror.number)}
                      disabled={isStruckOther}
                      data-testid={`strike-plaintiff-${juror.number}`}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                        isStruckHere
                          ? 'bg-blue-100 text-blue-900 font-semibold border border-blue-300'
                          : isStruckOther
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className={isStruckHere ? '' : ''}>
                        <span className="font-bold mr-1.5">#{juror.number}</span>
                        <span className={isStruckHere ? 'line-through' : ''}>{juror.name}</span>
                      </span>
                      {isStruckHere && (
                        <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Struck</span>
                      )}
                      {isStruckOther && (
                        <span className="text-[10px] italic text-slate-400">Struck by Defense</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
              <div className="bg-rose-50 px-4 py-3 border-b border-rose-200 flex items-center justify-between">
                <h4 className="font-bold text-sm text-rose-900 flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Defense Strikes
                </h4>
                <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full" data-testid="count-defense-strikes">
                  {defenseStrikes.size}
                </span>
              </div>
              <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
                {sortedJurors.map(juror => {
                  const isStruckHere = defenseStrikes.has(juror.number);
                  const isStruckOther = plaintiffStrikes.has(juror.number);
                  return (
                    <button
                      key={juror.number}
                      onClick={() => toggleStrike('defense', juror.number)}
                      disabled={isStruckOther}
                      data-testid={`strike-defense-${juror.number}`}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                        isStruckHere
                          ? 'bg-rose-100 text-rose-900 font-semibold border border-rose-300'
                          : isStruckOther
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        <span className="font-bold mr-1.5">#{juror.number}</span>
                        <span className={isStruckHere ? 'line-through' : ''}>{juror.name}</span>
                      </span>
                      {isStruckHere && (
                        <span className="text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Struck</span>
                      )}
                      {isStruckOther && (
                        <span className="text-[10px] italic text-slate-400">Struck by {plaintiffLabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setBatsonCollapsed(p => !p)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            data-testid="toggle-batson-check"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-violet-500" />
              Batson Challenge Check
            </h3>
            <div className="flex items-center gap-2">
              {batsonResult && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    batsonResult.overallRisk === 'High' ? 'bg-rose-100 text-rose-700' :
                    batsonResult.overallRisk === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}
                  data-testid="text-batson-risk"
                >
                  {batsonResult.overallRisk} Risk
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleBatsonCheck(); }}
                disabled={isAnalyzingBatson || (plaintiffStrikes.size === 0 && defenseStrikes.size === 0)}
                data-testid="button-batson-check"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isAnalyzingBatson ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    {batsonResult ? 'Re-Check' : 'Batson Check'}
                  </>
                )}
              </button>
              {batsonCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
            </div>
          </button>
          <AnimatePresence initial={false}>
            {!batsonCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  {batsonError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-rose-50 border border-rose-200 text-rose-700 mb-4" data-testid="text-batson-error">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {batsonError}
                    </div>
                  )}

                  {!batsonResult && !isAnalyzingBatson && !batsonError && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500" data-testid="text-batson-empty">
                      Mark peremptory strikes above, then click <span className="font-semibold text-violet-600">Batson Check</span> to analyze strike patterns for potential Batson v. Kentucky challenges.
                    </div>
                  )}

                  {batsonResult && (
                    <div className="space-y-4">
                      <div className={`rounded-xl border p-4 ${
                        batsonResult.overallRisk === 'High' ? 'bg-rose-50 border-rose-200' :
                        batsonResult.overallRisk === 'Moderate' ? 'bg-amber-50 border-amber-200' :
                        'bg-emerald-50 border-emerald-200'
                      }`} data-testid="text-batson-summary">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-bold ${
                            batsonResult.overallRisk === 'High' ? 'text-rose-800' :
                            batsonResult.overallRisk === 'Moderate' ? 'text-amber-800' :
                            'text-emerald-800'
                          }`}>
                            Overall Risk: {batsonResult.overallRisk}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          batsonResult.overallRisk === 'High' ? 'text-rose-700' :
                          batsonResult.overallRisk === 'Moderate' ? 'text-amber-700' :
                          'text-emerald-700'
                        }`}>
                          {batsonResult.summary}
                        </p>
                      </div>

                      {batsonResult.defensive.length > 0 && (
                        <div className="rounded-xl border border-rose-200 overflow-hidden" data-testid="batson-defensive-section">
                          <div className="bg-rose-50 px-4 py-3 border-b border-rose-200">
                            <h4 className="font-bold text-sm text-rose-900 flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4" />
                              Your Strikes — Vulnerability Analysis
                              <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{batsonResult.defensive.length}</span>
                            </h4>
                          </div>
                          <div className="divide-y divide-rose-100">
                            {batsonResult.defensive.map((d, i) => (
                              <div key={i} className="p-4 bg-white" data-testid={`batson-defensive-${d.jurorNumber}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm text-slate-900">
                                    #{d.jurorNumber} {d.jurorName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{d.protectedClass}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      d.riskLevel === 'High' ? 'bg-rose-100 text-rose-700' :
                                      d.riskLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>{d.riskLevel}</span>
                                  </div>
                                </div>
                                {d.statisticalFlag && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statistical Pattern</span>
                                    <p className="text-sm text-slate-700 mt-0.5">{d.statisticalFlag}</p>
                                  </div>
                                )}
                                {d.comparativeConcern && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comparative Concern</span>
                                    <p className="text-sm text-slate-700 mt-0.5">{d.comparativeConcern}</p>
                                  </div>
                                )}
                                {d.currentJustification && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Justification</span>
                                    <p className="text-sm text-slate-600 italic mt-0.5">{d.currentJustification}</p>
                                  </div>
                                )}
                                {d.recommendedArticulation && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Recommended Articulation</span>
                                    <div className="mt-1 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                      <p className="text-sm text-emerald-800">{d.recommendedArticulation}</p>
                                    </div>
                                  </div>
                                )}
                                {d.warning && (
                                  <div className="mt-2 p-3 bg-rose-50 border border-rose-300 rounded-lg">
                                    <p className="text-sm font-semibold text-rose-800 flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      {d.warning}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {batsonResult.offensive.length > 0 && (
                        <div className="rounded-xl border border-blue-200 overflow-hidden" data-testid="batson-offensive-section">
                          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                            <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                              <Gavel className="w-4 h-4" />
                              Their Strikes — Challenge Opportunities
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{batsonResult.offensive.length}</span>
                            </h4>
                          </div>
                          <div className="divide-y divide-blue-100">
                            {batsonResult.offensive.map((o, i) => (
                              <div key={i} className="p-4 bg-white" data-testid={`batson-offensive-${o.jurorNumber}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm text-slate-900">
                                    #{o.jurorNumber} {o.jurorName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{o.protectedClass}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      o.strengthOfChallenge === 'Strong' ? 'bg-emerald-100 text-emerald-700' :
                                      o.strengthOfChallenge === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{o.strengthOfChallenge}</span>
                                  </div>
                                </div>
                                {o.statisticalPattern && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statistical Pattern</span>
                                    <p className="text-sm text-slate-700 mt-0.5">{o.statisticalPattern}</p>
                                  </div>
                                )}
                                {o.comparativeEvidence && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comparative Evidence</span>
                                    <p className="text-sm text-slate-700 mt-0.5">{o.comparativeEvidence}</p>
                                  </div>
                                )}
                                {o.suggestedArgument && (
                                  <div className="mb-2">
                                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Courtroom Argument</span>
                                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-sm text-blue-800">{o.suggestedArgument}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {batsonResult.defensive.length === 0 && batsonResult.offensive.length === 0 && (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6 text-center" data-testid="text-batson-clean">
                          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-emerald-700">No Batson concerns identified in the current strike pattern.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            onClick={() => setCauseCollapsed(p => !p)}
            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
            data-testid="toggle-cause-strikes"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Scale className="w-5 h-5 mr-2 text-indigo-500" />
              Strikes for Cause
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleAnalyzeCauseStrikes(); }}
                disabled={isAnalyzingCause || jurors.length === 0}
                data-testid="button-analyze-cause-strikes"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isAnalyzingCause ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    {causeStrikes.length > 0 ? 'Re-Analyze' : 'Analyze'}
                  </>
                )}
              </button>
              {causeCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {!causeCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
          {causeAnalysisError && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-rose-50 border border-rose-200 text-rose-700 mb-4" data-testid="text-cause-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {causeAnalysisError}
            </div>
          )}

          {causeStrikes.length === 0 && !isAnalyzingCause && !causeAnalysisError && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500" data-testid="text-cause-empty">
              Click <span className="font-semibold text-indigo-600">Analyze</span> to evaluate all jurors for potential cause challenges using AI.
            </div>
          )}

          {causeStrikes.length > 0 && (
            <div className="space-y-4">
              {([
                { key: 'Highly Likely', icon: ShieldCheck, borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50', headerBg: 'bg-emerald-100', textColor: 'text-emerald-900', badgeBg: 'bg-emerald-200', badgeText: 'text-emerald-800', basisBg: 'bg-emerald-100', basisText: 'text-emerald-700' },
                { key: 'Possible', icon: ShieldQuestion, borderColor: 'border-amber-300', bgColor: 'bg-amber-50', headerBg: 'bg-amber-100', textColor: 'text-amber-900', badgeBg: 'bg-amber-200', badgeText: 'text-amber-800', basisBg: 'bg-amber-100', basisText: 'text-amber-700' },
                { key: 'Unlikely', icon: ShieldOff, borderColor: 'border-slate-200', bgColor: 'bg-slate-50', headerBg: 'bg-slate-100', textColor: 'text-slate-700', badgeBg: 'bg-slate-200', badgeText: 'text-slate-600', basisBg: 'bg-slate-100', basisText: 'text-slate-600' },
              ] as const).map(({ key, icon: Icon, borderColor, bgColor, headerBg, textColor, badgeBg, badgeText, basisBg, basisText }) => {
                const items = causeByCategory[key] || [];
                if (items.length === 0) return null;
                const isCatCollapsed = collapsedCauseCategories.has(key);
                return (
                  <div key={key} className={`rounded-xl border ${borderColor} overflow-hidden shadow-sm`} data-testid={`cause-category-${key.toLowerCase().replace(/\s+/g, '-')}`}>
                    <button
                      onClick={() => toggleCauseCategory(key)}
                      className={`w-full ${headerBg} px-4 py-3 flex items-center justify-between`}
                      data-testid={`toggle-cause-${key.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${textColor}`} />
                        <span className={`font-bold text-sm ${textColor}`}>{key}</span>
                        <span className={`text-xs font-bold ${badgeText} ${badgeBg} px-2 py-0.5 rounded-full`}>
                          {items.length}
                        </span>
                      </div>
                      {isCatCollapsed ? (
                        <ChevronDown className={`w-4 h-4 ${textColor}`} />
                      ) : (
                        <ChevronUp className={`w-4 h-4 ${textColor}`} />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {!isCatCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className={`${bgColor} divide-y ${borderColor}`}>
                            {items.map(strike => {
                              const juror = jurors.find(j => j.number === strike.jurorNumber);
                              const showScript = strike.category === 'Highly Likely' || strike.category === 'Possible';
                              return (
                                <div key={strike.jurorNumber} className="px-4 py-3" data-testid={`cause-strike-${strike.jurorNumber}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-sm text-slate-900">
                                      #{strike.jurorNumber} {juror?.name || 'Unknown'}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase ${basisText} ${basisBg} px-2 py-0.5 rounded-full`}>
                                      {strike.basis}
                                    </span>
                                  </div>
                                  {strike.reasoning && (
                                    <div className="mb-2">
                                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide">Analysis</div>
                                      <p className="text-sm text-slate-600 leading-relaxed italic">
                                        {strike.reasoning}
                                      </p>
                                    </div>
                                  )}
                                  {showScript ? (
                                    <div>
                                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide">Courtroom Argument</div>
                                      <div className="bg-white/60 border border-slate-200 rounded-lg p-3">
                                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                          {strike.argument}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                      {strike.argument}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setStrikeOrderCollapsed(p => !p)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            data-testid="toggle-strike-order"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-rose-500" />
              Suggested Strike Order
            </h3>
            {strikeOrderCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
          </button>
          <AnimatePresence initial={false}>
            {!strikeOrderCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
          {strikeOrder.length === 0 ? (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              No strike recommendations based on current classifications.
            </div>
          ) : (
            <div className="space-y-3">
              {strikeOrder.map((juror, index) => (
                <div
                  key={juror.number}
                  className="bg-white rounded-xl border-l-4 border-l-rose-500 border-y border-r border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3"
                  data-testid={`strike-order-${juror.number}`}
                >
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 bg-rose-50 rounded-lg text-rose-700 font-black text-lg">
                    {index + 1}
                  </div>
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-xl font-black text-slate-900">#{juror.number}</div>
                  </div>
                  <div className="flex-1 border-l border-slate-100 pl-3">
                    <h4 className="font-bold text-slate-900 text-sm">{juror.name}</h4>
                    <p className="text-xs text-slate-600">{juror.occupation}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getLeanBadge(juror.lean)}`}>
                        {juror.lean}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${getRiskBadge(juror.riskTier)}`}>
                        {juror.riskTier} risk
                      </span>
                    </div>
                    {aiSummaries[juror.number] && (
                      <p className="text-xs text-slate-600 mt-2 italic flex items-start gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-500 mt-0.5 flex-shrink-0" />
                        {aiSummaries[juror.number]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="space-y-4 pt-8 border-t border-slate-200 no-print-controls">
          {mmSendResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
              mmSendResult === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {mmSendResult === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {mmSendMessage}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.print()}
              data-testid="button-download-pdf"
              className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download as PDF
            </button>

            {isMattrMindrConnected && mattrmindrCaseId && (
              <button
                onClick={handleSendToMattrMindr}
                disabled={isSendingToMm}
                data-testid="button-send-mattrmindr"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
              >
                {isSendingToMm ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send to MattrMindr
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
