import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  AlertTriangle,
  Scale,
  Target,
  ShieldAlert,
  CheckCircle } from
'lucide-react';
import { CaseInfo, Juror, JurorResponse, VoirDireQuestion } from '../../types';
interface EndReportProps {
  caseInfo: CaseInfo | null;
  jurors: Juror[];
  responses: JurorResponse[];
  questions: VoirDireQuestion[];
}
export function EndReport({
  caseInfo,
  jurors,
  responses,
  questions
}: EndReportProps) {
  // Generate mock strike recommendations based on lean and risk
  const strikeRecommendations = useMemo(() => {
    const scored = jurors.map((juror) => {
      let score = 0;
      if (juror.lean === 'unfavorable') score += 50;
      if (juror.riskTier === 'high') score += 30;
      if (juror.lean === 'neutral' && juror.riskTier === 'medium') score += 10;
      // Mock justification
      let justification = '';
      if (juror.lean === 'unfavorable')
      justification = `Expressed beliefs directly contrary to ${caseInfo?.side} theory. `;
      if (juror.riskTier === 'high')
      justification += `High risk profile based on demographic and occupational markers. `;
      if (!justification)
      justification = 'General caution advised based on overall profile.';
      return {
        ...juror,
        strikeScore: score,
        justification
      };
    });
    // Sort highest score first, filter out those with 0 score
    return scored.
    filter((j) => j.strikeScore > 0).
    sort((a, b) => b.strikeScore - a.strikeScore);
  }, [jurors, caseInfo]);
  const favorableCount = jurors.filter((j) => j.lean === 'favorable').length;
  const unfavorableCount = jurors.filter((j) => j.lean === 'unfavorable').length;
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 text-amber-500 mb-4 shadow-lg">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">
          Final Voir Dire Report
        </h2>
        <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
          Session complete. Review the generated strike recommendations and
          final psychological profiles below.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pb-12">
        {/* Case Recap */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4 border-b border-slate-100 pb-4">
            <Scale className="w-5 h-5 mr-2 text-slate-500" />
            Case Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                Area of Law
              </div>
              <div className="font-medium text-slate-900">
                {caseInfo?.areaOfLaw}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                Side Represented
              </div>
              <div className="font-medium text-slate-900 capitalize">
                {caseInfo?.side}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                Panel Overview
              </div>
              <div className="font-medium text-slate-900">
                {jurors.length} Total Jurors •{' '}
                <span className="text-emerald-600">
                  {favorableCount} Favorable
                </span>{' '}
                •{' '}
                <span className="text-rose-600">
                  {unfavorableCount} Unfavorable
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Strike Recommendations */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
            <Target className="w-5 h-5 mr-2 text-rose-500" />
            Ranked Strike Recommendations
          </h3>

          {strikeRecommendations.length === 0 ?
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              No strong strike recommendations based on current data.
            </div> :

          <div className="space-y-4">
              {strikeRecommendations.map((juror, index) =>
            <motion.div
              initial={{
                opacity: 0,
                x: -20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              transition={{
                delay: index * 0.1
              }}
              key={juror.number}
              className="bg-white rounded-xl border-l-4 border-l-rose-500 border-y border-r border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">

                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-rose-50 rounded-lg text-rose-700 font-black text-xl">
                    {index + 1}
                  </div>

                  <div className="flex-shrink-0 w-24 text-center">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-1">
                      Juror
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      #{juror.number}
                    </div>
                  </div>

                  <div className="flex-1 border-l border-slate-100 pl-4">
                    <h4 className="font-bold text-slate-900">{juror.name}</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      {juror.occupation}
                    </p>
                    <div className="flex gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-bold capitalize">
                        Lean: {juror.lean}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold capitalize">
                        Risk: {juror.riskTier}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      <ShieldAlert className="w-4 h-4 inline mr-1 text-rose-500" />
                      {juror.justification}
                    </p>
                  </div>
                </motion.div>
            )}
            </div>
          }
        </section>

        {/* Print Action */}
        <div className="flex justify-center pt-8 border-t border-slate-200">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg">

            <FileText className="w-5 h-5 mr-2" />
            Print Final Report
          </button>
        </div>
      </div>
    </div>);

}