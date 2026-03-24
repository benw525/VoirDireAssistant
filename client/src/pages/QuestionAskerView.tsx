import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Scale, Wifi, WifiOff, Loader2, LogOut,
  MessageSquare, CheckCircle2, Sparkles, Send,
  AArrowUp, AArrowDown, Bookmark, BookmarkCheck
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

interface SavedFollowUp {
  text: string;
  jurorNumber: number;
  jurorName: string;
  status: 'asked' | 'marked';
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
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, FollowUpSuggestion[]>>({});
  const [savedFollowUps, setSavedFollowUps] = useState<Record<string, SavedFollowUp[]>>({});
  const [sentQuestion, setSentQuestion] = useState<string | null>(null);
  const [sentFollowUpKey, setSentFollowUpKey] = useState<string | null>(null);
  const [activeQuestionKey, setActiveQuestionKey] = useState<string | null>(null);
  const [fontSizeIdx, setFontSizeIdx] = useState(() => {
    const saved = localStorage.getItem('qa-font-size');
    return saved ? Math.min(parseInt(saved, 10), 4) : 0;
  });
  const sentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentFollowUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const activeQuestionKeyRef = useRef<string | null>(null);
  activeQuestionKeyRef.current = activeQuestionKey;

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

    const currentActive = activeQuestionKeyRef.current;
    if (currentActive && questionId !== currentActive) {
      setSavedFollowUps(prev => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), ...newSuggestions.map(s => ({
          text: s.text,
          jurorNumber: s.jurorNumber,
          jurorName: s.jurorName,
          status: 'marked' as const,
          timestamp: s.timestamp,
        }))],
      }));
      return;
    }

    setPendingSuggestions(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...newSuggestions],
    }));

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
    const qKey = question.questionNumber.toString();
    try {
      await api.collabSetActiveQuestion(question.questionNumber, text, false);
      setSentQuestion(text);
      if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
      sentTimeoutRef.current = setTimeout(() => setSentQuestion(null), 2000);

      if (activeQuestionKey && activeQuestionKey !== qKey) {
        setPendingSuggestions(prev => {
          const next = { ...prev };
          delete next[activeQuestionKey!];
          return next;
        });
      }
      setActiveQuestionKey(qKey);

      toast({ title: 'Question sent to recorders' });
    } catch (err: any) {
      toast({ title: 'Failed to send question', description: err.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleAskFollowUp = async (suggestion: FollowUpSuggestion, parentQuestionNumber: number, suggestionIdx: number) => {
    const qKey = parentQuestionNumber.toString();
    const followUpKey = `ask-${qKey}-${suggestionIdx}-${suggestion.timestamp}`;
    try {
      await api.collabSetActiveQuestion(parentQuestionNumber, suggestion.text, true);
      setSentFollowUpKey(followUpKey);
      if (sentFollowUpTimeoutRef.current) clearTimeout(sentFollowUpTimeoutRef.current);
      sentFollowUpTimeoutRef.current = setTimeout(() => setSentFollowUpKey(null), 2000);

      setSavedFollowUps(prev => ({
        ...prev,
        [qKey]: [...(prev[qKey] || []), {
          text: suggestion.text,
          jurorNumber: suggestion.jurorNumber,
          jurorName: suggestion.jurorName,
          status: 'asked',
          timestamp: suggestion.timestamp,
        }],
      }));

      setPendingSuggestions(prev => {
        const list = [...(prev[qKey] || [])];
        list.splice(suggestionIdx, 1);
        return { ...prev, [qKey]: list };
      });

      toast({ title: 'Follow-up sent to recorders' });
    } catch (err: any) {
      toast({ title: 'Failed to send follow-up', description: err.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleMarkFollowUp = (suggestion: FollowUpSuggestion, parentQuestionNumber: number, suggestionIdx: number) => {
    const qKey = parentQuestionNumber.toString();
    setSavedFollowUps(prev => ({
      ...prev,
      [qKey]: [...(prev[qKey] || []), {
        text: suggestion.text,
        jurorNumber: suggestion.jurorNumber,
        jurorName: suggestion.jurorName,
        status: 'marked',
        timestamp: suggestion.timestamp,
      }],
    }));

    setPendingSuggestions(prev => {
      const list = [...(prev[qKey] || [])];
      list.splice(suggestionIdx, 1);
      return { ...prev, [qKey]: list };
    });

    toast({ title: 'Follow-up marked for later' });
  };

  const handleAskSavedFollowUp = async (saved: SavedFollowUp, parentQuestionNumber: number, savedIdx: number) => {
    const qKey = parentQuestionNumber.toString();
    const followUpKey = `saved-${qKey}-${savedIdx}-${saved.timestamp}`;
    try {
      await api.collabSetActiveQuestion(parentQuestionNumber, saved.text, true);
      setSentFollowUpKey(followUpKey);
      if (sentFollowUpTimeoutRef.current) clearTimeout(sentFollowUpTimeoutRef.current);
      sentFollowUpTimeoutRef.current = setTimeout(() => setSentFollowUpKey(null), 2000);

      setSavedFollowUps(prev => {
        const list = [...(prev[qKey] || [])];
        list[savedIdx] = { ...list[savedIdx], status: 'asked' };
        return { ...prev, [qKey]: list };
      });

      toast({ title: 'Follow-up sent to recorders' });
    } catch (err: any) {
      toast({ title: 'Failed to send follow-up', description: err.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleTapPreparedFollowUp = async (text: string, parentQuestionNumber: number, followUpKey: string) => {
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

      <main className="flex-1 overflow-y-auto pb-safe">
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-medium px-1 mb-2">
            Tap a question to send it to recorders
          </div>

          {questions.map((q) => {
            const qKey = q.questionNumber.toString();
            const qPending = pendingSuggestions[qKey] || [];
            const qSaved = savedFollowUps[qKey] || [];
            const isActive = activeQuestionKey === qKey;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isActive ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'}`}
                data-testid={`card-question-${q.id}`}
              >
                {/* Main question button */}
                <button
                  onClick={() => handleTapQuestion(q)}
                  className="w-full text-left p-4 active:bg-amber-50 transition-colors"
                  data-testid={`button-ask-question-${q.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
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

                {/* Prepared follow-ups (always visible if they exist) */}
                {q.followUps.length > 0 && (
                  <div className="border-t border-slate-100">
                    {q.followUps.map((fu, idx) => {
                      const fuKey = `prepared-${q.questionNumber}-${idx}`;
                      const isSent = sentFollowUpKey === fuKey;
                      return (
                        <div
                          key={fuKey}
                          className="flex items-center border-b border-slate-50 last:border-b-0 px-4 py-2.5"
                        >
                          <div className="flex-1 flex items-start gap-2.5 min-w-0">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <p className={`${fontSize.sub} text-slate-600 ${fontSize.leading} flex-1`}>{fu}</p>
                          </div>
                          <button
                            onClick={() => handleTapPreparedFollowUp(fu, q.questionNumber, fuKey)}
                            className={`shrink-0 ml-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              isSent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-500 text-white active:bg-amber-600 hover:bg-amber-600'
                            }`}
                            data-testid={`button-ask-followup-${q.id}-${idx}`}
                          >
                            {isSent ? (
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>
                            ) : (
                              <span className="flex items-center gap-1"><Send className="w-3 h-3" /> Ask</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Saved follow-ups (asked or marked — always visible) */}
                {qSaved.length > 0 && (
                  <div className="border-t border-slate-100">
                    {qSaved.map((s, idx) => {
                      const sKey = `saved-${q.questionNumber}-${idx}-${s.timestamp}`;
                      const isSent = sentFollowUpKey === sKey;
                      return (
                        <div
                          key={sKey}
                          className={`flex items-center border-b border-slate-50 last:border-b-0 px-4 py-2.5 ${
                            s.status === 'asked' ? 'bg-emerald-50/40' : 'bg-violet-50/40'
                          }`}
                          data-testid={`saved-followup-${q.id}-${idx}`}
                        >
                          <div className="flex-1 min-w-0 flex items-start gap-2.5">
                            {s.status === 'asked' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <BookmarkCheck className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`${fontSize.sub} text-slate-700 ${fontSize.leading}`}>{s.text}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {s.status === 'asked' ? 'Asked' : 'Marked'} · re: Juror #{s.jurorNumber} ({s.jurorName})
                              </p>
                            </div>
                          </div>
                          {s.status === 'marked' && (
                            <button
                              onClick={() => handleAskSavedFollowUp(s, q.questionNumber, idx)}
                              className={`shrink-0 ml-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                isSent
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-500 text-white active:bg-amber-600 hover:bg-amber-600'
                              }`}
                              data-testid={`button-ask-saved-${q.id}-${idx}`}
                            >
                              {isSent ? (
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>
                              ) : (
                                <span className="flex items-center gap-1"><Send className="w-3 h-3" /> Ask</span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending AI suggestions (only shown for active question, cleared when switching) */}
                {qPending.length > 0 && isActive && (
                  <div className="border-t-2 border-amber-200" id={`suggestions-${qKey}`}>
                    <div className="px-4 py-2 bg-amber-50 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
                        Suggested Follow-ups
                      </p>
                    </div>
                    {qPending.map((s, idx) => (
                      <div
                        key={`pending-${idx}-${s.timestamp}`}
                        className="flex items-start border-b border-amber-100/50 last:border-b-0 bg-amber-50/30 px-4 py-3"
                        data-testid={`pending-suggestion-${q.id}-${idx}`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className={`${fontSize.text} text-slate-800 ${fontSize.leading}`}>{s.text}</p>
                          <p className="text-[10px] text-amber-600/70 mt-0.5">
                            re: Juror #{s.jurorNumber} ({s.jurorName})
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <button
                            onClick={() => handleAskFollowUp(s, q.questionNumber, idx)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 text-white active:bg-amber-600 hover:bg-amber-600 transition-all"
                            data-testid={`button-ask-suggestion-${q.id}-${idx}`}
                          >
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" /> Ask</span>
                          </button>
                          <button
                            onClick={() => handleMarkFollowUp(s, q.questionNumber, idx)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-100 text-violet-700 active:bg-violet-200 hover:bg-violet-200 transition-all"
                            data-testid={`button-mark-suggestion-${q.id}-${idx}`}
                          >
                            <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> Mark</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
