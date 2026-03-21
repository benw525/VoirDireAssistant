import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  MessageSquare,
  Brain,
  Loader2,
  X,
  Globe,
  Search } from
'lucide-react';
import { Juror, JurorResponse, VoirDireQuestion, CaseInfo } from '../../types';
import * as api from '../../lib/api';
import { ReactionText } from './ReactionText';
interface JurorReviewProps {
  jurors: Juror[];
  responses: JurorResponse[];
  questions: VoirDireQuestion[];
  caseInfo: CaseInfo;
  onUpdateJuror: (jurorNumber: number, updates: Partial<Juror>) => void;
  onProceed: () => void;
  activeCaseId?: string | null;
}
export function JurorReview({
  jurors,
  responses,
  questions,
  caseInfo,
  onUpdateJuror,
  onProceed,
  activeCaseId
}: JurorReviewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [filterLean, setFilterLean] = useState<string>('all');
  const [selectedJuror, setSelectedJuror] = useState<Juror | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    jurors.forEach(j => { if (j.aiAnalysis) initial[j.number] = j.aiAnalysis; });
    return initial;
  });
  const [analyzingJuror, setAnalyzingJuror] = useState<number | null>(null);
  const [batchAnalyzing, setBatchAnalyzing] = useState<{ current: number; total: number; jurorNum: number } | null>(null);
  const batchCancelRef = React.useRef(false);
  const pendingLeanAnalysis = React.useRef<Juror | null>(null);
  const [failedAnalyses, setFailedAnalyses] = useState<Set<number>>(new Set());
  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    enrichedJurors: Set<number>;
    pending: number;
    total: number;
    isRunning: boolean;
  }>({ enrichedJurors: new Set(), pending: 0, total: 0, isRunning: false });

  const fetchEnrichmentStatus = useCallback(async () => {
    if (!activeCaseId) return;
    try {
      const status = await api.getEnrichmentStatus(activeCaseId);
      const enrichedNums = new Set<number>();
      status.items.forEach(item => {
        if (item.status === 'completed' && item.hasData) {
          enrichedNums.add(item.jurorNumber);
        }
      });
      setEnrichmentStatus({
        enrichedJurors: enrichedNums,
        pending: status.summary.pending + status.summary.dispatched,
        total: status.summary.total,
        isRunning: status.summary.pending > 0 || status.summary.dispatched > 0,
      });
    } catch {
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchEnrichmentStatus();
    const interval = setInterval(fetchEnrichmentStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchEnrichmentStatus]);

  const runAnalysis = async (juror: Juror) => {
    setAnalyzingJuror(juror.number);
    try {
      const jurorResponses = responses.filter(r => r.jurorNumber === juror.number);
      const result = await api.analyzeJuror(caseInfo, juror, jurorResponses, questions, activeCaseId);
      setAiAnalysis(prev => ({ ...prev, [juror.number]: result.analysis }));
      setFailedAnalyses(prev => { const n = new Set(prev); n.delete(juror.number); return n; });
      const jurorUpdates: Partial<Juror> = {
        aiAnalysis: result.analysis,
        riskScore: result.riskScore,
        aiRiskTier: result.aiRiskTier,
      };
      if (juror.lean === 'unknown' && result.suggestedLean !== 'unknown') {
        jurorUpdates.lean = result.suggestedLean;
        jurorUpdates.leanConfidence = result.leanConfidence;
      }
      if (juror.leanConfidence === 'none') {
        jurorUpdates.leanConfidence = result.leanConfidence;
      }
      onUpdateJuror(juror.number, jurorUpdates);
      return true;
    } catch (err) {
      console.error('Failed to analyze juror:', err);
      setFailedAnalyses(prev => new Set(prev).add(juror.number));
      return false;
    } finally {
      setAnalyzingJuror(null);
    }
  };

  const handleAnalyzeJuror = async (juror: Juror) => {
    if (analyzingJuror !== null) return;
    await runAnalysis(juror);
    if (pendingLeanAnalysis.current) {
      const queued = pendingLeanAnalysis.current;
      pendingLeanAnalysis.current = null;
      await runAnalysis(queued);
    }
  };

  const handleAnalyzeAll = async () => {
    if (analyzingJuror !== null || batchAnalyzing !== null) return;
    const jurorsNeedingAnalysis = jurors.filter(j => !aiAnalysis[j.number] || failedAnalyses.has(j.number));
    if (jurorsNeedingAnalysis.length === 0) return;
    batchCancelRef.current = false;
    const total = jurorsNeedingAnalysis.length;
    for (let i = 0; i < jurorsNeedingAnalysis.length; i++) {
      if (batchCancelRef.current) break;
      const juror = jurorsNeedingAnalysis[i];
      setBatchAnalyzing({ current: i + 1, total, jurorNum: juror.number });
      await runAnalysis(juror);
    }
    setBatchAnalyzing(null);
  };

  const hasRealAnalysis = (jurorNumber: number) => aiAnalysis[jurorNumber] && !failedAnalyses.has(jurorNumber);
  const allAnalyzed = jurors.every(j => hasRealAnalysis(j.number));
  const unanalyzedCount = jurors.filter(j => !hasRealAnalysis(j.number)).length;

  const handleLeanChangeWithAutoAnalysis = (juror: Juror, newLean: string) => {
    onUpdateJuror(juror.number, { lean: newLean as any });
    setSelectedJuror({ ...juror, lean: newLean as any });
    if (newLean !== 'unknown' && !hasRealAnalysis(juror.number)) {
      const updatedJuror = { ...juror, lean: newLean as any };
      if (analyzingJuror !== null) {
        pendingLeanAnalysis.current = updatedJuror;
      } else {
        handleAnalyzeJuror(updatedJuror);
      }
    }
  };

  // Calculate stats dynamically
  const jurorsWithStats = useMemo(() => {
    return jurors.map((juror) => {
      const jurorResponses = responses.filter(
        (r) => r.jurorNumber === juror.number
      );
      return {
        ...juror,
        responseCount: jurorResponses.length,
        jurorResponses
      };
    });
  }, [jurors, responses]);
  const filteredJurors = useMemo(() => {
    if (filterLean === 'all') return jurorsWithStats;
    return jurorsWithStats.filter((j) => j.lean === filterLean);
  }, [jurorsWithStats, filterLean]);
  const getLeanColor = (lean: string) => {
    switch (lean) {
      case 'favorable':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'unfavorable':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'neutral':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };
  const getLeanIcon = (lean: string) => {
    switch (lean) {
      case 'favorable':
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'unfavorable':
        return <AlertTriangle className="w-4 h-4 mr-1" />;
      case 'neutral':
        return <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />;
      default:
        return <HelpCircle className="w-4 h-4 mr-1" />;
    }
  };
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col relative">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Phase 5: Review & Strategy
          </h2>
          <p className="text-slate-600 mt-1">
            Analyze psychological profiles, leans, and risk tiers to form strike
            strategy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg border border-slate-200 p-1 flex shadow-sm">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'board' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>

              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>

              <List className="w-4 h-4" />
            </button>
          </div>

          <select
            value={filterLean}
            onChange={(e) => setFilterLean(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500">

            <option value="all">All Leans</option>
            <option value="favorable">Favorable</option>
            <option value="neutral">Neutral</option>
            <option value="unfavorable">Unfavorable</option>
            <option value="unknown">Unknown</option>
          </select>

          {batchAnalyzing ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm" data-testid="batch-analysis-progress">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              <span className="font-medium text-violet-700">
                Analyzing juror {batchAnalyzing.current} of {batchAnalyzing.total}...
              </span>
              <button
                onClick={() => { batchCancelRef.current = true; }}
                className="ml-1 text-xs text-violet-500 hover:text-violet-700 underline"
                data-testid="button-cancel-batch"
              >
                {batchCancelRef.current ? 'Stopping after current...' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleAnalyzeAll}
              disabled={analyzingJuror !== null || allAnalyzed}
              data-testid="button-analyze-all"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Brain className="w-4 h-4 mr-2" />
              {allAnalyzed ? 'All Analyzed' : `Analyze All (${unanalyzedCount})`}
            </button>
          )}

          <button
            onClick={onProceed}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm">

            End & Report <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {(() => {
        if (jurors.length <= 5) return null;
        const threshold = Math.ceil(jurors.length * 0.6);
        const tierCounts: Record<string, number> = {};
        jurors.forEach(j => { tierCounts[j.riskTier] = (tierCounts[j.riskTier] || 0) + 1; });
        const dominant = Object.entries(tierCounts).find(([, count]) => count >= threshold);
        if (dominant) {
          const [tier, count] = dominant;
          return (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm shrink-0" data-testid="banner-tier-imbalance">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="font-semibold text-rose-800">{count} of {jurors.length} jurors are at {tier.charAt(0).toUpperCase() + tier.slice(1)} risk.</span>
                <span className="text-rose-700 ml-1">
                  When most jurors share the same tier, it becomes harder to prioritize strikes. Consider reclassifying some to create a more useful gradient. Use "Analyze All" to get AI-recommended tiers based on individual risk scores.
                </span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {enrichmentStatus.isRunning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm shrink-0" data-testid="banner-enrichment-pending">
          <Search className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className="font-semibold text-amber-800">Background research in progress</span>
            <span className="text-amber-700 ml-1">
              ({enrichmentStatus.total - enrichmentStatus.pending}/{enrichmentStatus.total} jurors complete).
              AI analysis will be more thorough after enrichment finishes — jurors with completed research show a green "Enriched" badge.
            </span>
          </div>
        </div>
      )}

      {(() => {
        if (jurors.length <= 5) return null;
        const neutralCount = jurors.filter(j => j.lean === 'neutral').length;
        const unknownCount = jurors.filter(j => j.lean === 'unknown').length;
        const favCount = jurors.filter(j => j.lean === 'favorable').length;
        const unfavCount = jurors.filter(j => j.lean === 'unfavorable').length;
        const allClassified = unknownCount === 0;
        const noneNeutral = neutralCount === 0 && allClassified;
        return (
          <div className="mb-4 shrink-0">
            <div className="flex items-center gap-3 text-xs" data-testid="lean-distribution-bar">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold">{favCount} Favorable</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold">{neutralCount} Neutral</span>
              <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded font-semibold">{unfavCount} Unfavorable</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{unknownCount} Unknown</span>
            </div>
            {noneNeutral && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-sm" data-testid="banner-lean-review">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="font-semibold text-blue-800">Every juror is classified as either favorable or unfavorable.</span>
                  <span className="text-blue-700 ml-1">
                    Some voir dire panels have genuinely ambiguous jurors. Would you like to review your classifications? Consider marking jurors with mixed signals as Neutral.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6">
        {viewMode === 'board' ?
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}>

            {filteredJurors.map((juror) =>
          <div
            key={juror.number}
            onClick={() => setSelectedJuror(juror)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col">

                <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">
                      #{juror.number}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm truncate max-w-[120px]">
                        {juror.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">
                        {juror.occupation}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div
                  className={`px-2 py-1 rounded text-xs font-bold border flex items-center capitalize ${getLeanColor(juror.lean)}`}>
                      {getLeanIcon(juror.lean)}
                      {juror.lean}
                    </div>
                    {juror.leanConfidence && juror.leanConfidence !== 'none' && (
                      <span className={`text-[10px] capitalize ${juror.leanConfidence === 'high' ? 'text-emerald-500' : juror.leanConfidence === 'moderate' ? 'text-amber-500' : 'text-slate-400'}`}>
                        {juror.leanConfidence} conf.
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Risk
                    </span>
                    <div className="flex items-center gap-1.5">
                      {juror.riskScore > 0 && (
                        <span className={`text-xs font-black tabular-nums ${juror.riskScore >= 70 ? 'text-rose-600' : juror.riskScore >= 35 ? 'text-amber-600' : 'text-emerald-600'}`} data-testid={`score-${juror.number}`}>
                          {juror.riskScore}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${juror.riskTier === 'high' ? 'bg-rose-100 text-rose-700' : juror.riskTier === 'medium' ? 'bg-amber-100 text-amber-700' : juror.riskTier === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {juror.riskTier}
                      </span>
                      {juror.aiRiskTier && juror.aiRiskTier !== 'unassessed' && juror.aiRiskTier !== juror.riskTier && (
                        <span className="text-[10px] text-slate-400" title={`AI recommends: ${juror.aiRiskTier}`}>
                          (AI: {juror.aiRiskTier})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Responses
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {juror.responseCount}
                      </span>
                      {(() => {
                        const totalResponses = juror.jurorResponses.length;
                        const verbalResponses = juror.jurorResponses.filter(r => !r.responseText.startsWith('['));
                        const totalChars = juror.jurorResponses.reduce((sum, r) => sum + r.responseText.length, 0);
                        if (totalResponses < 2 || (verbalResponses.length === 0 && totalChars < 150)) {
                          return (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" data-testid={`thin-data-${juror.number}`} title="Assessment based primarily on demographics and reactions">
                              Limited data
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Research
                    </span>
                    {enrichmentStatus.enrichedJurors.has(juror.number) ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center" data-testid={`badge-enriched-${juror.number}`}>
                        <Globe className="w-3 h-3 mr-1" />
                        Enriched
                      </span>
                    ) : enrichmentStatus.isRunning ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-600 flex items-center">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-500">
                        —
                      </span>
                    )}
                  </div>
                </div>
              </div>
          )}
          </motion.div> :

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16">#</th>
                  <th className="px-4 py-3 font-semibold">
                    Name / Demographics
                  </th>
                  <th className="px-4 py-3 font-semibold">Lean</th>
                  <th className="px-4 py-3 font-semibold">Risk Tier</th>
                  <th className="px-4 py-3 font-semibold text-center">
                    Responses
                  </th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJurors.map((juror) =>
              <tr
                key={juror.number}
                className="hover:bg-slate-50 transition-colors">

                    <td className="px-4 py-4 font-bold text-slate-900 text-lg">
                      #{juror.number}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {juror.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {juror.sex} • {juror.race} • {juror.occupation}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <div
                      className={`inline-flex px-2 py-1 rounded text-xs font-bold border capitalize items-center ${getLeanColor(juror.lean)}`}>
                          {juror.lean}
                        </div>
                        {juror.leanConfidence && juror.leanConfidence !== 'none' && (
                          <span className={`text-[10px] capitalize ${juror.leanConfidence === 'high' ? 'text-emerald-500' : juror.leanConfidence === 'moderate' ? 'text-amber-500' : 'text-slate-400'}`}>
                            {juror.leanConfidence}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                    className={`text-xs font-bold px-2 py-1 rounded capitalize ${juror.riskTier === 'high' ? 'bg-rose-100 text-rose-700' : juror.riskTier === 'medium' ? 'bg-amber-100 text-amber-700' : juror.riskTier === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>

                        {juror.riskTier}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-700">
                      {juror.responseCount}
                    </td>
                    <td className="px-4 py-4">
                      <button
                    onClick={() => setSelectedJuror(juror)}
                    className="text-amber-600 hover:text-amber-700 font-medium text-sm">

                        Details
                      </button>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Juror Detail Modal */}
      {selectedJuror &&
      <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 20
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-inner">
                  #{selectedJuror.number}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedJuror.name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {selectedJuror.occupation} at {selectedJuror.employer}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedJuror.sex} • {selectedJuror.race} • DOB:{' '}
                    {selectedJuror.birthDate}
                  </p>
                </div>
              </div>
              <button
              onClick={() => setSelectedJuror(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">

                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Assessment Controls */}
              <div className="grid grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Lean Assessment
                  </label>
                  <select
                  data-testid={`select-lean-${selectedJuror.number}`}
                  value={selectedJuror.lean}
                  onChange={(e) => handleLeanChangeWithAutoAnalysis(selectedJuror, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-bold capitalize focus:ring-2 focus:ring-amber-500 outline-none ${getLeanColor(selectedJuror.lean)}`}>

                    <option value="favorable">Favorable</option>
                    <option value="neutral">Neutral</option>
                    <option value="unfavorable">Unfavorable</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Confidence
                  </label>
                  <select
                    data-testid={`select-confidence-${selectedJuror.number}`}
                    value={selectedJuror.leanConfidence}
                    onChange={(e) => {
                      const val = e.target.value as Juror['leanConfidence'];
                      onUpdateJuror(selectedJuror.number, { leanConfidence: val });
                      setSelectedJuror({ ...selectedJuror, leanConfidence: val });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-bold capitalize bg-white focus:ring-2 focus:ring-amber-500 outline-none ${selectedJuror.leanConfidence === 'high' ? 'text-emerald-700 border-emerald-300' : selectedJuror.leanConfidence === 'moderate' ? 'text-amber-700 border-amber-300' : selectedJuror.leanConfidence === 'low' ? 'text-slate-500 border-slate-300' : 'text-slate-400 border-slate-200'}`}>
                    <option value="none">Not Set</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Risk Tier {selectedJuror.aiRiskTier && selectedJuror.aiRiskTier !== 'unassessed' && selectedJuror.aiRiskTier !== selectedJuror.riskTier && (
                      <span className="text-amber-500 normal-case font-normal">(AI: {selectedJuror.aiRiskTier})</span>
                    )}
                  </label>
                  <select
                  value={selectedJuror.riskTier}
                  onChange={(e) => {
                    onUpdateJuror(selectedJuror.number, {
                      riskTier: e.target.value as any
                    });
                    setSelectedJuror({
                      ...selectedJuror,
                      riskTier: e.target.value as any
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold capitalize bg-white focus:ring-2 focus:ring-amber-500 outline-none">

                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                    <option value="unassessed">Unassessed</option>
                  </select>
                </div>
              </div>

              {selectedJuror.riskScore > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm" data-testid={`risk-score-panel-${selectedJuror.number}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">AI Risk Score</span>
                    <span className={`text-2xl font-black tabular-nums ${selectedJuror.riskScore >= 70 ? 'text-rose-600' : selectedJuror.riskScore >= 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {selectedJuror.riskScore}<span className="text-sm font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${selectedJuror.riskScore >= 70 ? 'bg-rose-500' : selectedJuror.riskScore >= 35 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${selectedJuror.riskScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Low</span><span>Medium</span><span>High</span>
                  </div>
                  {selectedJuror.aiRiskTier && selectedJuror.aiRiskTier !== 'unassessed' && selectedJuror.aiRiskTier !== selectedJuror.riskTier && (
                    <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Your tier ({selectedJuror.riskTier}) differs from AI recommendation ({selectedJuror.aiRiskTier}).
                    </p>
                  )}
                </div>
              )}

              {/* AI Analysis */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <Brain className="w-4 h-4 mr-2 text-violet-500" />
                    AI Risk Analysis
                  </h4>
                  <div className="flex items-center gap-2">
                    {enrichmentStatus.isRunning && !enrichmentStatus.enrichedJurors.has(selectedJuror.number) && (
                      <span className="text-xs text-amber-600 flex items-center" title="Enrichment is still running for this juror. Analysis will be more accurate after enrichment completes.">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Research pending
                      </span>
                    )}
                    {enrichmentStatus.enrichedJurors.has(selectedJuror.number) && (
                      <span className="text-xs text-emerald-600 flex items-center" data-testid={`badge-modal-enriched-${selectedJuror.number}`}>
                        <Globe className="w-3 h-3 mr-1" />
                        Enriched
                      </span>
                    )}
                    <button
                      onClick={() => handleAnalyzeJuror(selectedJuror)}
                      disabled={analyzingJuror !== null}
                      data-testid={`button-analyze-juror-${selectedJuror.number}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 disabled:opacity-50"
                    >
                      {analyzingJuror === selectedJuror.number ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : hasRealAnalysis(selectedJuror.number) ? (
                        <>
                          <Brain className="w-3 h-3 mr-1.5" />
                          Re-analyze
                        </>
                      ) : failedAnalyses.has(selectedJuror.number) ? (
                        <>
                          <AlertTriangle className="w-3 h-3 mr-1.5" />
                          Retry Analysis
                        </>
                      ) : (
                        <>
                          <Brain className="w-3 h-3 mr-1.5" />
                          Analyze Juror
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {aiAnalysis[selectedJuror.number] ? (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis[selectedJuror.number]}
                    </div>
                  </div>
                ) : analyzingJuror === selectedJuror.number ? (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500 mr-3" />
                    <span className="text-sm text-violet-600 font-medium">Generating risk analysis...</span>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400 text-sm">
                      Click "Analyze Juror" for an AI-powered risk assessment.
                    </p>
                  </div>
                )}
              </div>

              {/* Responses */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2 text-slate-400" />
                  Recorded Responses ({(selectedJuror as any).responseCount})
                </h4>

                {(selectedJuror as any).responseCount === 0 ?
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <p className="text-slate-500 text-sm">
                      No responses recorded for this juror.
                    </p>
                  </div> :

              <div className="space-y-3">
                    {(selectedJuror as any).jurorResponses.map(
                  (response: JurorResponse) =>
                  <div
                    key={response.id}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200">

                          {response.side === 'court' ?
                    <div className="text-xs font-bold text-amber-700 mb-1">
                              Court: {response.questionSummary}
                            </div> :
                          response.side === 'opposing' ?
                    <div className="text-xs font-bold text-rose-600 mb-1">
                              Opposing: {response.questionSummary}
                            </div> :
                    response.questionId === null && response.questionSummary ?
                    <div className="text-xs font-bold text-emerald-600 mb-1">
                              New: {response.questionSummary}
                            </div> :
                    <div className="text-xs font-bold text-slate-600 mb-1">
                              Q{response.questionId}:{' '}
                              {
                      questions.find(
                        (q) => q.id === response.questionId
                      )?.originalText
                      }
                            </div>
                    }
                          <p className="text-sm text-slate-800 mt-2">
                            &ldquo;<ReactionText text={response.responseText} />&rdquo;
                          </p>
                          {response.followUps && response.followUps.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {response.followUps.map((fu: {question: string, answer: string}, idx: number) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                                  {fu.question ? (
                                    <div className="text-xs font-semibold text-slate-500 mb-1">
                                      {fu.question}
                                    </div>
                                  ) : (
                                    <div className="text-xs font-semibold text-slate-400 mb-1">
                                      Follow-up response
                                    </div>
                                  )}
                                  <p className="text-sm text-slate-800">
                                    "{fu.answer}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                )}
                  </div>
              }
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Attorney Notes
                </h4>
                <textarea
                value={selectedJuror.notes}
                onChange={(e) => {
                  onUpdateJuror(selectedJuror.number, {
                    notes: e.target.value
                  });
                  setSelectedJuror({
                    ...selectedJuror,
                    notes: e.target.value
                  });
                }}
                placeholder="Add private notes about this juror..."
                className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-sm resize-none min-h-[100px]" />

              </div>
            </div>
          </motion.div>
        </div>
      }
    </div>);

}