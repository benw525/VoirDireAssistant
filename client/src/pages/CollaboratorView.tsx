import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useLocation } from 'wouter';
import {
  Scale, Users, Wifi, WifiOff, Loader2, LogOut,
  Mic, Shield, Gavel, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, User, Send, MessageSquare,
  Hand, ThumbsUp, ThumbsDown, StickyNote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCollabSession, clearCollabSession } from '../lib/collabAuth';
import { useCollaborativeSession, ConnectionStatus } from '../hooks/useCollaborativeSession';
import * as api from '../lib/api';
import type { JurorResponse } from '../types';

type CollabPhase = 'recording' | 'report';

interface CollabJuror {
  number: number;
  name: string;
  notes?: string;
}

interface CollabQuestion {
  id: string;
  questionNumber: number;
  originalText: string;
  rephrase: string;
  followUps: string[];
  locked: boolean;
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

export default function CollaboratorView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const session = getCollabSession();

  const [phase, setPhase] = useState<CollabPhase>('recording');
  const [jurors, setJurors] = useState<CollabJuror[]>([]);
  const [questions, setQuestions] = useState<CollabQuestion[]>([]);
  const [responses, setResponses] = useState<JurorResponse[]>([]);
  const [caseInfo, setCaseInfo] = useState<{ id: string; name: string; lastPhase: number; seatingConfig: any } | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recordingDisabled, setRecordingDisabled] = useState(false);
  const [typingIndicators, setTypingIndicators] = useState<Record<number, string>>({});

  const [stage, setStage] = useState<'yours' | 'opposing' | 'court'>('yours');
  const [jurorNum, setJurorNum] = useState('');
  const [questionNum, setQuestionNum] = useState('');
  const [questionSummary, setQuestionSummary] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [duplicateAlerts, setDuplicateAlerts] = useState<Array<{ id: string; jurorNumber: number; message: string; responseId?: string; resolved: boolean }>>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const jurorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) {
      setLocation('/team');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [j, q, r, ci] = await Promise.all([
        api.collabGetJurors(),
        api.collabGetQuestions(),
        api.collabGetResponses(),
        api.collabGetCaseInfo(),
      ]);
      setJurors(j);
      setQuestions(q);
      setResponses(r.map(mapResponse));
      setCaseInfo(ci);
      if (ci.lastPhase >= 5) setRecordingDisabled(true);
      if (ci.lastPhase >= 6) {
        setPhase('report');
        loadReportData();
      }
    } catch (err: any) {
      toast({ title: 'Error loading session data', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const mapResponse = (r: any): JurorResponse => ({
    id: r.id,
    jurorNumber: r.jurorNumber,
    questionId: r.questionId,
    responseText: r.responseText,
    side: r.side || 'yours',
    questionSummary: r.questionSummary,
    followUps: r.followUps || [],
    timestamp: r.timestamp || Date.now(),
    recordedBy: r.recordedBy,
  });

  const handleResponseNew = useCallback((data: any) => {
    const r = data?.response || data;
    if (r && r.id && r.jurorNumber !== undefined) {
      setResponses(prev => {
        if (prev.some(existing => existing.id === r.id)) return prev;
        return [...prev, mapResponse(r)];
      });
    }
  }, []);

  const handleResponseDeleted = useCallback((data: any) => {
    if (data.responseId) {
      setResponses(prev => prev.filter(r => r.id !== data.responseId));
    }
  }, []);

  const handleFollowUpNew = useCallback((data: any) => {
    setResponses(prev =>
      prev.map(r =>
        r.id === data.responseId
          ? { ...r, followUps: [...(r.followUps || []), data.followUp] }
          : r
      )
    );
  }, []);

  const handleNotesUpdated = useCallback((data: any) => {
    if (data.jurorNumber !== undefined) {
      setJurors(prev => prev.map(j =>
        j.number === data.jurorNumber ? { ...j, notes: data.notes ?? j.notes } : j
      ));
    }
    toast({ title: `Notes updated`, description: `Juror #${data.jurorNumber} notes updated by ${data.updatedBy}` });
  }, [toast]);

  const handleParticipantJoined = useCallback((data: any) => {
    toast({ title: `${data.displayName} joined the session` });
  }, [toast]);

  const handleParticipantLeft = useCallback((data: any) => {
    toast({ title: `${data.displayName} left the session`, variant: 'destructive' });
  }, [toast]);

  const handlePhaseChanged = useCallback((data: any) => {
    const current = data.currentPhase ?? data.phase;
    if (current >= 5) {
      setRecordingDisabled(true);
      toast({ title: 'Recording paused', description: 'The lead attorney has moved to the Review phase.' });
    }
    if (current >= 6) {
      setPhase('report');
      loadReportData();
      toast({ title: 'Report available', description: 'The case has moved to Strikes & Challenges.' });
    }
  }, [toast]);

  const handleSessionRevoked = useCallback(() => {
    toast({ title: 'Session ended', description: 'The lead attorney has ended this session.', variant: 'destructive' });
    clearCollabSession();
    setLocation('/team');
  }, [toast, setLocation]);

  const handleDuplicate = useCallback((data: any) => {
    const alertId = `dup-${Date.now()}`;
    setDuplicateAlerts(prev => [...prev, {
      id: alertId,
      jurorNumber: data.jurorNumber,
      responseId: data.responseId,
      message: `A similar response was already recorded for Juror #${data.jurorNumber}.`,
      resolved: false,
    }]);
  }, []);

  const handleDuplicateKeep = useCallback((alertId: string) => {
    setDuplicateAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, message: a.message + ' Kept as supplemental note.' } : a));
    setTimeout(() => {
      setDuplicateAlerts(prev => prev.filter(a => a.id !== alertId));
    }, 3000);
  }, []);

  const handleDuplicateDiscard = useCallback(async (alertId: string, responseId?: string) => {
    if (responseId) {
      try {
        await api.collabDeleteResponse(responseId);
        setDuplicateAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, message: a.message + ' Discarded.' } : a));
      } catch (err: any) {
        const msg = err.message || 'Cannot delete';
        toast({ title: 'Could not discard', description: msg, variant: 'destructive' });
        setDuplicateAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, message: a.message + ' (Could not discard — not your response)' } : a));
      }
    } else {
      setDuplicateAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, message: a.message + ' Dismissed.' } : a));
    }
    setTimeout(() => {
      setDuplicateAlerts(prev => prev.filter(a => a.id !== alertId));
    }, 3000);
  }, [toast]);

  const handleTypingStart = useCallback((data: any) => {
    if (data.jurorNumber && data.displayName) {
      setTypingIndicators(prev => ({ ...prev, [data.jurorNumber]: data.displayName }));
    }
  }, []);

  const handleTypingStop = useCallback((data: any) => {
    if (data.jurorNumber) {
      setTypingIndicators(prev => {
        const next = { ...prev };
        delete next[data.jurorNumber];
        return next;
      });
    }
  }, []);

  const { status, sendTypingStart, sendTypingStop, addToWriteQueue, writeQueueLength } = useCollaborativeSession({
    sessionId: session?.sessionId || null,
    isOwner: false,
    onResponseNew: handleResponseNew,
    onResponseDeleted: handleResponseDeleted,
    onFollowUpNew: handleFollowUpNew,
    onNotesUpdated: handleNotesUpdated,
    onParticipantJoined: handleParticipantJoined,
    onParticipantLeft: handleParticipantLeft,
    onPhaseChanged: handlePhaseChanged,
    onSessionRevoked: handleSessionRevoked,
    onDuplicate: handleDuplicate,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
  });

  const loadReportData = async () => {
    setReportLoading(true);
    try {
      const data = await api.collabGetReportData();
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleLeave = () => {
    clearCollabSession();
    setLocation('/team');
  };

  const yourSideLabel = caseInfo?.name ? 'Your Side' : 'Plaintiff';
  const opposingSideLabel = 'Opposing';

  const handleQuickReaction = async (jurorNumber: number, reaction: string) => {
    if (recordingDisabled) return;
    const reactionLabels: Record<string, string> = {
      'raised-hand': '✋ Raised Hand',
      'head-nod': '👍 Head Nod',
      'head-shake': '👎 Head Shake',
      'note': '📝 Note',
    };
    const responseLabel = reactionLabels[reaction] || reaction;
    const qId = activeQuestionId;
    const payload: any = {
      jurorNumber,
      responseText: responseLabel,
      side: stage,
    };
    if (qId) payload.questionId = qId;

    try {
      if (status !== 'connected') {
        addToWriteQueue({ type: 'response', payload, id: `qr-${Date.now()}` });
      } else {
        await api.collabRecordResponse(payload);
      }
    } catch (err: any) {
      toast({ title: 'Reaction failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    const jNum = parseInt(jurorNum, 10);
    if (isNaN(jNum) || !jurors.some(j => j.number === jNum)) {
      setError('Invalid juror number');
      return;
    }
    if (!responseText.trim()) {
      setError('Response text is required');
      return;
    }

    const payload: any = {
      jurorNumber: jNum,
      responseText: responseText.trim(),
      side: stage,
    };

    if (stage === 'yours' && questionNum) {
      const qNum = parseInt(questionNum, 10);
      const q = questions.find(q => q.questionNumber === qNum);
      payload.questionId = q ? q.questionNumber : qNum;
    } else if (questionSummary.trim()) {
      payload.questionSummary = questionSummary.trim();
    }

    try {
      if (status !== 'connected') {
        addToWriteQueue({ type: 'response', payload, id: `r-${Date.now()}` });
        toast({ title: 'Response queued', description: 'Will be sent when connection is restored.' });
      } else {
        await api.collabRecordResponse(payload);
      }
      setResponseText('');
      setJurorNum('');
      setQuestionNum('');
      setQuestionSummary('');
      sendTypingStop(jNum);
      jurorInputRef.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to record response');
    }
  };

  const handleAddFollowUp = async (responseId: string) => {
    if (!followUpAnswer.trim()) return;
    try {
      await api.collabAddFollowUp(responseId, {
        question: followUpQuestion,
        answer: followUpAnswer.trim(),
      });
      setFollowUpQuestion('');
      setFollowUpAnswer('');
      setExpandedResponseId(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Voir Dire</span>
          </div>
          <p className="text-xs text-slate-400 truncate">{caseInfo?.name || 'Case'}</p>
          <p className="text-xs text-slate-500 mt-1">Logged in as {session.displayName}</p>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setPhase('recording')}
            data-testid="button-phase-recording"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              phase === 'recording' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            Record Responses
          </button>
          <button
            onClick={() => { setPhase('report'); loadReportData(); }}
            data-testid="button-phase-report"
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              phase === 'report' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Strikes & Challenges
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <ConnectionIndicator status={status} />
          {writeQueueLength > 0 && (
            <div className="text-xs text-amber-400" data-testid="text-write-queue">
              {writeQueueLength} queued write{writeQueueLength > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={handleLeave}
            data-testid="button-leave-session"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Leave Session
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {phase === 'recording' ? (
          <CollabRecordingView
            jurors={jurors}
            questions={questions}
            responses={responses}
            caseInfo={caseInfo}
            recordingDisabled={recordingDisabled}
            typingIndicators={typingIndicators}
            stage={stage}
            setStage={setStage}
            jurorNum={jurorNum}
            setJurorNum={setJurorNum}
            questionNum={questionNum}
            setQuestionNum={setQuestionNum}
            questionSummary={questionSummary}
            setQuestionSummary={setQuestionSummary}
            responseText={responseText}
            setResponseText={setResponseText}
            error={error}
            handleSubmit={handleSubmit}
            expandedResponseId={expandedResponseId}
            setExpandedResponseId={setExpandedResponseId}
            followUpQuestion={followUpQuestion}
            setFollowUpQuestion={setFollowUpQuestion}
            followUpAnswer={followUpAnswer}
            setFollowUpAnswer={setFollowUpAnswer}
            handleAddFollowUp={handleAddFollowUp}
            formatTime={formatTime}
            jurorInputRef={jurorInputRef}
            sendTypingStart={sendTypingStart}
            sendTypingStop={sendTypingStop}
            yourSideLabel={yourSideLabel}
            opposingSideLabel={opposingSideLabel}
            displayName={session.displayName}
            onQuickReaction={handleQuickReaction}
            duplicateAlerts={duplicateAlerts}
            onDuplicateKeep={handleDuplicateKeep}
            onDuplicateDiscard={handleDuplicateDiscard}
            activeQuestionId={activeQuestionId}
            setActiveQuestionId={setActiveQuestionId}
          />
        ) : (
          <CollabReportView reportData={reportData} isLoading={reportLoading} />
        )}
      </div>
    </div>
  );
}

interface CollabRecordingProps {
  jurors: CollabJuror[];
  questions: CollabQuestion[];
  responses: JurorResponse[];
  caseInfo: any;
  recordingDisabled: boolean;
  typingIndicators: Record<number, string>;
  stage: 'yours' | 'opposing' | 'court';
  setStage: (s: 'yours' | 'opposing' | 'court') => void;
  jurorNum: string;
  setJurorNum: (v: string) => void;
  questionNum: string;
  setQuestionNum: (v: string) => void;
  questionSummary: string;
  setQuestionSummary: (v: string) => void;
  responseText: string;
  setResponseText: (v: string) => void;
  error: string;
  handleSubmit: (e?: React.FormEvent) => void;
  expandedResponseId: string | null;
  setExpandedResponseId: (v: string | null) => void;
  followUpQuestion: string;
  setFollowUpQuestion: (v: string) => void;
  followUpAnswer: string;
  setFollowUpAnswer: (v: string) => void;
  handleAddFollowUp: (id: string) => void;
  formatTime: (ts: number) => string;
  jurorInputRef: React.RefObject<HTMLInputElement | null>;
  sendTypingStart: (n: number) => void;
  sendTypingStop: (n: number) => void;
  yourSideLabel: string;
  opposingSideLabel: string;
  displayName: string;
  onQuickReaction: (jurorNumber: number, reaction: string) => void;
  duplicateAlerts: Array<{ id: string; jurorNumber: number; message: string; responseId?: string; resolved: boolean }>;
  onDuplicateKeep: (id: string) => void;
  onDuplicateDiscard: (id: string, responseId?: string) => void;
  activeQuestionId: number | null;
  setActiveQuestionId: (id: number | null) => void;
}

function CollabRecordingView({
  jurors, questions, responses, caseInfo, recordingDisabled, typingIndicators,
  stage, setStage, jurorNum, setJurorNum, questionNum, setQuestionNum,
  questionSummary, setQuestionSummary, responseText, setResponseText,
  error, handleSubmit, expandedResponseId, setExpandedResponseId,
  followUpQuestion, setFollowUpQuestion, followUpAnswer, setFollowUpAnswer,
  handleAddFollowUp, formatTime, jurorInputRef, sendTypingStart, sendTypingStop,
  yourSideLabel, opposingSideLabel, displayName,
  onQuickReaction, duplicateAlerts, onDuplicateKeep, onDuplicateDiscard, activeQuestionId, setActiveQuestionId,
}: CollabRecordingProps) {
  const stageConfig = {
    yours: { label: yourSideLabel, icon: Scale, color: 'bg-amber-500', borderColor: 'border-amber-200', bgColor: 'bg-amber-50/30' },
    opposing: { label: opposingSideLabel, icon: Shield, color: 'bg-rose-500', borderColor: 'border-rose-200', bgColor: 'bg-rose-50/30' },
    court: { label: 'Court', icon: Gavel, color: 'bg-slate-500', borderColor: 'border-slate-200', bgColor: 'bg-slate-50' },
  };

  const seatingConfig = caseInfo?.seatingConfig;
  const rows = seatingConfig?.rows || 2;
  const cols = Math.ceil(jurors.length / rows);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Record Responses</h1>
        {recordingDisabled && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700" data-testid="status-recording-disabled">
            <AlertCircle className="w-4 h-4" />
            Recording paused — case is under review
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-3">Jury Seating</h3>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {jurors.map(j => {
            const hasResponses = responses.some(r => r.jurorNumber === j.number);
            const isTyping = typingIndicators[j.number];
            return (
              <div
                key={j.number}
                data-testid={`card-juror-seat-${j.number}`}
                className={`relative p-3 rounded-lg border text-center transition-all ${
                  hasResponses ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="font-bold text-lg text-slate-900">#{j.number}</div>
                <div className="text-xs text-slate-500 truncate">{j.name}</div>
                {hasResponses && (
                  <div className="mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  </div>
                )}
                {!recordingDisabled && (
                  <div className="flex justify-center gap-1 mt-1.5">
                    <button
                      onClick={() => onQuickReaction(j.number, 'raised-hand')}
                      data-testid={`button-reaction-hand-${j.number}`}
                      title="Raised Hand"
                      className="p-1 rounded hover:bg-yellow-100 text-yellow-700 active:bg-yellow-200 transition-colors"
                    >
                      <Hand className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onQuickReaction(j.number, 'head-nod')}
                      data-testid={`button-reaction-nod-${j.number}`}
                      title="Head Nod"
                      className="p-1 rounded hover:bg-green-100 text-green-700 active:bg-green-200 transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onQuickReaction(j.number, 'head-shake')}
                      data-testid={`button-reaction-shake-${j.number}`}
                      title="Head Shake"
                      className="p-1 rounded hover:bg-red-100 text-red-700 active:bg-red-200 transition-colors"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onQuickReaction(j.number, 'note')}
                      data-testid={`button-reaction-note-${j.number}`}
                      title="Note"
                      className="p-1 rounded hover:bg-blue-100 text-blue-700 active:bg-blue-200 transition-colors"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {isTyping && (
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded text-[10px] text-amber-700 whitespace-nowrap" data-testid={`indicator-typing-${j.number}`}>
                    {isTyping} typing...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {duplicateAlerts.length > 0 && (
        <div className="space-y-2" data-testid="duplicate-alerts">
          {duplicateAlerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                {alert.message}
              </div>
              {!alert.resolved && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onDuplicateKeep(alert.id)}
                    className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-xs font-medium transition-colors"
                    data-testid={`button-keep-duplicate-${alert.id}`}
                  >
                    Keep as note
                  </button>
                  <button
                    onClick={() => onDuplicateDiscard(alert.id, alert.responseId)}
                    className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors"
                    data-testid={`button-discard-duplicate-${alert.id}`}
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!recordingDisabled && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex gap-2 mb-4">
            {(['yours', 'opposing', 'court'] as const).map(s => {
              const cfg = stageConfig[s];
              const Icon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  data-testid={`button-stage-${s}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    stage === s
                      ? `${cfg.color} text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Juror #</label>
                <input
                  ref={jurorInputRef}
                  type="number"
                  data-testid="input-collab-juror-num"
                  value={jurorNum}
                  onChange={e => setJurorNum(e.target.value)}
                  placeholder="#"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-lg font-mono"
                  autoFocus
                />
              </div>
              {stage === 'yours' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Question #</label>
                  <input
                    type="number"
                    data-testid="input-collab-question-num"
                    value={questionNum}
                    onChange={e => setQuestionNum(e.target.value)}
                    placeholder="#"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-lg font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Question Summary</label>
                  <input
                    type="text"
                    data-testid="input-collab-question-summary"
                    value={questionSummary}
                    onChange={e => setQuestionSummary(e.target.value)}
                    placeholder="Brief summary"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Response</label>
              <textarea
                data-testid="input-collab-response"
                value={responseText}
                onChange={e => {
                  setResponseText(e.target.value);
                  const n = parseInt(jurorNum);
                  if (!isNaN(n) && e.target.value.trim()) sendTypingStart(n);
                }}
                onFocus={() => {
                  const n = parseInt(jurorNum);
                  if (!isNaN(n) && responseText.trim()) sendTypingStart(n);
                }}
                onBlur={() => {
                  const n = parseInt(jurorNum);
                  if (!isNaN(n)) sendTypingStop(n);
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Type the juror's response..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" data-testid="text-collab-error">{error}</div>
            )}

            <button
              type="submit"
              data-testid="button-collab-record"
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              <Send className="w-4 h-4" />
              Record Response
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-medium text-slate-500 mb-4">
          Response History ({responses.length})
        </h3>
        {responses.length === 0 ? (
          <p className="text-sm text-slate-400 italic" data-testid="text-no-responses">No responses recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...responses].reverse().map(response => {
              const juror = jurors.find(j => j.number === response.jurorNumber);
              const isOpposing = response.side === 'opposing';
              const isCourt = response.side === 'court';
              const isExpanded = expandedResponseId === response.id;

              return (
                <div
                  key={response.id}
                  data-testid={`card-response-${response.id}`}
                  className={`rounded-xl border shadow-sm ${
                    isCourt ? 'bg-amber-50/30 border-amber-200' : isOpposing ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-200'
                  } ${isExpanded ? 'ring-2 ring-amber-300' : ''}`}
                >
                  <div
                    className="p-4 cursor-pointer select-none"
                    onClick={() => setExpandedResponseId(isExpanded ? null : response.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm ${
                          isCourt ? 'bg-amber-600' : isOpposing ? 'bg-rose-600' : 'bg-slate-900'
                        }`}>
                          #{response.jurorNumber}
                        </span>
                        <span className="font-medium text-slate-900">{juror?.name || 'Unknown'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isCourt ? 'bg-amber-100 text-amber-700' : isOpposing ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isCourt ? 'Court' : isOpposing ? opposingSideLabel : yourSideLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{formatTime(response.timestamp)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                    <div className="pl-10">
                      <p className="text-sm text-slate-700">{response.responseText}</p>
                      {response.recordedBy && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1" data-testid={`text-recorded-by-${response.id}`}>
                          <User className="w-3 h-3" />
                          by {response.recordedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-14 space-y-3 border-t border-slate-100 pt-3">
                      {response.followUps && response.followUps.length > 0 && (
                        <div className="space-y-2">
                          {response.followUps.map((fu, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm">
                              {fu.question && <p className="text-slate-500 italic mb-1">Q: {fu.question}</p>}
                              <p className="text-slate-700">A: {fu.answer}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {!recordingDisabled && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            data-testid={`input-followup-question-${response.id}`}
                            value={followUpQuestion}
                            onChange={e => setFollowUpQuestion(e.target.value)}
                            placeholder="Follow-up question (optional)"
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-amber-400 outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              data-testid={`input-followup-answer-${response.id}`}
                              value={followUpAnswer}
                              onChange={e => setFollowUpAnswer(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFollowUp(response.id); } }}
                              placeholder="Follow-up answer"
                              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-amber-400 outline-none"
                            />
                            <button
                              onClick={() => handleAddFollowUp(response.id)}
                              data-testid={`button-add-followup-${response.id}`}
                              disabled={!followUpAnswer.trim()}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CollabReportView({ reportData, isLoading }: { reportData: any; isLoading: boolean }) {
  const [expandedJuror, setExpandedJuror] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-800 font-medium">Report not yet available</p>
          <p className="text-amber-600 text-sm mt-1">The lead attorney has not yet moved to the Strikes & Challenges phase.</p>
        </div>
      </div>
    );
  }

  const jurors = reportData.jurors || [];
  const responses = reportData.responses || [];
  const causeStruckNums = (reportData.strikesForCause || []).map((s: any) => s.jurorNumber);
  const courtDismissedNums = reportData.courtDismissed || [];
  const activeJurors = jurors.filter((j: any) => !causeStruckNums.includes(j.number) && !courtDismissedNums.includes(j.number));
  const batson = reportData.batsonAnalysis;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900" data-testid="text-report-title">Strikes & Challenges</h1>
        <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">Read-only</span>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6" data-testid="section-strikes-for-cause">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Strikes for Cause</h2>
        {reportData.strikesForCause && reportData.strikesForCause.length > 0 ? (
          <div className="space-y-2">
            {reportData.strikesForCause.map((s: any, i: number) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm" data-testid={`strike-cause-${s.jurorNumber}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-red-800">Juror #{s.jurorNumber}</span>
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">{s.category}</span>
                </div>
                <p className="text-red-700 font-medium">{s.basis}</p>
                {s.reasoning && <p className="text-red-600 text-xs mt-1">{s.reasoning}</p>}
                {s.argument && <p className="text-red-500 text-xs mt-1 italic">Argument: {s.argument}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No strikes for cause recorded.</p>
        )}
        {courtDismissedNums.length > 0 && (
          <div className="mt-3 text-sm text-slate-500">
            Court dismissed: {courtDismissedNums.map((n: number) => `#${n}`).join(', ')}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6" data-testid="section-juror-grid">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Remaining Jurors ({activeJurors.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-report-jurors">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">#</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Lean</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Risk</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Score</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {activeJurors.map((j: any) => {
                const jurorResponses = responses.filter((r: any) => r.jurorNumber === j.number);
                return (
                  <Fragment key={j.number}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      data-testid={`row-report-juror-${j.number}`}
                      onClick={() => setExpandedJuror(expandedJuror === j.number ? null : j.number)}
                    >
                      <td className="py-2 px-3 font-mono font-bold">#{j.number}</td>
                      <td className="py-2 px-3">{j.name}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          j.lean === 'favorable' ? 'bg-emerald-100 text-emerald-700' :
                          j.lean === 'unfavorable' ? 'bg-red-100 text-red-700' :
                          j.lean === 'neutral' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {j.lean || 'unknown'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          j.riskTier === 'high' ? 'bg-red-100 text-red-700' :
                          j.riskTier === 'medium' ? 'bg-amber-100 text-amber-700' :
                          j.riskTier === 'low' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {j.riskTier || 'unassessed'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-sm">{j.riskScore ?? '—'}</td>
                      <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">{j.notes || '—'}</td>
                    </tr>
                    {expandedJuror === j.number && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 px-6 py-4">
                          <div className="space-y-3">
                            {j.aiSummary && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">AI Summary</p>
                                <p className="text-sm text-slate-700">{j.aiSummary}</p>
                              </div>
                            )}
                            {j.aiAnalysis && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">AI Analysis</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{j.aiAnalysis}</p>
                              </div>
                            )}
                            {jurorResponses.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Responses ({jurorResponses.length})</p>
                                <div className="space-y-2">
                                  {jurorResponses.map((r: any) => (
                                    <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                                      <p className="text-slate-800">{r.responseText}</p>
                                      {r.questionSummary && <p className="text-xs text-slate-400 mt-1">Q: {r.questionSummary}</p>}
                                      {r.recordedBy && <p className="text-xs text-violet-500 mt-1">by {r.recordedBy}</p>}
                                      {r.followUps && r.followUps.length > 0 && (
                                        <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1">
                                          {r.followUps.map((fu: any, fi: number) => (
                                            <div key={fi} className="text-xs text-slate-600">
                                              {fu.question && <span className="font-medium">Q: {fu.question} — </span>}
                                              <span>A: {fu.answer}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!j.aiSummary && !j.aiAnalysis && jurorResponses.length === 0 && (
                              <p className="text-sm text-slate-400 italic">No additional details available.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {batson && (
        <section className="bg-white rounded-xl border border-slate-200 p-6" data-testid="section-batson">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Batson Challenge Analysis</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              batson.overallRisk === 'high' ? 'bg-red-100 text-red-700' :
              batson.overallRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              Overall Risk: {batson.overallRisk}
            </span>
          </div>
          <p className="text-sm text-slate-700 mb-4">{batson.summary}</p>

          {batson.defensive && batson.defensive.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Defensive Concerns (Protect Your Strikes)</h3>
              <div className="space-y-2">
                {batson.defensive.map((d: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-amber-800">Juror #{d.jurorNumber} ({d.jurorName})</span>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{d.riskLevel}</span>
                      <span className="text-xs text-slate-500">{d.protectedClass}</span>
                    </div>
                    <p className="text-amber-700 text-xs">{d.recommendedArticulation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {batson.offensive && batson.offensive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Offensive Opportunities (Challenge Their Strikes)</h3>
              <div className="space-y-2">
                {batson.offensive.map((o: any, i: number) => (
                  <div key={i} className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-violet-800">Juror #{o.jurorNumber} ({o.jurorName})</span>
                      <span className="text-xs bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">{o.strengthOfChallenge}</span>
                      <span className="text-xs text-slate-500">{o.protectedClass}</span>
                    </div>
                    <p className="text-violet-700 text-xs">{o.suggestedArgument}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
