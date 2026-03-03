import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { CaseInfo, Juror, JurorResponse, VoirDireQuestion } from '../../types';
import * as api from '../../lib/api';

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
}

export function EndReport({
  caseInfo,
  jurors,
  responses,
  questions,
  mattrmindrCaseId,
  isMattrMindrConnected,
}: EndReportProps) {
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedJuror, setExpandedJuror] = useState<number | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingToMm, setIsSendingToMm] = useState(false);
  const [mmSendResult, setMmSendResult] = useState<'success' | 'error' | null>(null);
  const [mmSendMessage, setMmSendMessage] = useState('');

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

      await api.pushJuryAnalysisToMattrMindr(mattrmindrCaseId, {
        jurors: jurorData,
        strikeStrategy,
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
    } catch (err) {
      console.error('Failed to generate summaries:', err);
    } finally {
      setIsGenerating(false);
    }
  };

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
              <div className="font-medium text-slate-900 capitalize" data-testid="text-side">{caseInfo.side}</div>
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
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-slate-500" />
              Complete Juror Panel ({jurors.length})
            </h3>
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
          </div>

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

            {sortedJurors.map(juror => (
              <div key={juror.number} className="border-b border-slate-100 last:border-b-0 print-juror-row">
                <button
                  onClick={() => setExpandedJuror(expandedJuror === juror.number ? null : juror.number)}
                  data-testid={`button-expand-juror-${juror.number}`}
                  className="w-full grid grid-cols-[60px_1fr_1fr_100px_100px_60px] md:grid-cols-[60px_1.5fr_1fr_100px_100px_2fr_60px] gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center text-left"
                >
                  <div className="font-bold text-slate-900" data-testid={`text-juror-number-${juror.number}`}>
                    #{juror.number}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm" data-testid={`text-juror-name-${juror.number}`}>
                      {juror.name}
                    </div>
                    <div className="text-xs text-slate-500">{juror.sex}/{juror.race}</div>
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
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
            <Target className="w-5 h-5 mr-2 text-rose-500" />
            Suggested Strike Order
          </h3>

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
