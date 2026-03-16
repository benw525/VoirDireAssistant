import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Lock,
  Unlock,
  ArrowRight,
  Edit3,
  MessageSquarePlus,
  Sparkles,
  FileText,
  AlertTriangle,
  Shield,
  Target,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  BookOpen,
  X,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { VoirDireQuestion, VoirDireDocument, CaseInfo, Juror } from '../../types';
import * as api from '../../lib/api';
import { exportAsPdf, exportAsText, exportAsWord } from '../../lib/exportVoirDire';

interface VoirDireQuestionsProps {
  questions: VoirDireQuestion[];
  onQuestionsProcessed: (questions: VoirDireQuestion[]) => void;
  onLockQuestions: () => void;
  onUnlockQuestions: () => void;
  locked: boolean;
  onProceed: () => void;
  caseInfo: CaseInfo;
  jurors: Juror[];
  caseId?: string | null;
}

export function VoirDireQuestions({
  questions,
  onQuestionsProcessed,
  onLockQuestions,
  onUnlockQuestions,
  locked,
  onProceed,
  caseInfo,
  jurors,
  caseId,
}: VoirDireQuestionsProps) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<{ qId: number; idx: number } | null>(null);
  const [voirDireDoc, setVoirDireDoc] = useState<VoirDireDocument | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showEnrichmentDialog, setShowEnrichmentDialog] = useState(false);
  const [enrichmentPending, setEnrichmentPending] = useState(0);
  const [enrichmentTotal, setEnrichmentTotal] = useState(0);
  const [enrichmentCompleted, setEnrichmentCompleted] = useState(0);
  const [isPollingEnrichment, setIsPollingEnrichment] = useState(false);
  const [pendingAction, setPendingAction] = useState<'generate' | 'refine' | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    opening: true,
    questions: true,
    jurorFollowUps: true,
    causeFlags: false,
    rehabilitation: false,
    strikeGuide: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const checkEnrichmentAndProceed = async (action: 'generate' | 'refine') => {
    if (!caseId) {
      if (action === 'generate') await executeGenerate();
      else await executeRefine();
      return;
    }

    try {
      const status = await api.getEnrichmentStatus(caseId);
      const inProgress = status.summary.pending + status.summary.dispatched;
      if (inProgress > 0) {
        setEnrichmentPending(inProgress);
        setEnrichmentTotal(status.summary.total);
        setEnrichmentCompleted(status.summary.completed);
        setPendingAction(action);
        setShowEnrichmentDialog(true);
        return;
      }
    } catch {
    }

    if (action === 'generate') await executeGenerate();
    else await executeRefine();
  };

  const startPollingEnrichment = () => {
    if (!caseId) return;
    setIsPollingEnrichment(true);
    setShowEnrichmentDialog(false);
    setIsProcessing(true);
    setProcessingLabel('Waiting for background research to complete...');

    pollingRef.current = setInterval(async () => {
      try {
        const status = await api.getEnrichmentStatus(caseId!);
        const inProgress = status.summary.pending + status.summary.dispatched;
        setEnrichmentPending(inProgress);
        setEnrichmentCompleted(status.summary.completed);
        setEnrichmentTotal(status.summary.total);

        if (inProgress === 0) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsPollingEnrichment(false);
          if (pendingAction === 'generate') await executeGenerate();
          else if (pendingAction === 'refine') await executeRefine();
          setPendingAction(null);
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPollingEnrichment(false);
        if (pendingAction === 'generate') await executeGenerate();
        else if (pendingAction === 'refine') await executeRefine();
        setPendingAction(null);
      }
    }, 3000);
  };

  const dismissEnrichmentAndProceed = () => {
    setShowEnrichmentDialog(false);
    if (pendingAction === 'generate') executeGenerate();
    else if (pendingAction === 'refine') executeRefine();
    setPendingAction(null);
  };

  const executeGenerate = async () => {
    setIsProcessing(true);
    setProcessingLabel('Building voir dire strategy...');
    setError(null);
    try {
      const doc = await api.generateVoirDire(caseInfo, jurors, caseId);
      setVoirDireDoc(doc);
      const questionsWithLock: VoirDireQuestion[] = doc.questions.map((q) => ({
        id: q.id,
        originalText: q.originalText,
        rephrase: q.rephrase,
        followUps: q.followUps,
        locked: false,
      }));
      onQuestionsProcessed(questionsWithLock);
    } catch (err: any) {
      setError(err.message || 'Failed to generate voir dire. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const executeRefine = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setProcessingLabel('Refining questions with AI...');
    setError(null);
    try {
      const refined = await api.refineQuestions(inputText, caseInfo, jurors, caseId);
      onQuestionsProcessed(refined);
      setInputText('');
    } catch (err: any) {
      setError(err.message || 'Failed to refine questions. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleGenerateFullVoirDire = () => checkEnrichmentAndProceed('generate');
  const handleRefineQuestions = () => checkEnrichmentAndProceed('refine');

  const updateQuestion = (id: number, field: keyof VoirDireQuestion, value: any) => {
    if (locked) return;
    const updated = questions.map((q) => (q.id === id ? { ...q, [field]: value } : q));
    onQuestionsProcessed(updated);
  };

  const updateFollowUp = (qId: number, idx: number, value: string) => {
    if (locked) return;
    const updated = questions.map((q) => {
      if (q.id === qId) {
        const newFollowUps = [...q.followUps];
        newFollowUps[idx] = value;
        return { ...q, followUps: newFollowUps };
      }
      return q;
    });
    onQuestionsProcessed(updated);
  };

  const handleClearAll = () => {
    onQuestionsProcessed([]);
    setVoirDireDoc(null);
  };

  // const handleImportEnrichment = async (file: File) => {
  //   if (!caseId) {
  //     setError('No active case. Please save your case first.');
  //     return;
  //   }
  //   setIsImporting(true);
  //   setError(null);
  //   setImportResult(null);
  //   try {
  //     const result = await api.importEnrichmentCsv(caseId, file);
  //     setImportResult({ matched: result.matched, unmatched: result.unmatched, unmatchedNames: result.unmatchedNames });
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to import enrichment data.');
  //   } finally {
  //     setIsImporting(false);
  //     if (enrichmentFileRef.current) enrichmentFileRef.current.value = '';
  //   }
  // };

  const hasContent = questions.length > 0;

  const riskLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const moduleColor = (mod: string) => {
    if (mod.includes('Experience')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (mod.includes('Attitude')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (mod.includes('Theme')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (mod.includes('Damage')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (mod.includes('Inoculation')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (mod.includes('Burden') || mod.includes('Fairness')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (isProcessing) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg p-12 text-center max-w-lg w-full"
        >
          <div className="mb-6">
            <div className="relative w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-amber-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2" data-testid="text-processing-label">
            {processingLabel}
          </h3>
          <p className="text-slate-500 text-sm">
            Analyzing case facts, juror demographics, and strike triggers to build a strategic voir dire tailored to your case.
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <AnimatePresence>
        {showEnrichmentDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            data-testid="dialog-enrichment-wait"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full mx-4 relative"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mr-4">
                  <Search className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Background Research in Progress</h3>
                  <p className="text-sm text-slate-500">
                    {enrichmentCompleted} of {enrichmentTotal} jurors researched
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Juror background research is still running for {enrichmentPending} juror{enrichmentPending !== 1 ? 's' : ''}.
                Waiting will produce more informed voir dire questions that leverage what we've learned about each juror.
              </p>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: enrichmentTotal > 0 ? `${(enrichmentCompleted / enrichmentTotal) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startPollingEnrichment}
                  data-testid="button-wait-for-enrichment"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 transition-colors"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Wait & Generate
                </button>
                <button
                  onClick={dismissEnrichmentAndProceed}
                  data-testid="button-generate-now"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Generate Now
                </button>
              </div>
              <button
                onClick={() => { setShowEnrichmentDialog(false); setPendingAction(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                data-testid="button-close-enrichment-dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" data-testid="text-phase-title">
            Phase 3: Voir Dire Questions
          </h2>
          <p className="text-slate-600 mt-1">
            {hasContent
              ? 'Review and edit your voir dire before locking.'
              : 'Generate a strategic voir dire or refine your own questions.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {locked && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 flex items-center font-medium">
              <Lock className="w-4 h-4 mr-2" />
              Questions Locked
            </div>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}


      {!hasContent ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col gap-6"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Generate Full Voir Dire</h3>
                  <p className="text-sm text-slate-500">
                    AI builds a complete courtroom-ready voir dire from your case details
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4 ml-[52px]">
                Using your case summary, party alignment, favorable/risk traits, and{' '}
                {jurors.length > 0 ? `${jurors.length} jurors from your panel` : 'juror demographics'}, the
                AI agent will generate strategic questioning modules, juror-specific follow-ups,
                cause challenge protocols, and a strike guide.
              </p>
              <div className="ml-[52px]">
                <button
                  onClick={handleGenerateFullVoirDire}
                  disabled={!caseInfo.summary}
                  data-testid="button-generate-voir-dire"
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Full Voir Dire
                </button>
                {!caseInfo.summary && (
                  <p className="text-xs text-slate-400 mt-2">
                    Complete your case setup first (Phase 1) to enable generation.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Refine My Questions</h3>
                  <p className="text-sm text-slate-500">
                    Paste your own questions and let AI enhance them strategically
                  </p>
                </div>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                data-testid="input-raw-questions"
                placeholder={"Have you or a family member ever been involved in a lawsuit?\nDo you have any strong feelings about awarding damages for emotional distress?\nHave you ever had a negative experience with a large corporation?"}
                className="flex-1 w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 resize-none transition-colors mb-4 min-h-[200px]"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleRefineQuestions}
                  disabled={!inputText.trim()}
                  data-testid="button-refine-questions"
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Refine Questions
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-6">
            {voirDireDoc && (
              <>
                <CollapsibleSection
                  title="Opening Statement"
                  icon={<Mic className="w-4 h-4" />}
                  sectionKey="opening"
                  expanded={expandedSections.opening}
                  onToggle={toggleSection}
                  badge={null}
                >
                  <div className="p-4">
                    <p className="text-slate-700 italic leading-relaxed" data-testid="text-opening-statement">
                      "{voirDireDoc.opening}"
                    </p>
                    {voirDireDoc.caseOverview && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                          Neutral Case Overview
                        </label>
                        <p className="text-slate-600 text-sm leading-relaxed" data-testid="text-case-overview">
                          {voirDireDoc.caseOverview}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              </>
            )}

            <CollapsibleSection
              title="Strategic Questions"
              icon={<BookOpen className="w-4 h-4" />}
              sectionKey="questions"
              expanded={expandedSections.questions}
              onToggle={toggleSection}
              badge={`${questions.length} questions`}
            >
              <div className="space-y-3 p-3">
                {questions.map((q) => {
                  const docQ = voirDireDoc?.questions.find((dq) => dq.id === q.id);
                  return (
                    <div
                      key={q.id}
                      data-testid={`card-question-${q.id}`}
                      className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
                        locked ? 'border-slate-200' : 'border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm shrink-0">
                            Q{q.id}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 mt-1">{q.originalText}</p>
                            {docQ?.module && (
                              <span
                                className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-2 ${moduleColor(docQ.module)}`}
                              >
                                {docQ.module}
                              </span>
                            )}
                          </div>
                        </div>
                        {locked ? (
                          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-2" />
                        ) : (
                          <Unlock className="w-4 h-4 text-amber-500 shrink-0 mt-2" />
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        <div>
                          <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            <Edit3 className="w-3 h-3 mr-1" /> Suggested Rephrase
                          </label>
                          {editingId === q.id && !locked ? (
                            <textarea
                              value={q.rephrase}
                              onChange={(e) => updateQuestion(q.id, 'rephrase', e.target.value)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                              data-testid={`input-rephrase-${q.id}`}
                              className="w-full p-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                              rows={2}
                            />
                          ) : (
                            <div
                              onClick={() => !locked && setEditingId(q.id)}
                              data-testid={`text-rephrase-${q.id}`}
                              className={`text-sm text-slate-700 p-2 rounded-lg border border-transparent ${
                                !locked ? 'hover:bg-slate-50 hover:border-slate-200 cursor-text' : ''
                              }`}
                            >
                              {q.rephrase}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            <MessageSquarePlus className="w-3 h-3 mr-1" /> Strategic Follow-ups
                          </label>
                          <ul className="space-y-1">
                            {q.followUps.map((followUp, idx) => (
                              <li key={idx} className="flex items-start text-sm text-slate-600">
                                <span className="text-amber-500 mr-2 mt-0.5">•</span>
                                {editingFollowUp?.qId === q.id && editingFollowUp?.idx === idx && !locked ? (
                                  <input
                                    value={followUp}
                                    onChange={(e) => updateFollowUp(q.id, idx, e.target.value)}
                                    onBlur={() => setEditingFollowUp(null)}
                                    autoFocus
                                    data-testid={`input-followup-${q.id}-${idx}`}
                                    className="flex-1 p-1 text-sm border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                                  />
                                ) : (
                                  <span
                                    onClick={() => !locked && setEditingFollowUp({ qId: q.id, idx })}
                                    data-testid={`text-followup-${q.id}-${idx}`}
                                    className={!locked ? 'cursor-text hover:text-slate-900' : ''}
                                  >
                                    {followUp}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            {voirDireDoc && voirDireDoc.jurorFollowUps.length > 0 && (
              <CollapsibleSection
                title="Juror-Specific Follow-ups"
                icon={<Users className="w-4 h-4" />}
                sectionKey="jurorFollowUps"
                expanded={expandedSections.jurorFollowUps}
                onToggle={toggleSection}
                badge={`${voirDireDoc.jurorFollowUps.length} jurors`}
              >
                <div className="p-4 space-y-4">
                  {voirDireDoc.jurorFollowUps.map((jf, i) => (
                    <div
                      key={i}
                      data-testid={`card-juror-followup-${jf.jurorNumber}`}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center mb-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold mr-2">
                          #{jf.jurorNumber}
                        </span>
                        <span className="font-semibold text-slate-800">{jf.jurorName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2 italic">{jf.rationale}</p>
                      <ul className="space-y-1">
                        {jf.questions.map((q, qi) => (
                          <li key={qi} className="text-sm text-slate-700 flex items-start">
                            <span className="text-indigo-500 mr-2 mt-0.5">→</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {voirDireDoc && voirDireDoc.causeFlags.length > 0 && (
              <CollapsibleSection
                title="Cause Challenge Flags"
                icon={<AlertTriangle className="w-4 h-4" />}
                sectionKey="causeFlags"
                expanded={expandedSections.causeFlags}
                onToggle={toggleSection}
                badge={`${voirDireDoc.causeFlags.length} flagged`}
              >
                <div className="p-4 space-y-4">
                  {voirDireDoc.causeFlags.map((cf, i) => (
                    <div
                      key={i}
                      data-testid={`card-cause-flag-${cf.jurorNumber}`}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <div className="flex items-center mb-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold mr-2">
                          #{cf.jurorNumber}
                        </span>
                        <span className="font-semibold text-red-900">{cf.jurorName}</span>
                      </div>
                      <p className="text-sm text-red-800 mb-3">{cf.riskSummary}</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                          Lock-down Questions
                        </label>
                        <ul className="space-y-1">
                          {cf.lockDownQuestions.map((q, qi) => (
                            <li key={qi} className="text-sm text-red-800 flex items-start">
                              <span className="text-red-400 mr-2 mt-0.5">{qi + 1}.</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 pt-2 border-t border-red-200">
                          <label className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                            Inability-to-be-fair Question
                          </label>
                          <p className="text-sm text-red-900 font-medium mt-1">{cf.inabilityQuestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {voirDireDoc && voirDireDoc.rehabilitationOptions.length > 0 && (
              <CollapsibleSection
                title="Rehabilitation Options"
                icon={<Shield className="w-4 h-4" />}
                sectionKey="rehabilitation"
                expanded={expandedSections.rehabilitation}
                onToggle={toggleSection}
                badge={null}
              >
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-3">
                    Use these to allow jurors to self-correct. Avoid leading language.
                  </p>
                  <ul className="space-y-2">
                    {voirDireDoc.rehabilitationOptions.map((opt, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start">
                        <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsibleSection>
            )}

            {voirDireDoc && voirDireDoc.strikeGuide.length > 0 && (
              <CollapsibleSection
                title="Strike Guide"
                icon={<Target className="w-4 h-4" />}
                sectionKey="strikeGuide"
                expanded={expandedSections.strikeGuide}
                onToggle={toggleSection}
                badge={`${voirDireDoc.strikeGuide.length} jurors`}
              >
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase">Juror</th>
                          <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase">Risk</th>
                          <th className="text-left py-2 pr-3 text-xs font-semibold text-slate-500 uppercase">Concern</th>
                          <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voirDireDoc.strikeGuide.map((sg, i) => (
                          <tr
                            key={i}
                            data-testid={`row-strike-${sg.jurorNumber}`}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2 pr-3">
                              <span className="font-medium text-slate-800">
                                #{sg.jurorNumber} {sg.jurorName}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${riskLevelColor(sg.riskLevel)}`}>
                                {sg.riskLevel}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-slate-600">{sg.primaryConcern}</td>
                            <td className="py-2 text-slate-700 font-medium">{sg.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleSection>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm shrink-0 mt-4">
            {!locked ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClearAll}
                    data-testid="button-clear-all"
                    className="text-slate-500 hover:text-slate-700 font-medium text-sm"
                  >
                    Clear All
                  </button>
                  {voirDireDoc && (
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        data-testid="button-export-strategy"
                        className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[160px]"
                          >
                            <button
                              onClick={() => { exportAsPdf(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-pdf"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-red-500" />
                              PDF Document
                            </button>
                            <button
                              onClick={() => { exportAsWord(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-word"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-blue-500" />
                              Word Document
                            </button>
                            <button
                              onClick={() => { exportAsText(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-text"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-slate-500" />
                              Plain Text
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                <button
                  onClick={onLockQuestions}
                  data-testid="button-lock-questions"
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Lock Questions
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onUnlockQuestions();
                      setVoirDireDoc(null);
                    }}
                    data-testid="button-unlock-questions"
                    className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock & Restart
                  </button>
                  {voirDireDoc && (
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        data-testid="button-export-strategy-locked"
                        className="inline-flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[160px]"
                          >
                            <button
                              onClick={() => { exportAsPdf(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-pdf-locked"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-red-500" />
                              PDF Document
                            </button>
                            <button
                              onClick={() => { exportAsWord(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-word-locked"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-blue-500" />
                              Word Document
                            </button>
                            <button
                              onClick={() => { exportAsText(voirDireDoc, questions, caseInfo); setShowExportMenu(false); }}
                              data-testid="button-export-text-locked"
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-slate-500" />
                              Plain Text
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                <button
                  onClick={onProceed}
                  data-testid="button-proceed-recording"
                  className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-sm"
                >
                  Proceed to Recording
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  sectionKey,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  badge: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(sectionKey)}
        data-testid={`button-toggle-${sectionKey}`}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-600">{icon}</span>
          <span className="font-semibold text-slate-900">{title}</span>
          {badge && (
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
