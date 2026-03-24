import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Scale, Wifi, WifiOff, Loader2, LogOut,
  MessageSquare, ChevronDown, ChevronUp,
  CheckCircle2, Sparkles, Send,
  AArrowUp, AArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCollabSession, clearCollabSession } from '../lib/collabAuth';
import { useCollaborativeSession, ConnectionStatus } from '../hooks/useCollaborativeSession';
import * as api from '../lib/api';

interface CollabQuestion {
  id: string;
  questionNumber: number;
  originalText: string;
  rephrase: string;
  followUps: string[];
  locked: boolean;
}

interface FollowUpSuggestion {
  text: string;
  jurorNumber: number;
  jurorName: string;
  questionId: string;
  timestamp: number;
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { icon: Wifi, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Connected' },
    connecting: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Connecting...' },
    reconnecting: { icon: WifiOff, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Reconnecting...' },
    disconnected: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-50', label: 'Disconnected' },
  }[status];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`} data-testid="status-connection">
      <Icon className={`w-3.5 h-3.5 ${status === 'connecting' || status === 'reconnecting' ? 'animate-spin' : ''}`} />
      {config.label}
    </div>
  );
}

export default function QuestionAskerView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const session = getCollabSession();

  const FONT_SIZES = [
    { label: 'S', text: 'text-sm', sub: 'text-xs', leading: 'leading-relaxed' },
    { label: 'M', text: 'text-base', sub: 'text-sm', leading: 'leading-relaxed' },
    { label: 'L', text: 'text-lg', sub: 'text-sm', leading: 'leading-relaxed' },
    { label: 'XL', text: 'text-xl', sub: 'text-base', leading: 'leading-relaxed' },
    { label: '2XL', text: 'text-2xl', sub: 'text-lg', leading: 'leading-snug' },
  ];

  const [questions, setQuestions] = useState<CollabQuestion[]>([]);
  const [caseInfo, setCaseInfo] = useState<{ id: string; name: string; lastPhase: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, FollowUpSuggestion[]>>({});
  const [sentQuestion, setSentQuestion] = useState<string | null>(null);
  const [sentFollowUpKey, setSentFollowUpKey] = useState<string | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());
  const [newSuggestionQuestionId, setNewSuggestionQuestionId] = useState<string | null>(null);
  const [fontSizeIdx, setFontSizeIdx] = useState(() => {
    const saved = localStorage.getItem('qa-font-size');
    return saved ? Math.min(parseInt(saved, 10), 4) : 0;
  });
  const sentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentFollowUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionHighlightRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fontSize = FONT_SIZES[fontSizeIdx];

  const increaseFontSize = () => {
    const next = Math.min(fontSizeIdx + 1, FONT_SIZES.length - 1);
    setFontSizeIdx(next);
    localStorage.setItem('qa-font-size', next.toString());
  };

  const decreaseFontSize = () => {
    const next = Math.max(fontSizeIdx - 1, 0);
    setFontSizeIdx(next);
    localStorage.setItem('qa-font-size', next.toString());
  };

  useEffect(() => {
    if (!session) {
      setLocation('/team');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [q, ci] = await Promise.all([
        api.collabGetQuestions(),
        api.collabGetCaseInfo(),
      ]);
      setQuestions(q);
      setCaseInfo(ci);
    } catch (err: any) {
      toast({ title: 'Error loading session data', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpSuggestions = useCallback((data: any) => {
    if (!data.suggestions || !data.questionId) return;
    const questionId = data.questionId.toString();
    const newSuggestions: FollowUpSuggestion[] = data.suggestions.map((s: string) => ({
      text: s,
      jurorNumber: data.jurorNumber,
      jurorName: data.jurorName || `Juror #${data.jurorNumber}`,
      questionId,
      timestamp: Date.now(),
    }));
    setAiSuggestions(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...newSuggestions],
    }));

    setCollapsedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });

    setNewSuggestionQuestionId(questionId);
    if (suggestionHighlightRef.current) clearTimeout(suggestionHighlightRef.current);
    suggestionHighlightRef.current = setTimeout(() => setNewSuggestionQuestionId(null), 3000);

    setTimeout(() => {
      const el = document.getElementById(`suggestions-${questionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }, []);

  const handleParticipantJoined = useCallback((data: any) => {
    toast({ title: `${data.displayName} joined the session` });
  }, [toast]);

  const handleParticipantLeft = useCallback((data: any) => {
    toast({ title: `${data.displayName} left the session`, variant: 'destructive' });
  }, [toast]);

  const handlePhaseChanged = useCallback((data: any) => {
    const current = data.currentPhase ?? data.phase;
    if (current >= 6) {
      toast({ title: 'Session ended', description: 'The case has moved to the final report phase.' });
    }
  }, [toast]);

  const handleSessionRevoked = useCallback(() => {
    toast({ title: 'Session ended', description: 'The lead attorney has ended this session.', variant: 'destructive' });
    clearCollabSession();
    setLocation('/team');
  }, [toast, setLocation]);

  const handleQuestionSetActive = useCallback((data: any) => {
    if (data.questionText) {
      toast({ title: 'Active question updated', description: `Set by ${data.setBy}` });
    }
  }, [toast]);

  const { status } = useCollaborativeSession({
    sessionId: session?.sessionId || null,
    isOwner: false,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft,
    onPhaseChanged: handlePhaseChanged,
    onSessionRevoked: handleSessionRevoked,
    onQuestionSetActive: handleQuestionSetActive,
    onFollowUpSuggestions: handleFollowUpSuggestions,
  });

  const handleTapQuestion = async (question: CollabQuestion) => {
    const text = question.rephrase || question.originalText;
    try {
      await api.collabSetActiveQuestion(question.questionNumber, text, false);
      setSentQuestion(text);
      if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
      sentTimeoutRef.current = setTimeout(() => setSentQuestion(null), 2000);
      toast({ title: 'Question sent to recorders' });
    } catch (err: any) {
      toast({ title: 'Failed to send question', description: err.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleTapFollowUp = async (text: string, parentQuestionNumber: number, followUpKey: string) => {
    try {
      await api.collabSetActiveQuestion(parentQuestionNumber, text, true);
      setSentFollowUpKey(followUpKey);
      if (sentFollowUpTimeoutRef.current) clearTimeout(sentFollowUpTimeoutRef.current);
      sentFollowUpTimeoutRef.current = setTimeout(() => setSentFollowUpKey(null), 2000);
      toast({ title: 'Follow-up sent to recorders' });
    } catch (err: any) {
      toast({ title: 'Failed to send follow-up', description: err.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleLeave = () => {
    clearCollabSession();
    setLocation('/team');
  };

  const toggleCollapse = (questionNumber: string) => {
    setCollapsedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionNumber)) {
        next.delete(questionNumber);
      } else {
        next.add(questionNumber);
      }
      return next;
    });
  };

  const handleDismissSuggestion = (questionId: string, idx: number) => {
    setAiSuggestions(prev => {
      const list = [...(prev[questionId] || [])];
      list.splice(idx, 1);
      return { ...prev, [questionId]: list };
    });
  };

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-slate-500 text-sm">Loading questions...</p>
        </div>
      </div>
    );
  }

  const totalSuggestions = Object.values(aiSuggestions).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Scale className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate" data-testid="text-case-name">{caseInfo?.name || 'Questions'}</h1>
              <p className="text-xs text-slate-400 truncate">{session.displayName} — Question Asker</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-800 rounded-lg" data-testid="control-font-size">
              <button
                onClick={decreaseFontSize}
                disabled={fontSizeIdx === 0}
                data-testid="button-font-decrease"
                className="p-1.5 rounded-l-lg hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease font size"
              >
                <AArrowDown className="w-4 h-4" />
              </button>
              <span className="px-1 text-[10px] text-slate-400 font-medium min-w-[24px] text-center">{fontSize.label}</span>
              <button
                onClick={increaseFontSize}
                disabled={fontSizeIdx === FONT_SIZES.length - 1}
                data-testid="button-font-increase"
                className="p-1.5 rounded-r-lg hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase font size"
              >
                <AArrowUp className="w-4 h-4" />
              </button>
            </div>
            <ConnectionIndicator status={status} />
            <button
              onClick={handleLeave}
              data-testid="button-leave-session"
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {sentQuestion && (
          <div className="bg-emerald-600 px-4 py-2 flex items-center gap-2 text-sm" data-testid="status-question-sent">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Sent to recorders</span>
          </div>
        )}

      </header>

      <main className="flex-1 overflow-y-auto pb-safe" ref={scrollContainerRef}>
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1 mb-2 flex items-center justify-between">
            <span>Tap a question to send it to recorders</span>
            {totalSuggestions > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold normal-case tracking-normal" data-testid="badge-total-suggestions">
                <Sparkles className="w-3 h-3" />
                {totalSuggestions} AI suggestion{totalSuggestions !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {questions.map((q) => {
            const qKey = q.questionNumber.toString();
            const qSuggestions = aiSuggestions[qKey] || [];
            const hasFollowUps = q.followUps.length > 0 || qSuggestions.length > 0;
            const isCollapsed = collapsedQuestions.has(qKey);
            const isHighlighted = newSuggestionQuestionId === qKey;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isHighlighted ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}
                data-testid={`card-question-${q.id}`}
              >
                <button
                  onClick={() => handleTapQuestion(q)}
                  className="w-full text-left p-4 active:bg-amber-50 transition-colors"
                  data-testid={`button-ask-question-${q.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                      {q.questionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${fontSize.text} font-medium text-slate-900 ${fontSize.leading}`}>
                        {q.rephrase || q.originalText}
                      </p>
                      {q.rephrase && q.originalText && q.rephrase !== q.originalText && (
                        <p className={`${fontSize.sub} text-slate-400 mt-1 ${fontSize.leading}`}>
                          Original: {q.originalText}
                        </p>
                      )}
                    </div>
                    <Send className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>
                </button>

                {hasFollowUps && (
                  <>
                    <button
                      onClick={() => toggleCollapse(qKey)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                      data-testid={`button-toggle-followups-${q.id}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {q.followUps.length + qSuggestions.length} follow-up{q.followUps.length + qSuggestions.length !== 1 ? 's' : ''}
                        {qSuggestions.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                            <Sparkles className="w-2.5 h-2.5" />
                            {qSuggestions.length} AI
                          </span>
                        )}
                      </span>
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>

                    {!isCollapsed && (
                      <div className="border-t border-slate-100" id={`suggestions-${qKey}`}>
                        {q.followUps.map((fu, idx) => {
                          const fuKey = `prepared-${q.questionNumber}-${idx}`;
                          const isSent = sentFollowUpKey === fuKey;
                          return (
                            <div
                              key={fuKey}
                              className="flex items-center border-b border-slate-50 last:border-b-0"
                            >
                              <button
                                onClick={() => handleTapFollowUp(fu, q.questionNumber, fuKey)}
                                className="flex-1 text-left px-4 py-3 active:bg-amber-50 transition-colors flex items-start gap-3"
                                data-testid={`button-followup-prepared-${q.id}-${idx}`}
                              >
                                <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                                  <MessageSquare className="w-3 h-3 text-slate-400" />
                                </div>
                                <p className={`${fontSize.text} text-slate-700 ${fontSize.leading} flex-1`}>{fu}</p>
                              </button>
                              <button
                                onClick={() => handleTapFollowUp(fu, q.questionNumber, fuKey)}
                                className={`shrink-0 mr-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  isSent
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-500 text-white active:bg-amber-600 hover:bg-amber-600'
                                }`}
                                data-testid={`button-ask-followup-${q.id}-${idx}`}
                              >
                                {isSent ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Sent
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Send className="w-3 h-3" />
                                    Ask
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}

                        {qSuggestions.length > 0 && q.followUps.length > 0 && (
                          <div className="px-4 py-1.5 bg-amber-50/50 border-b border-amber-100/50">
                            <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI-Suggested Follow-ups
                            </p>
                          </div>
                        )}

                        {qSuggestions.map((s, idx) => {
                          const sKey = `ai-${q.questionNumber}-${idx}-${s.timestamp}`;
                          const isSent = sentFollowUpKey === sKey;
                          return (
                            <div
                              key={sKey}
                              className="flex items-center border-b border-amber-100/30 last:border-b-0 bg-amber-50/40"
                            >
                              <button
                                onClick={() => handleTapFollowUp(s.text, q.questionNumber, sKey)}
                                className="flex-1 text-left px-4 py-3 active:bg-amber-100/50 transition-colors flex items-start gap-3"
                                data-testid={`button-followup-ai-${q.id}-${idx}`}
                              >
                                <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`${fontSize.text} text-slate-700 ${fontSize.leading}`}>{s.text}</p>
                                  <p className="text-[10px] text-amber-600/70 mt-0.5">
                                    Based on Juror #{s.jurorNumber} ({s.jurorName})
                                  </p>
                                </div>
                              </button>
                              <div className="shrink-0 mr-3 flex items-center gap-1">
                                <button
                                  onClick={() => handleTapFollowUp(s.text, q.questionNumber, sKey)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isSent
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-500 text-white active:bg-amber-600 hover:bg-amber-600'
                                  }`}
                                  data-testid={`button-ask-ai-followup-${q.id}-${idx}`}
                                >
                                  {isSent ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Sent
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Send className="w-3 h-3" />
                                      Ask
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDismissSuggestion(qKey, idx)}
                                  className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors"
                                  aria-label="Dismiss suggestion"
                                  data-testid={`button-dismiss-ai-followup-${q.id}-${idx}`}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {questions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No questions available yet.</p>
              <p className="text-xs mt-1">Questions will appear here once the lead attorney adds them.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
