import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  FileText,
  Scale,
  ArrowRight,
  CheckCircle2 } from
'lucide-react';
import { CaseInfo } from '../../types';
interface CaseSetupProps {
  onCaseSetup: (info: CaseInfo) => void;
  onProceed: () => void;
  existingInfo: CaseInfo | null;
}
const AREAS_OF_LAW = [
'Personal Injury',
'Criminal Defense',
'Medical Malpractice',
'Contract Dispute',
'Employment Law',
'Family Law',
'Civil Rights',
'Other'];

export function CaseSetup({
  onCaseSetup,
  onProceed,
  existingInfo
}: CaseSetupProps) {
  const [areaOfLaw, setAreaOfLaw] = useState(existingInfo?.areaOfLaw || '');
  const [summary, setSummary] = useState(existingInfo?.summary || '');
  const [side, setSide] = useState<'plaintiff' | 'defense' | null>(
    existingInfo?.side || null
  );
  const [isInitialized, setIsInitialized] = useState(!!existingInfo);
  const handleInitialize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaOfLaw || !summary || !side) return;
    // Mock generating traits based on side
    const favorableTraits =
    side === 'plaintiff' ?
    [
    'Empathetic',
    'Believes in corporate accountability',
    'Open to non-economic damages'] :

    [
    'Skeptical of claims',
    'Respects personal responsibility',
    'Detail-oriented'];

    const riskTraits =
    side === 'plaintiff' ?
    [
    'Tort reform advocate',
    'Strict rule-follower',
    'Skeptical of emotional distress'] :

    [
    'Anti-corporate bias',
    'Highly emotional',
    'Prior negative experience with similar defendants'];

    onCaseSetup({
      areaOfLaw,
      summary,
      side,
      favorableTraits,
      riskTraits
    });
    setIsInitialized(true);
  };
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Phase 1: Case Initialization
        </h2>
        <p className="text-slate-600 mt-1">
          Define the parameters of your case to calibrate the analysis engine.
        </p>
      </div>

      {!isInitialized ?
      <motion.form
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        onSubmit={handleInitialize}
        className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">

          {/* Area of Law */}
          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-2">
              <Briefcase className="w-4 h-4 mr-2 text-slate-500" />
              Area of Law
            </label>
            <select
            value={areaOfLaw}
            onChange={(e) => setAreaOfLaw(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors"
            required>

              <option value="" disabled>
                Select Area of Law...
              </option>
              {AREAS_OF_LAW.map((area) =>
            <option key={area} value={area}>
                  {area}
                </option>
            )}
            </select>
          </div>

          {/* Case Summary */}
          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-2">
              <FileText className="w-4 h-4 mr-2 text-slate-500" />
              Case Summary
            </label>
            <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Provide a brief summary of the facts..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors resize-none"
            required />

          </div>

          {/* Side Selection */}
          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-3">
              <Scale className="w-4 h-4 mr-2 text-slate-500" />
              Which side do you represent?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
              type="button"
              onClick={() => setSide('plaintiff')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${side === 'plaintiff' ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>

                <div className="font-bold text-slate-900 text-lg">
                  Plaintiff / Prosecution
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Bringing the charges or claims
                </div>
              </button>
              <button
              type="button"
              onClick={() => setSide('defense')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${side === 'defense' ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>

                <div className="font-bold text-slate-900 text-lg">Defense</div>
                <div className="text-sm text-slate-500 mt-1">
                  Defending against charges or claims
                </div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
            type="submit"
            disabled={!areaOfLaw || !summary || !side}
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

              Initialize Case
            </button>
          </div>
        </motion.form> :

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        className="space-y-6">

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mr-3" />
              <h3 className="text-xl font-bold text-emerald-900">
                Case Initialized Successfully
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">
                  Case Details
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-emerald-200/50 pb-2">
                    <dt className="text-emerald-700">Area of Law</dt>
                    <dd className="font-medium text-emerald-900">
                      {existingInfo?.areaOfLaw}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b border-emerald-200/50 pb-2">
                    <dt className="text-emerald-700">Side</dt>
                    <dd className="font-medium text-emerald-900 capitalize">
                      {existingInfo?.side}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">
                  Analysis Parameters
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-emerald-700 mb-1">
                      Target Favorable Traits
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {existingInfo?.favorableTraits.map((trait, i) =>
                    <span
                      key={i}
                      className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">

                          {trait}
                        </span>
                    )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-rose-700 mb-1">
                      Target Risk Traits
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {existingInfo?.riskTraits.map((trait, i) =>
                    <span
                      key={i}
                      className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium">

                          {trait}
                        </span>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
            onClick={() => setIsInitialized(false)}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm">

              Edit Case Details
            </button>
            <button
            onClick={onProceed}
            className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm">

              Proceed to Strike List
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </motion.div>
      }
    </div>);

}