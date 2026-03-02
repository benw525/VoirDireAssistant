import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ArrowRight,
  Clock,
  User,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  Scale,
  Shield,
} from 'lucide-react';
import { Juror, VoirDireQuestion, JurorResponse, CaseInfo } from '../../types';

interface ResponseRecordingProps {
  jurors: Juror[];
  questions: VoirDireQuestion[];
  responses: JurorResponse[];
  onRecordResponse: (response: Omit<JurorResponse, 'id' | 'timestamp'>) => void;
  onProceed: () => void;
  caseInfo: CaseInfo;
}

type Stage = 'yours' | 'opposing';

export function ResponseRecording({
  jurors,
  questions,
  responses,
  onRecordResponse,
  onProceed,
  caseInfo,
}: ResponseRecordingProps) {
  const [stage, setStage] = useState<Stage>('yours');
  const [jurorNum, setJurorNum] = useState('');
  const [questionNum, setQuestionNum] = useState('');
  const [questionSummary, setQuestionSummary] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const jurorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    jurorInputRef.current?.focus();
  }, [stage]);

  const yourSideLabel = caseInfo.side === 'plaintiff' ? 'Plaintiff' : 'Defense';
  const opposingSideLabel = caseInfo.side === 'plaintiff' ? 'Defense' : 'Plaintiff / Prosecution';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const jNum = parseInt(jurorNum);
    if (isNaN(jNum) || !jurors.find((j) => j.number === jNum)) {
      setError(`Juror #${jurorNum} not found on strike list.`);
      return;
    }

    if (stage === 'yours') {
      const qNum = parseInt(questionNum);
      if (isNaN(qNum) || !questions.find((q) => q.id === qNum)) {
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
        side: 'yours',
      });
    } else {
      if (!questionSummary.trim()) {
        setError('Please summarize what opposing counsel asked.');
        return;
      }
      if (!responseText.trim()) {
        setError('Response text is required.');
        return;
      }
      onRecordResponse({
        jurorNumber: jNum,
        questionId: null,
        responseText: responseText.trim(),
        side: 'opposing',
        questionSummary: questionSummary.trim(),
      });
    }

    setJurorNum('');
    setQuestionNum('');
    setQuestionSummary('');
    setResponseText('');
    jurorInputRef.current?.focus();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const yourResponses = responses.filter((r) => r.side === 'yours');
  const opposingResponses = responses.filter((r) => r.side === 'opposing');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" data-testid="text-phase-title">
            Phase 4: Record Responses
          </h2>
          <p className="text-slate-600 mt-1">
            High-speed courtroom data entry. Press Enter to record.
          </p>
        </div>
        <button
          onClick={onProceed}
          data-testid="button-proceed-review"
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Review Board <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setStage('yours')}
                data-testid="button-stage-yours"
                className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  stage === 'yours'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-4 h-4" />
                {yourSideLabel}
              </button>
              <button
                onClick={() => setStage('opposing')}
                data-testid="button-stage-opposing"
                className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  stage === 'opposing'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                {opposingSideLabel}
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center mb-4">
                <Mic className={`w-5 h-5 mr-2 ${stage === 'yours' ? 'text-amber-500' : 'text-rose-500'}`} />
                <h3 className="font-bold text-slate-900">
                  {stage === 'yours' ? `${yourSideLabel} Examination` : `${opposingSideLabel} Examination`}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {stage === 'yours' ? (
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
                        data-testid="input-juror-number"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-lg font-bold"
                        placeholder="e.g. 14"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Question #
                      </label>
                      <input
                        type="number"
                        value={questionNum}
                        onChange={(e) => setQuestionNum(e.target.value)}
                        data-testid="input-question-number"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-lg font-bold"
                        placeholder="e.g. 2"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        Juror #
                      </label>
                      <input
                        ref={jurorInputRef}
                        type="number"
                        value={jurorNum}
                        onChange={(e) => setJurorNum(e.target.value)}
                        data-testid="input-juror-number-opposing"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-slate-50 text-lg font-bold"
                        placeholder="e.g. 14"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        What did {opposingSideLabel.toLowerCase()} ask?
                      </label>
                      <input
                        type="text"
                        value={questionSummary}
                        onChange={(e) => setQuestionSummary(e.target.value)}
                        data-testid="input-question-summary"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 bg-slate-50 text-sm"
                        placeholder="Summarize opposing counsel's question..."
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Response
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    data-testid="input-response-text"
                    className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm resize-none ${
                      stage === 'yours' ? 'focus:ring-2 focus:ring-amber-500' : 'focus:ring-2 focus:ring-rose-500'
                    }`}
                    rows={3}
                    placeholder="Juror's answer..."
                    required
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>

                {error && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="button-record-response"
                  className={`w-full py-3 font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm flex justify-center items-center ${
                    stage === 'yours'
                      ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 focus:ring-amber-500'
                      : 'bg-rose-500 text-white hover:bg-rose-400 focus:ring-rose-500'
                  }`}
                >
                  Record Response
                  <span
                    className={`ml-2 text-xs font-normal px-2 py-0.5 rounded border ${
                      stage === 'yours'
                        ? 'text-slate-800 bg-amber-400/50 border-amber-600/20'
                        : 'text-rose-100 bg-rose-400/50 border-rose-300/30'
                    }`}
                  >
                    ↵ Enter
                  </span>
                </button>
              </form>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-sm flex-1">
            <h3 className="font-bold text-slate-100 mb-4 text-sm uppercase tracking-wider">
              Session Stats
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-2xl font-bold text-amber-500" data-testid="text-total-responses">
                  {responses.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Total</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-2xl font-bold text-emerald-500" data-testid="text-your-responses">
                  {yourResponses.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">{yourSideLabel}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-2xl font-bold text-rose-400" data-testid="text-opposing-responses">
                  {opposingResponses.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Opposing</div>
              </div>
            </div>
            <div className="mt-3 bg-slate-800 p-3 rounded-xl">
              <div className="text-2xl font-bold text-blue-400" data-testid="text-jurors-spoke">
                {new Set(responses.map((r) => r.jurorNumber)).size}
              </div>
              <div className="text-xs text-slate-400 mt-1">Jurors Spoke</div>
            </div>
          </div>
        </div>

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
              {responses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>No responses recorded yet.</p>
                </div>
              ) : (
                [...responses].reverse().map((response) => {
                  const juror = jurors.find((j) => j.number === response.jurorNumber);
                  const isOpposing = response.side === 'opposing';
                  return (
                    <motion.div
                      key={response.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      data-testid={`card-response-${response.id}`}
                      className={`p-4 rounded-xl border shadow-sm ${
                        isOpposing ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm ${
                              isOpposing ? 'bg-rose-600' : 'bg-slate-900'
                            }`}
                          >
                            #{response.jurorNumber}
                          </span>
                          <span className="font-medium text-slate-900">
                            {juror?.name || 'Unknown'}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isOpposing
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isOpposing ? opposingSideLabel : yourSideLabel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatTime(response.timestamp)}
                        </span>
                      </div>

                      <div className="pl-10">
                        {isOpposing ? (
                          <div className="text-xs font-semibold text-rose-600 mb-1 flex items-center">
                            <Shield className="w-3 h-3 mr-1" />
                            {response.questionSummary}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Q{response.questionId}
                          </div>
                        )}
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          "{response.responseText}"
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
