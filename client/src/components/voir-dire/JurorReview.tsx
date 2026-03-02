import React, { useMemo, useState } from 'react';
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
  X } from
'lucide-react';
import { Juror, JurorResponse, VoirDireQuestion } from '../../types';
interface JurorReviewProps {
  jurors: Juror[];
  responses: JurorResponse[];
  questions: VoirDireQuestion[];
  onUpdateJuror: (jurorNumber: number, updates: Partial<Juror>) => void;
  onProceed: () => void;
}
export function JurorReview({
  jurors,
  responses,
  questions,
  onUpdateJuror,
  onProceed
}: JurorReviewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [filterLean, setFilterLean] = useState<string>('all');
  const [selectedJuror, setSelectedJuror] = useState<Juror | null>(null);
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

          <button
            onClick={onProceed}
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm">

            End & Report <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

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
                  <div
                className={`px-2 py-1 rounded text-xs font-bold border flex items-center capitalize ${getLeanColor(juror.lean)}`}>

                    {getLeanIcon(juror.lean)}
                    {juror.lean}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Risk Tier
                    </span>
                    <span
                  className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${juror.riskTier === 'high' ? 'bg-rose-100 text-rose-700' : juror.riskTier === 'medium' ? 'bg-amber-100 text-amber-700' : juror.riskTier === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>

                      {juror.riskTier}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Responses
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {juror.responseCount}
                    </span>
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
                      <div
                    className={`inline-flex px-2 py-1 rounded text-xs font-bold border capitalize items-center ${getLeanColor(juror.lean)}`}>

                        {juror.lean}
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
              <div className="grid grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Manual Lean Override
                  </label>
                  <select
                  value={selectedJuror.lean}
                  onChange={(e) => {
                    onUpdateJuror(selectedJuror.number, {
                      lean: e.target.value as any
                    });
                    setSelectedJuror({
                      ...selectedJuror,
                      lean: e.target.value as any
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-bold capitalize focus:ring-2 focus:ring-amber-500 outline-none ${getLeanColor(selectedJuror.lean)}`}>

                    <option value="favorable">Favorable</option>
                    <option value="neutral">Neutral</option>
                    <option value="unfavorable">Unfavorable</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Risk Tier
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

                          {response.side === 'opposing' ?
                    <div className="text-xs font-bold text-rose-600 mb-1">
                              Opposing: {response.questionSummary}
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
                            "{response.responseText}"
                          </p>
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