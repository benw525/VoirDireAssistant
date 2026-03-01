import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Lock,
  Unlock,
  ArrowRight,
  Edit3,
  MessageSquarePlus,
  Database } from
'lucide-react';
import { VoirDireQuestion } from '../../types';
interface VoirDireQuestionsProps {
  questions: VoirDireQuestion[];
  onQuestionsProcessed: (questions: VoirDireQuestion[]) => void;
  onLockQuestions: () => void;
  locked: boolean;
  onProceed: () => void;
  generateSampleQuestions: () => VoirDireQuestion[];
}
export function VoirDireQuestions({
  questions,
  onQuestionsProcessed,
  onLockQuestions,
  locked,
  onProceed,
  generateSampleQuestions
}: VoirDireQuestionsProps) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const lines = inputText.split('\n').filter((l) => l.trim().length > 0);
      const newQuestions: VoirDireQuestion[] = lines.map((line, index) => ({
        id: index + 1,
        originalText: line.trim(),
        rephrase: `(Rephrase) ${line.trim().replace(/\?$/, '')} - how does that apply to you?`,
        followUps: [
        'Can you elaborate on that experience?',
        'Would that affect your ability to be impartial?'],

        locked: false
      }));
      onQuestionsProcessed(newQuestions);
      setInputText('');
      setIsProcessing(false);
    }, 800);
  };
  const loadSampleQuestions = () => {
    onQuestionsProcessed(generateSampleQuestions());
  };
  const updateQuestion = (
  id: number,
  field: keyof VoirDireQuestion,
  value: any) =>
  {
    if (locked) return;
    const updated = questions.map((q) =>
    q.id === id ?
    {
      ...q,
      [field]: value
    } :
    q
    );
    onQuestionsProcessed(updated);
  };
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Phase 3: Voir Dire Questions
          </h2>
          <p className="text-slate-600 mt-1">
            Input your planned questions. The system will number them and
            generate strategic follow-ups.
          </p>
        </div>
        {locked &&
        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 flex items-center font-medium">
            <Lock className="w-4 h-4 mr-2" />
            Questions Locked
          </div>
        }
      </div>

      {questions.length === 0 ?
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">

          <div className="p-6 flex-1 flex flex-col">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Paste Questions (One per line)
            </label>
            <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="1. Have you or a family member ever been involved in a lawsuit?&#10;2. Do you have any strong feelings about awarding damages for emotional distress?"
            className="flex-1 w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 resize-none transition-colors mb-4 min-h-[300px]" />


            <div className="flex justify-between items-center">
              <button
              onClick={loadSampleQuestions}
              className="text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center transition-colors">

                <Database className="w-4 h-4 mr-2" />
                Load Sample Questions
              </button>

              <button
              onClick={handleProcess}
              disabled={!inputText.trim() || isProcessing}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors">

                {isProcessing ?
              <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </> :

              <>
                    <HelpCircle className="w-5 h-5 mr-2" />
                    Process Questions
                  </>
              }
              </button>
            </div>
          </div>
        </motion.div> :

      <motion.div
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        className="flex-1 flex flex-col min-h-0">

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-6">
            {questions.map((q) =>
          <div
            key={q.id}
            className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${locked ? 'border-slate-200' : 'border-amber-200 hover:border-amber-300'}`}>

                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm shrink-0">
                      Q{q.id}
                    </span>
                    <p className="font-medium text-slate-900 mt-1">
                      {q.originalText}
                    </p>
                  </div>
                  {locked ?
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-2" /> :

              <Unlock className="w-4 h-4 text-amber-500 shrink-0 mt-2" />
              }
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <Edit3 className="w-3 h-3 mr-1" /> Suggested Rephrase
                    </label>
                    {editingId === q.id && !locked ?
                <textarea
                  value={q.rephrase}
                  onChange={(e) =>
                  updateQuestion(q.id, 'rephrase', e.target.value)
                  }
                  onBlur={() => setEditingId(null)}
                  autoFocus
                  className="w-full p-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  rows={2} /> :


                <div
                  onClick={() => !locked && setEditingId(q.id)}
                  className={`text-sm text-slate-700 p-2 rounded-lg border border-transparent ${!locked ? 'hover:bg-slate-50 hover:border-slate-200 cursor-text' : ''}`}>

                        {q.rephrase}
                      </div>
                }
                  </div>

                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <MessageSquarePlus className="w-3 h-3 mr-1" /> Strategic
                      Follow-ups
                    </label>
                    <ul className="space-y-1">
                      {q.followUps.map((followUp, idx) =>
                  <li
                    key={idx}
                    className="flex items-start text-sm text-slate-600">

                          <span className="text-amber-500 mr-2">•</span>
                          {followUp}
                        </li>
                  )}
                    </ul>
                  </div>
                </div>
              </div>
          )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm shrink-0 mt-4">
            {!locked ?
          <>
                <button
              onClick={() => onQuestionsProcessed([])}
              className="text-slate-500 hover:text-slate-700 font-medium text-sm">

                  Clear All
                </button>
                <button
              onClick={onLockQuestions}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors">

                  <Lock className="w-4 h-4 mr-2" />
                  Lock Questions
                </button>
              </> :

          <>
                <div className="text-sm text-slate-500 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Questions locked for recording
                </div>
                <button
              onClick={onProceed}
              className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-sm">

                  Proceed to Recording
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </>
          }
          </div>
        </motion.div>
      }
    </div>);

}