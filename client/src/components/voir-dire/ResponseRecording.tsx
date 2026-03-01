import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ArrowRight,
  Clock,
  User,
  HelpCircle,
  MessageSquare,
  AlertCircle } from
'lucide-react';
import { Juror, VoirDireQuestion, JurorResponse } from '../../types';
interface ResponseRecordingProps {
  jurors: Juror[];
  questions: VoirDireQuestion[];
  responses: JurorResponse[];
  onRecordResponse: (response: Omit<JurorResponse, 'id' | 'timestamp'>) => void;
  onProceed: () => void;
}
export function ResponseRecording({
  jurors,
  questions,
  responses,
  onRecordResponse,
  onProceed
}: ResponseRecordingProps) {
  const [jurorNum, setJurorNum] = useState('');
  const [questionNum, setQuestionNum] = useState('');
  const [isOCQ, setIsOCQ] = useState(false);
  const [ocqSummary, setOcqSummary] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const jurorInputRef = useRef<HTMLInputElement>(null);
  // Focus juror input on mount
  useEffect(() => {
    jurorInputRef.current?.focus();
  }, []);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const jNum = parseInt(jurorNum);
    const qNum = isOCQ ? null : parseInt(questionNum);
    // Validation
    if (isNaN(jNum) || !jurors.find((j) => j.number === jNum)) {
      setError(`Juror #${jurorNum} not found on strike list.`);
      return;
    }
    if (
    !isOCQ && (
    isNaN(qNum as number) || !questions.find((q) => q.id === qNum)))
    {
      setError(`Question #${questionNum} not found.`);
      return;
    }
    if (!responseText.trim()) {
      setError('Response text is required.');
      return;
    }
    onRecordResponse({
      jurorNumber: jNum,
      questionId: qNum,
      responseText: responseText.trim(),
      isOCQ,
      ocqSummary: isOCQ ? ocqSummary.trim() : undefined
    });
    // Reset form but keep focus flowing
    setJurorNum('');
    setQuestionNum('');
    setResponseText('');
    setOcqSummary('');
    setIsOCQ(false);
    jurorInputRef.current?.focus();
  };
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Phase 4: Record Responses
          </h2>
          <p className="text-slate-600 mt-1">
            High-speed courtroom data entry. Press Enter to record.
          </p>
        </div>
        <button
          onClick={onProceed}
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">

          Review Board <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Entry Form */}
        <div className="lg:col-span-1 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center">
                <Mic className="w-5 h-5 mr-2 text-amber-500" />
                Quick Entry
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-slate-500">OCQ Mode</span>
                <button
                  type="button"
                  onClick={() => setIsOCQ(!isOCQ)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isOCQ ? 'bg-amber-500' : 'bg-slate-300'}`}>

                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isOCQ ? 'translate-x-5' : 'translate-x-1'}`} />

                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Juror #
                  </label>
                  <input
                    ref={jurorInputRef}
                    type="number"
                    value={jurorNum}
                    onChange={(e) => setJurorNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-lg font-bold"
                    placeholder="e.g. 14"
                    required />

                </div>
                {!isOCQ &&
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                      Question #
                    </label>
                    <input
                    type="number"
                    value={questionNum}
                    onChange={(e) => setQuestionNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-lg font-bold"
                    placeholder="e.g. 2"
                    required={!isOCQ} />

                  </div>
                }
              </div>

              {isOCQ &&
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0
                }}
                animate={{
                  opacity: 1,
                  height: 'auto'
                }}>

                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Opposing Counsel Q Summary
                  </label>
                  <input
                  type="text"
                  value={ocqSummary}
                  onChange={(e) => setOcqSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm"
                  placeholder="What did OC ask?"
                  required={isOCQ} />

                </motion.div>
              }

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Response
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm resize-none"
                  rows={3}
                  placeholder="Juror's answer..."
                  required
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }} />

              </div>

              {error &&
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                  {error}
                </div>
              }

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm flex justify-center items-center">

                Record Response
                <span className="ml-2 text-xs font-normal text-slate-800 bg-amber-400/50 px-2 py-0.5 rounded border border-amber-600/20">
                  ↵ Enter
                </span>
              </button>
            </form>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-sm flex-1">
            <h3 className="font-bold text-slate-100 mb-4 text-sm uppercase tracking-wider">
              Session Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-3xl font-bold text-amber-500">
                  {responses.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Total Responses
                </div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-3xl font-bold text-emerald-500">
                  {new Set(responses.map((r) => r.jurorNumber)).size}
                </div>
                <div className="text-xs text-slate-400 mt-1">Jurors Spoke</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Response Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-slate-500" />
              Live Response Log
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
              Newest First
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {responses.length === 0 ?
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>No responses recorded yet.</p>
                </div> :

              [...responses].reverse().map((response) => {
                const juror = jurors.find(
                  (j) => j.number === response.jurorNumber
                );
                return (
                  <motion.div
                    key={response.id}
                    initial={{
                      opacity: 0,
                      y: -20,
                      scale: 0.95
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1
                    }}
                    className={`p-4 rounded-xl border ${response.isOCQ ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-200'} shadow-sm`}>

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm">
                            #{response.jurorNumber}
                          </span>
                          <span className="font-medium text-slate-900">
                            {juror?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatTime(response.timestamp)}
                        </span>
                      </div>

                      <div className="pl-10">
                        {response.isOCQ ?
                      <div className="text-xs font-semibold text-rose-600 mb-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            OCQ: {response.ocqSummary}
                          </div> :

                      <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                            <HelpCircle className="w-3 h-3 mr-1" />Q
                            {response.questionId}
                          </div>
                      }
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          "{response.responseText}"
                        </p>
                      </div>
                    </motion.div>);

              })
              }
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>);

}