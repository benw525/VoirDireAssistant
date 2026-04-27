import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Gavel,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Send,
  Sparkles,
  Loader2,
  Bookmark,
  MessageSquarePlus,
  StickyNote,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Copy,
  Link2Off,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Juror, VoirDireQuestion, JurorResponse, CaseInfo, SeatingConfig } from '../../types';
import { JurySeatingGrid } from './JurySeatingGrid';
import { ReactionText } from './ReactionText';
import * as api from '../../lib/api';
import { useCollaborativeSession } from '../../hooks/useCollaborativeSession';
import { useToast } from '@/hooks/use-toast';

interface MarkedFollowUp {
  id: string;
  suggestionText: string;
  parentResponse: JurorResponse;
  jurorNumber: number;
  jurorName: string;
}

const DEMEANOR_TAGS = [
  'Hesitant', 'Confident', 'Avoiding Eye Contact', 'Engaged',
  'Fidgeting', 'Arms Crossed', 'Leaning Forward', 'Uncomfortable',
  'Smiling', 'Hostile Tone', 'Reluctant', 'Nodding Frequently',
];

interface ResponseRecordingProps {
  jurors: Juror[];
  questions: VoirDireQuestion[];
  responses: JurorResponse[];
  onRecordResponse: (response: Omit<JurorResponse, 'id' | 'timestamp'>) => void;
  onRemoteResponse?: (response: JurorResponse) => void;
  onRemoteResponseDeleted?: (responseId: string) => void;
  onRemoteFollowUp?: (responseId: string, followUp: {question: string, answer: string}) => void;
  onRemoteNotesUpdated?: (jurorNumber: number, notes: string) => void;
  onAddFollowUp: (responseId: string, followUp: {question: string, answer: string}) => void;
  onProceed: () => void;
  onUpdateJuror: (jurorNumber: number, updates: Partial<Juror>) => void;
  caseInfo: CaseInfo;
  caseId?: string | null;
  seatingConfig: SeatingConfig | null;
  onSeatingConfigChange: (config: SeatingConfig) => void;
  courtDismissed: number[];
}

type Stage = 'yours' | 'opposing' | 'court';

export function ResponseRecording({
  jurors,
  questions,
  responses,
  onRecordResponse,
  onRemoteResponse,
  onRemoteResponseDeleted,
  onRemoteFollowUp,
  onRemoteNotesUpdated,
  onAddFollowUp,
  onProceed,
  onUpdateJuror,
  caseInfo,
  caseId,
  seatingConfig,
  onSeatingConfigChange,
  courtDismissed,
}: ResponseRecordingProps) {
  const [stage, setStage] = useState<Stage>('yours');
  const [jurorNum, setJurorNum] = useState('');
  const [questionNum, setQuestionNum] = useState('');
  const [questionSummary, setQuestionSummary] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const jurorInputRef = useRef<HTMLInputElement>(null);
  const followUpAnswerRef = useRef<HTMLTextAreaElement>(null);

  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, string[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});
  const [askingFollowUp, setAskingFollowUp] = useState<{ responseId: string; suggestion: string; sk: string } | null>(null);
  const [askFollowUpAnswer, setAskFollowUpAnswer] = useState('');
  const askFollowUpRef = useRef<HTMLTextAreaElement>(null);
  const [markedFollowUps, setMarkedFollowUps] = useState<MarkedFollowUp[]>([]);
  const [expandedMarked, setExpandedMarked] = useState<Record<string, boolean>>({});
  const [showMarkedSection, setShowMarkedSection] = useState(true);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);
  const [notesWalkthroughIdx, setNotesWalkthroughIdx] = useState(0);
  const [walkthroughNotes, setWalkthroughNotes] = useState<Record<number, string>>({});
  const [walkthroughTags, setWalkthroughTags] = useState<Record<number, string[]>>({});

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [activeSession, setActiveSession] = useState<{ id: string; sessionCode: string } | null>(null);
  const [sessionParticipants, setSessionParticipants] = useState<Array<{ id: string; displayName: string }>>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (caseInfo && caseId) {
      setActiveSession(null);
      api.getSessionForCase(caseId).then(s => {
        if (s && s.isActive) setActiveSession({ id: s.id, sessionCode: s.sessionCode });
      }).catch(() => {});
    }
  }, [caseId, caseInfo]);

  useEffect(() => {
    if (activeSession) {
      const poll = () => api.getActiveParticipants(activeSession.id).then(setSessionParticipants).catch(() => {});
      poll();
      const interval = setInterval(poll, 10000);
      return () => clearInterval(interval);
    }
  }, [activeSession?.id]);

  const collabHandlers = {
    onResponseNew: useCallback((data: any) => {
      const r = data?.response || data;
      if (r && r.id && r.jurorNumber !== undefined) {
        const mapped: JurorResponse = {
          id: r.id,
          jurorNumber: r.jurorNumber,
          questionId: r.questionId ?? null,
          responseText: r.responseText,
          side: r.side || 'yours',
          questionSummary: r.questionSummary,
          followUps: r.followUps,
          timestamp: r.timestamp || Date.now(),
          recordedBy: r.recordedBy,
        };
        onRemoteResponse?.(mapped);
      }
    }, []),
    onResponseDeleted: useCallback((data: any) => {
      if (data.responseId) {
        onRemoteResponseDeleted?.(data.responseId);
      }
    }, []),
    onFollowUpNew: useCallback((data: any) => {
      if (data.responseId && data.followUp) {
        onRemoteFollowUp?.(data.responseId, data.followUp);
      }
    }, []),
    onNotesUpdated: useCallback((data: any) => {
      if (data.jurorNumber !== undefined && onRemoteNotesUpdated) {
        onRemoteNotesUpdated(data.jurorNumber, data.notes);
      }
    }, []),
    onParticipantJoined: useCallback((data: any) => {
      toast({ title: `${data.displayName} joined the session` });
      if (activeSession) {
        api.getActiveParticipants(activeSession.id).then(setSessionParticipants).catch(() => {});
      }
    }, [toast, activeSession]),
    onParticipantLeft: useCallback((data: any) => {
      toast({ title: `${data.displayName} left the session`, variant: 'destructive' as const });
      if (activeSession) {
        api.getActiveParticipants(activeSession.id).then(setSessionParticipants).catch(() => {});
      }
    }, [toast, activeSession]),
    onQuestionSetActive: useCallback((data: any) => {
      if (data.isFollowUp && data.jurorNumber && data.questionId) {
        const matchingResponse = responses.find(
          r => r.jurorNumber === data.jurorNumber && r.questionId === data.questionId
        );
        if (matchingResponse) {
          setExpandedResponseId(matchingResponse.id);
          setFollowUpQuestion(data.questionText || '');
          setFollowUpAnswer('');
          setTimeout(() => {
            const card = document.querySelector(`[data-testid="card-response-${matchingResponse.id}"]`)
              || document.getElementById(`response-${matchingResponse.id}`);
            card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            followUpAnswerRef.current?.focus();
          }, 100);
          toast({
            title: 'Follow-up requested',
            description: `Juror #${data.jurorNumber}: "${(data.questionText || '').substring(0, 60)}${(data.questionText || '').length > 60 ? '...' : ''}" — set by ${data.setBy}`,
          });
        } else {
          toast({
            title: 'Follow-up requested',
            description: `Juror #${data.jurorNumber} has no recorded answer for Q${data.questionId} yet — record their response first, then the follow-up will attach.`,
            variant: 'destructive',
          });
        }
        return;
      }
      if (data.questionId) {
        setQuestionNum(data.questionId.toString());
      }
      if (data.questionText) {
        setQuestionSummary(data.questionText);
      }
      toast({ title: 'Active question updated', description: `"${data.questionText?.substring(0, 60)}${data.questionText?.length > 60 ? '...' : ''}" set by ${data.setBy}` });
    }, [toast, responses]),
  };

  const { status: wsStatus } = useCollaborativeSession({
    sessionId: activeSession?.id || null,
    isOwner: true,
    ...collabHandlers,
  });

  const handleCreateSession = async () => {
    setSessionLoading(true);
    try {
      const result = await api.createSession(caseId || '');
      setActiveSession(result);
      setShowSharePanel(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSessionLoading(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!activeSession) return;
    try {
      await api.revokeSession(activeSession.id);
      setActiveSession(null);
      setSessionParticipants([]);
      toast({ title: 'Session ended', description: 'All collaborators have been disconnected.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCopyCode = () => {
    if (activeSession) {
      const link = `${window.location.origin}/team?code=${activeSession.sessionCode}`;
      navigator.clipboard.writeText(link).then(() => {
        toast({ title: 'Link copied to clipboard' });
      });
    }
  };

  const stableKey = (r: JurorResponse) => `${r.jurorNumber}-${r.timestamp}`;

  useEffect(() => {
    jurorInputRef.current?.focus();
  }, [stage]);

  const lcArea = caseInfo.areaOfLaw.toLowerCase();
  const isCriminal = lcArea.includes('criminal') || lcArea.includes('felony') || lcArea.includes('misdemeanor');
  const plaintiffTerm = isCriminal ? 'Prosecution' : 'Plaintiff';
  const yourSideLabel = caseInfo.side === 'plaintiff' ? plaintiffTerm : 'Defense';
  const opposingSideLabel = caseInfo.side === 'plaintiff' ? 'Defense' : plaintiffTerm;

  const fetchSuggestions = useCallback(async (response: JurorResponse) => {
    const key = stableKey(response);
    if (suggestionsMap[key] || loadingSuggestions[key]) return;
    const juror = jurors.find(j => j.number === response.jurorNumber);
    if (!juror) return;

    const questionText = response.questionSummary ||
      (response.questionId ? questions.find(q => q.id === response.questionId)?.originalText : '') ||
      'General question';

    setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
    try {
      const suggestions = await api.suggestFollowups(
        questionText,
        response.responseText,
        juror.name,
        juror.number,
        caseInfo
      );
      setSuggestionsMap(prev => ({ ...prev, [key]: suggestions }));
    } catch {
      setSuggestionsMap(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
    }
  }, [suggestionsMap, loadingSuggestions, jurors, questions, caseInfo]);

  const prevResponseCount = useRef(responses.length);
  useEffect(() => {
    if (responses.length > prevResponseCount.current) {
      const newest = responses[responses.length - 1];
      if (newest && newest.side === 'yours') {
        fetchSuggestions(newest);
      }
    }
    prevResponseCount.current = responses.length;
  }, [responses.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const jNum = parseInt(jurorNum);
    if (isNaN(jNum) || !jurors.find((j) => j.number === jNum)) {
      setError(`Juror #${jurorNum} not found on strike list.`);
      return;
    }

    if (stage === 'yours') {
      if (isNewQuestion) {
        if (!newQuestionText.trim()) {
          setError('Please enter the question you asked.');
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
          side: 'yours',
          questionSummary: newQuestionText.trim(),
        });
      } else {
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
      }
    } else if (stage === 'opposing') {
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
    } else {
      if (!questionSummary.trim()) {
        setError('Please summarize what the Court asked.');
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
        side: 'court',
        questionSummary: questionSummary.trim(),
      });
    }

    setJurorNum('');
    setQuestionNum('');
    setQuestionSummary('');
    setNewQuestionText('');
    setIsNewQuestion(false);
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

  const handleFollowUpSubmit = (parentResponse: JurorResponse) => {
    if (!followUpAnswer.trim()) return;
    onAddFollowUp(parentResponse.id, {
      question: followUpQuestion.trim(),
      answer: followUpAnswer.trim(),
    });
    setFollowUpQuestion('');
    setFollowUpAnswer('');
    setExpandedResponseId(null);
  };

  const toggleExpanded = (id: string) => {
    if (expandedResponseId === id) {
      setExpandedResponseId(null);
      setFollowUpQuestion('');
      setFollowUpAnswer('');
    } else {
      setExpandedResponseId(id);
      setFollowUpQuestion('');
      setFollowUpAnswer('');
    }
  };

  const handleAskFollowUp = (responseId: string, suggestion: string, responseKey: string) => {
    setAskingFollowUp({ responseId, suggestion, sk: responseKey });
    setAskFollowUpAnswer('');
    setTimeout(() => askFollowUpRef.current?.focus(), 50);
  };

  const handleSubmitAskedFollowUp = () => {
    if (!askingFollowUp || !askFollowUpAnswer.trim()) return;
    onAddFollowUp(askingFollowUp.responseId, {
      question: askingFollowUp.suggestion,
      answer: askFollowUpAnswer.trim(),
    });
    setSuggestionsMap(prev => {
      const updated = { ...prev };
      const key = askingFollowUp.sk;
      if (updated[key]) {
        updated[key] = updated[key].filter(s => s !== askingFollowUp.suggestion);
      }
      return updated;
    });
    setAskingFollowUp(null);
    setAskFollowUpAnswer('');
  };

  const handleMarkFollowUp = (response: JurorResponse, suggestion: string) => {
    const juror = jurors.find(j => j.number === response.jurorNumber);
    const marked: MarkedFollowUp = {
      id: `${response.id}-${Date.now()}`,
      suggestionText: suggestion,
      parentResponse: response,
      jurorNumber: response.jurorNumber,
      jurorName: juror?.name || `Juror #${response.jurorNumber}`,
    };
    setMarkedFollowUps(prev => [...prev, marked]);
    const key = stableKey(response);
    setSuggestionsMap(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        updated[key] = updated[key].filter(s => s !== suggestion);
      }
      return updated;
    });
  };

  const yourResponses = responses.filter((r) => r.side === 'yours');
  const opposingResponses = responses.filter((r) => r.side === 'opposing');
  const courtResponses = responses.filter((r) => r.side === 'court');

  const selectedQuestion = stage === 'yours' && !isNewQuestion && questionNum
    ? questions.find((q) => q.id === parseInt(questionNum))
    : null;

  const activeQuestion = (() => {
    if (stage === 'yours') {
      if (isNewQuestion && newQuestionText.trim()) {
        return { id: null, text: newQuestionText.trim(), side: 'yours' as const };
      }
      if (selectedQuestion) {
        return { id: selectedQuestion.id, text: selectedQuestion.originalText, side: 'yours' as const };
      }
      return null;
    }
    if (questionSummary.trim()) {
      return { id: null, text: questionSummary.trim(), side: stage };
    }
    return null;
  })();

  const getQuestionLabel = (response: JurorResponse) => {
    if (response.questionSummary) return response.questionSummary;
    if (response.questionId) {
      const q = questions.find(q => q.id === response.questionId);
      return q ? q.originalText : `Q${response.questionId}`;
    }
    return 'General question';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-4 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" data-testid="text-phase-title">
            Phase 4: Record Responses
          </h2>
          <p className="text-slate-600 mt-1">
            High-speed courtroom data entry. Press Enter to record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSession ? (
            <button
              onClick={() => setShowSharePanel(!showSharePanel)}
              data-testid="button-toggle-share-panel"
              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Users className="w-4 h-4" />
              Team ({sessionParticipants.length})
              <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </button>
          ) : (
            <button
              onClick={handleCreateSession}
              disabled={sessionLoading}
              data-testid="button-share-session"
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {sessionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Share Session
            </button>
          )}
          <button
            onClick={() => setShowNotesPrompt(true)}
            data-testid="button-proceed-review"
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Review Board <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {showSharePanel && activeSession && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid="panel-share-session">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Team Session
            </h3>
            <button
              onClick={() => setShowSharePanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Session Code</label>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-[0.3em] text-slate-900" data-testid="text-session-code">
                  {activeSession.sessionCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  data-testid="button-copy-code"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Copy shareable link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 break-all" data-testid="text-share-link">
                {`${window.location.origin}/team?code=${activeSession.sessionCode}`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Active Participants ({sessionParticipants.length})
              </label>
              {sessionParticipants.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No one has joined yet</p>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {sessionParticipants.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm" data-testid={`text-participant-${p.id}`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-700">{p.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleRevokeSession}
              data-testid="button-revoke-session"
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              <Link2Off className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>
      )}

      <JurySeatingGrid
        jurors={jurors}
        responses={responses}
        seatingConfig={seatingConfig}
        onSeatingConfigChange={onSeatingConfigChange}
        onRecordResponse={onRecordResponse}
        activeQuestion={activeQuestion}
        courtDismissed={courtDismissed}
      />

      <AnimatePresence mode="wait">
        {selectedQuestion ? (
          <motion.div
            key={selectedQuestion.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 shrink-0"
            data-testid="card-active-question"
          >
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm shrink-0">
                Q{selectedQuestion.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{selectedQuestion.originalText}</p>
                {selectedQuestion.rephrase && (
                  <p className="text-xs text-amber-700 mt-1 italic">Rephrase: {selectedQuestion.rephrase}</p>
                )}
                {selectedQuestion.followUps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedQuestion.followUps.map((fu, i) => (
                      <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        {fu}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : isNewQuestion && stage === 'yours' ? (
          <motion.div
            key="new-question"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shrink-0"
            data-testid="card-new-question"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0">
                NEW
              </span>
              <p className="font-medium text-emerald-800 text-sm">
                {newQuestionText.trim() || 'Enter your unplanned question below.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="no-question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0"
            data-testid="card-no-question"
          >
            <p className="text-sm text-slate-400 text-center">
              {stage === 'yours'
                ? 'Enter a question number to see its full text here.'
                : stage === 'court'
                ? 'Recording Court examination responses.'
                : `Recording ${opposingSideLabel.toLowerCase()} examination responses.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              <button
                onClick={() => setStage('court')}
                data-testid="button-stage-court"
                className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  stage === 'court'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Gavel className="w-4 h-4" />
                Court
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center mb-4">
                <Mic className={`w-5 h-5 mr-2 ${stage === 'yours' ? 'text-amber-500' : stage === 'court' ? 'text-amber-600' : 'text-rose-500'}`} />
                <h3 className="font-bold text-slate-900">
                  {stage === 'yours' ? `${yourSideLabel} Examination` : stage === 'court' ? 'Court Examination' : `${opposingSideLabel} Examination`}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {stage === 'yours' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewQuestion(!isNewQuestion);
                          setQuestionNum('');
                          setNewQuestionText('');
                          setError('');
                        }}
                        data-testid="button-toggle-new-question"
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          isNewQuestion
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isNewQuestion ? '← Back to Prepared' : '+ New Question'}
                      </button>
                    </div>
                    {isNewQuestion ? (
                      <>
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
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-lg font-bold"
                            placeholder="e.g. 14"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            data-testid="input-new-question-text"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-sm"
                            placeholder="What did you ask?"
                            required
                          />
                        </div>
                      </>
                    ) : (
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
                    )}
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
                        data-testid={stage === 'court' ? 'input-juror-number-court' : 'input-juror-number-opposing'}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-lg font-bold ${stage === 'court' ? 'focus:ring-2 focus:ring-amber-500' : 'focus:ring-2 focus:ring-rose-500'}`}
                        placeholder="e.g. 14"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                        {stage === 'court' ? 'What did the Court ask?' : `What did ${opposingSideLabel.toLowerCase()} ask?`}
                      </label>
                      <input
                        type="text"
                        value={questionSummary}
                        onChange={(e) => setQuestionSummary(e.target.value)}
                        data-testid={stage === 'court' ? 'input-question-summary-court' : 'input-question-summary'}
                        className={`w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm ${stage === 'court' ? 'focus:ring-2 focus:ring-amber-500' : 'focus:ring-2 focus:ring-rose-500'}`}
                        placeholder={stage === 'court' ? "Summarize the Court's question..." : "Summarize opposing counsel's question..."}
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
                      stage === 'yours' ? 'focus:ring-2 focus:ring-amber-500' : stage === 'court' ? 'focus:ring-2 focus:ring-amber-500' : 'focus:ring-2 focus:ring-rose-500'
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
                      : stage === 'court'
                      ? 'bg-amber-600 text-white hover:bg-amber-500 focus:ring-amber-500'
                      : 'bg-rose-500 text-white hover:bg-rose-400 focus:ring-rose-500'
                  }`}
                >
                  Record Response
                  <span
                    className={`ml-2 text-xs font-normal px-2 py-0.5 rounded border ${
                      stage === 'yours'
                        ? 'text-slate-800 bg-amber-400/50 border-amber-600/20'
                        : stage === 'court'
                        ? 'text-amber-100 bg-amber-500/50 border-amber-400/30'
                        : 'text-rose-100 bg-rose-400/50 border-rose-300/30'
                    }`}
                  >
                    ↵ Enter
                  </span>
                </button>
              </form>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-sm">
            <h3 className="font-bold text-slate-100 mb-4 text-sm uppercase tracking-wider">
              Session Stats
            </h3>
            <div className="grid grid-cols-4 gap-3">
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
              <div className="bg-slate-800 p-3 rounded-xl">
                <div className="text-2xl font-bold text-amber-400" data-testid="text-court-responses">
                  {courtResponses.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Court</div>
              </div>
            </div>
            <div className="mt-3 bg-slate-800 p-3 rounded-xl">
              <div className="text-2xl font-bold text-blue-400" data-testid="text-jurors-spoke">
                {new Set(responses.map((r) => r.jurorNumber)).size}
              </div>
              <div className="text-xs text-slate-400 mt-1">Jurors Spoke</div>
            </div>
          </div>

          {markedFollowUps.length > 0 && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowMarkedSection(!showMarkedSection)}
                className="w-full bg-violet-50 border-b border-violet-200 p-4 flex justify-between items-center"
                data-testid="button-toggle-marked-section"
              >
                <h3 className="font-bold text-violet-900 flex items-center text-sm">
                  <Bookmark className="w-4 h-4 mr-2 text-violet-500" />
                  Marked Follow-ups ({markedFollowUps.length})
                </h3>
                {showMarkedSection ? (
                  <ChevronUp className="w-4 h-4 text-violet-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-violet-400" />
                )}
              </button>
              <AnimatePresence>
                {showMarkedSection && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                      {markedFollowUps.map((m) => {
                        const isOpen = expandedMarked[m.id] || false;
                        return (
                          <div
                            key={m.id}
                            className="border border-violet-100 rounded-xl overflow-hidden"
                            data-testid={`card-marked-${m.id}`}
                          >
                            <button
                              onClick={() => setExpandedMarked(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-violet-50/50 hover:bg-violet-50 transition-colors text-left"
                              data-testid={`button-toggle-marked-${m.id}`}
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-violet-900">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-600 text-white font-bold text-xs shrink-0">
                                  #{m.jurorNumber}
                                </span>
                                {m.jurorName}
                              </span>
                              {isOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              )}
                            </button>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3 pt-1 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-violet-600 text-white font-bold text-[10px]">
                                        #{m.jurorNumber}
                                      </span>
                                      {m.jurorName}
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                      <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                                        <HelpCircle className="w-3 h-3 mr-1" />
                                        Original Question
                                      </div>
                                      <p className="text-xs text-slate-600">
                                        {getQuestionLabel(m.parentResponse)}
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                      <div className="text-xs font-semibold text-slate-500 mb-1">Response</div>
                                      <p className="text-xs text-slate-700">&ldquo;<ReactionText text={m.parentResponse.responseText} />&rdquo;</p>
                                    </div>
                                    <div className="bg-violet-50 rounded-lg p-2.5 border border-violet-200">
                                      <div className="text-xs font-semibold text-violet-600 mb-1 flex items-center">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Suggested Follow-up
                                      </div>
                                      <p className="text-xs text-violet-800 font-medium">{m.suggestionText}</p>
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
            </div>
          )}
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
                  const isCourt = response.side === 'court';
                  const isExpanded = expandedResponseId === response.id;
                  const sk = stableKey(response);
                  const suggestions = suggestionsMap[sk] || [];
                  const isLoadingSuggestion = loadingSuggestions[sk] || false;
                  return (
                    <motion.div
                      key={response.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      data-testid={`card-response-${response.id}`}
                      className={`rounded-xl border shadow-sm transition-all ${
                        isCourt ? 'bg-amber-50/30 border-amber-200' : isOpposing ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-200'
                      } ${isExpanded ? 'ring-2 ring-amber-300' : ''}`}
                    >
                      <div
                        className="p-4 cursor-pointer select-none"
                        onClick={() => toggleExpanded(response.id)}
                        data-testid={`button-expand-response-${response.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm ${
                                isCourt ? 'bg-amber-600' : isOpposing ? 'bg-rose-600' : 'bg-slate-900'
                              }`}
                            >
                              #{response.jurorNumber}
                            </span>
                            <span className="font-medium text-slate-900">
                              {juror?.name || 'Unknown'}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isCourt
                                  ? 'bg-amber-100 text-amber-700'
                                  : isOpposing
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isCourt ? 'Court' : isOpposing ? opposingSideLabel : yourSideLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">
                              {formatTime(response.timestamp)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        <div className="pl-10">
                          {isCourt ? (
                            <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center">
                              <Gavel className="w-3 h-3 mr-1" />
                              {response.questionSummary}
                            </div>
                          ) : isOpposing ? (
                            <div className="text-xs font-semibold text-rose-600 mb-1 flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              {response.questionSummary}
                            </div>
                          ) : response.questionId === null && response.questionSummary ? (
                            <div className="text-xs font-semibold text-emerald-600 mb-1 flex items-center">
                              <HelpCircle className="w-3 h-3 mr-1" />
                              New: {response.questionSummary}
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                              <HelpCircle className="w-3 h-3 mr-1" />
                              Q{response.questionId}
                            </div>
                          )}
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            &ldquo;<ReactionText text={response.responseText} />&rdquo;
                          </p>
                          {response.recordedBy && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1" data-testid={`text-recorded-by-${response.id}`}>
                              <User className="w-3 h-3" />
                              by {response.recordedBy}
                            </p>
                          )}

                          {response.followUps && response.followUps.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {response.followUps.map((fu, idx) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  {fu.question ? (
                                    <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                                      <CornerDownRight className="w-3 h-3 mr-1" />
                                      {fu.question}
                                    </div>
                                  ) : (
                                    <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center">
                                      <CornerDownRight className="w-3 h-3 mr-1" />
                                      Follow-up response
                                    </div>
                                  )}
                                  <p className="text-sm text-slate-700">
                                    "{fu.answer}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {!isOpposing && !isCourt && (isLoadingSuggestion || suggestions.length > 0 || (askingFollowUp && askingFollowUp.responseId === response.id)) && (
                        <div className="px-4 pb-3 pl-14" onClick={(e) => e.stopPropagation()}>
                          <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Suggested Follow-ups
                              </span>
                            </div>
                            {isLoadingSuggestion && (
                              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating suggestions...
                              </div>
                            )}
                            <div className="space-y-1.5">
                              {suggestions.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 group"
                                  data-testid={`suggestion-${response.id}-${idx}`}
                                >
                                  <p className="flex-1 text-xs text-slate-600 leading-relaxed pt-0.5">
                                    {s}
                                  </p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleAskFollowUp(response.id, s, sk)}
                                      className="text-xs font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                      data-testid={`button-ask-${response.id}-${idx}`}
                                    >
                                      Ask
                                    </button>
                                    <button
                                      onClick={() => handleMarkFollowUp(response, s)}
                                      className="text-xs font-medium px-2 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                                      data-testid={`button-mark-${response.id}-${idx}`}
                                    >
                                      Mark
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {askingFollowUp && askingFollowUp.responseId === response.id && (
                              <div className="mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200">
                                <div className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center">
                                  <CornerDownRight className="w-3 h-3 mr-1" />
                                  {askingFollowUp.suggestion}
                                </div>
                                <textarea
                                  ref={askFollowUpRef}
                                  value={askFollowUpAnswer}
                                  onChange={(e) => setAskFollowUpAnswer(e.target.value)}
                                  placeholder="Record juror's response..."
                                  className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white text-sm resize-none"
                                  rows={2}
                                  data-testid={`input-ask-followup-answer-${response.id}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSubmitAskedFollowUp();
                                    }
                                    if (e.key === 'Escape') {
                                      setAskingFollowUp(null);
                                      setAskFollowUpAnswer('');
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={handleSubmitAskedFollowUp}
                                    disabled={!askFollowUpAnswer.trim()}
                                    className="inline-flex items-center px-3 py-1.5 bg-amber-500 text-slate-900 font-semibold text-xs rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
                                    data-testid={`button-submit-ask-followup-${response.id}`}
                                  >
                                    <Send className="w-3 h-3 mr-1" />
                                    Record
                                    <span className="ml-1.5 text-[10px] font-normal text-slate-700 bg-amber-400/50 px-1 py-0.5 rounded border border-amber-600/20">
                                      ↵
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => { setAskingFollowUp(null); setAskFollowUpAnswer(''); }}
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                    data-testid={`button-cancel-ask-followup-${response.id}`}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0">
                              <div className="border-t border-slate-200 pt-3 pl-10">
                                <div className="flex items-center gap-2 mb-3">
                                  <CornerDownRight className="w-4 h-4 text-amber-500" />
                                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Add Follow-up
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                                      Follow-up Question
                                    </label>
                                    <input
                                      type="text"
                                      value={followUpQuestion}
                                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`input-followup-question-${response.id}`}
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm"
                                      placeholder="Follow-up question (optional)"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                                      Juror's Answer
                                    </label>
                                    <textarea
                                      ref={followUpAnswerRef}
                                      value={followUpAnswer}
                                      onChange={(e) => setFollowUpAnswer(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      data-testid={`input-followup-answer-${response.id}`}
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-slate-50 text-sm resize-none"
                                      rows={2}
                                      placeholder="Juror's response..."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleFollowUpSubmit(response);
                                        }
                                      }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFollowUpSubmit(response);
                                    }}
                                    disabled={!followUpAnswer.trim()}
                                    data-testid={`button-submit-followup-${response.id}`}
                                    className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 font-semibold text-sm rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors"
                                  >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    Record Follow-up
                                    <span className="ml-2 text-xs font-normal text-slate-700 bg-amber-400/50 px-1.5 py-0.5 rounded border border-amber-600/20">
                                      ↵
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNotesPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowNotesPrompt(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
              data-testid="notes-transition-prompt"
            >
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <StickyNote className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Add Observations Before Review</h3>
                    <p className="text-sm text-slate-500">Body language, tone, and demeanor cannot be captured from responses alone.</p>
                  </div>
                </div>
                <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <Eye className="w-3 h-3 inline mr-1" />
                    Your notes directly improve AI risk assessments. Even brief observations help distinguish jurors who gave similar verbal responses.
                  </p>
                </div>
              </div>

              {(() => {
                const activeJurors = jurors.filter(j => !courtDismissed.includes(j.number)).sort((a, b) => a.number - b.number);
                const currentJuror = activeJurors[notesWalkthroughIdx];
                if (!currentJuror) return null;
                const jurorResponses = responses.filter(r => r.jurorNumber === currentJuror.number);
                const existingNotes = currentJuror.notes || '';
                const draftNotes = walkthroughNotes[currentJuror.number] ?? existingNotes;
                const draftTags = walkthroughTags[currentJuror.number] || [];

                return (
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Juror {notesWalkthroughIdx + 1} of {activeJurors.length}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setNotesWalkthroughIdx(Math.max(0, notesWalkthroughIdx - 1))}
                          disabled={notesWalkthroughIdx === 0}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          data-testid="button-notes-prev"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setNotesWalkthroughIdx(Math.min(activeJurors.length - 1, notesWalkthroughIdx + 1))}
                          disabled={notesWalkthroughIdx === activeJurors.length - 1}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          data-testid="button-notes-next"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-slate-900">#{currentJuror.number}</span>
                        <span className="text-sm text-slate-600">{currentJuror.name || 'Unnamed'}</span>
                        {currentJuror.occupation && (
                          <span className="text-xs text-slate-400">· {currentJuror.occupation}</span>
                        )}
                      </div>
                      {jurorResponses.length > 0 ? (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {jurorResponses.slice(-3).map((r, i) => (
                            <div key={i} className="text-xs text-slate-500 truncate">
                              {r.responseText.startsWith('[') ? (
                                <ReactionText text={r.responseText} className="text-xs" />
                              ) : (
                                <span>"{r.responseText.slice(0, 80)}{r.responseText.length > 80 ? '...' : ''}"</span>
                              )}
                            </div>
                          ))}
                          {jurorResponses.length > 3 && (
                            <div className="text-[10px] text-slate-400">+{jurorResponses.length - 3} more responses</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No responses recorded</div>
                      )}
                    </div>

                    <div className="mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {DEMEANOR_TAGS.map(tag => {
                        const isActive = draftTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              setWalkthroughTags(prev => {
                                const curr = prev[currentJuror.number] || [];
                                return {
                                  ...prev,
                                  [currentJuror.number]: isActive
                                    ? curr.filter(t => t !== tag)
                                    : [...curr, tag]
                                };
                              });
                            }}
                            data-testid={`button-walkthrough-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={draftNotes}
                      onChange={(e) => setWalkthroughNotes(prev => ({ ...prev, [currentJuror.number]: e.target.value }))}
                      placeholder="Additional observations — tone of voice, body language, interactions with other jurors..."
                      className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-sm resize-none min-h-[80px] outline-none"
                      data-testid={`textarea-walkthrough-notes-${currentJuror.number}`}
                    />
                  </div>
                );
              })()}

              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowNotesPrompt(false);
                    onProceed();
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  data-testid="button-skip-notes"
                >
                  Skip — proceed without notes
                </button>
                <button
                  onClick={() => {
                    const activeJurors = jurors.filter(j => !courtDismissed.includes(j.number));
                    activeJurors.forEach(j => {
                      const tags = walkthroughTags[j.number] || [];
                      const wasDraftEdited = j.number in walkthroughNotes;
                      const existingNotes = j.notes || '';

                      if (tags.length === 0 && !wasDraftEdited) return;

                      const baseText = wasDraftEdited ? walkthroughNotes[j.number].trim() : existingNotes.trim();
                      const tagSuffix = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
                      const combinedNotes = (baseText + tagSuffix).trim();

                      if (combinedNotes !== existingNotes.trim()) {
                        onUpdateJuror(j.number, { notes: combinedNotes });
                      }
                    });
                    setShowNotesPrompt(false);
                    onProceed();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  data-testid="button-save-notes-proceed"
                >
                  Save & Continue <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
