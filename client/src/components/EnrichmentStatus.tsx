import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, ChevronRight, StopCircle, ExternalLink, UserCheck, UserX, RotateCcw } from 'lucide-react';
import { getAuthToken } from '../lib/auth';
import { postMatchDecision, type CandidateMatchView } from '../lib/api';
import { useDraggablePosition } from '../hooks/useDraggablePosition';
import { useDraggableWindow } from '../hooks/useDraggableWindow';

interface EnrichmentItem {
  jurorNumber: number;
  jurorName: string;
  status: string;
  enrichmentId: string;
  createdAt: number;
  completedAt: number | null;
  hasData: boolean;
  matches?: CandidateMatchView[];
  leads?: { confirmed: number; pendingReview: number };
}

interface EnrichmentSummary {
  total: number;
  pending: number;
  dispatched: number;
  completed: number;
  failed: number;
  error: number;
  pendingReview?: number;
  docketAvailable?: boolean;
  docketNote?: string | null;
}

function confidenceChipClass(m: CandidateMatchView): string {
  if (m.decision === 'rejected') return 'bg-slate-100 text-slate-500';
  if (m.decision === 'confirmed' || m.confidence === 'confirmed') return 'bg-emerald-100 text-emerald-700';
  if (m.confidence === 'probable') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function confidenceChipLabel(m: CandidateMatchView): string {
  if (m.decision === 'confirmed') return 'attorney confirmed';
  if (m.decision === 'rejected') return 'not them';
  return m.confidence;
}

interface EnrichmentStatusProps {
  caseId: string | null;
}

const POLL_INTERVAL = 15000;

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'pending':
    case 'dispatched':
      return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case 'failed':
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'cancelled':
      return <StopCircle className="w-4 h-4 text-slate-400" />;
    default:
      return <Zap className="w-4 h-4 text-slate-400" />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'completed': return 'Done';
    case 'pending': return 'Queued';
    case 'dispatched': return 'Processing';
    case 'failed': return 'Failed';
    case 'error': return 'Error';
    case 'cancelled': return 'Stopped';
    default: return status;
  }
}

export function EnrichmentStatus({ caseId }: EnrichmentStatusProps) {
  const [items, setItems] = useState<EnrichmentItem[]>([]);
  const [summary, setSummary] = useState<EnrichmentSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [decidingKey, setDecidingKey] = useState<string | null>(null);
  const decidingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    position,
    isDragging,
    hasMoved,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useDraggablePosition({
    storageKey: 'voir_dire_enrichment_btn_pos',
    defaultPosition: { x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 56 - 24 : 700 },
  });

  useEffect(() => {
    setItems([]);
    setSummary(null);
    setVisible(false);
    setIsOpen(false);
  }, [caseId]);

  const fetchStatus = useCallback(async () => {
    if (!caseId) return;
    if (decidingRef.current) return; // don't clobber an in-flight decision
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/cases/${caseId}/enrichment-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || null);
      if (data.summary && data.summary.total > 0) {
        setVisible(true);
      }
    } catch {}
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchStatus, caseId]);

  const handleStop = useCallback(async () => {
    if (!caseId || stopping) return;
    setStopping(true);
    try {
      const token = getAuthToken();
      await fetch(`/api/cases/${caseId}/stop-enrichment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchStatus();
    } catch {} finally {
      setStopping(false);
    }
  }, [caseId, stopping, fetchStatus]);

  const handleDecision = useCallback(async (
    enrichmentId: string,
    matchId: string,
    decision: 'confirmed' | 'rejected' | 'clear'
  ) => {
    if (!caseId || decidingKey) return;
    setDecidingKey(matchId);
    decidingRef.current = true;
    try {
      const result = await postMatchDecision(caseId, enrichmentId, matchId, decision);
      setItems(prev => prev.map(it => it.enrichmentId === enrichmentId ? {
        ...it,
        matches: result.candidateMatches,
        leads: {
          confirmed: result.candidateMatches.filter(m => m.decision === 'confirmed' || (m.confidence === 'confirmed' && m.decision !== 'rejected')).length,
          pendingReview: result.candidateMatches.filter(m => !m.decision && m.confidence !== 'confirmed').length,
        },
      } : it));
    } catch {} finally {
      decidingRef.current = false;
      setDecidingKey(null);
    }
    fetchStatus(); // reconcile authoritative state (summary counts, other tabs)
  }, [caseId, decidingKey, fetchStatus]);

  const {
    position: windowPos,
    isDragging: isWindowDragging,
    onPointerDown: onWindowPointerDown,
    onPointerMove: onWindowPointerMove,
    onPointerUp: onWindowPointerUp,
  } = useDraggableWindow({
    storageKey: 'voir_dire_enrichment_window_pos',
    defaultPosition: () => ({
      x: Math.min(position.x, window.innerWidth - 380),
      y: Math.max(20, position.y - 300),
    }),
    panelWidth: 360,
    panelHeight: 480,
  });

  if (!visible || !summary || summary.total === 0) return null;

  const inProgress = summary.pending + summary.dispatched;
  const hasErrors = summary.failed + summary.error;
  const allDone = inProgress === 0;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={`fixed z-50 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
            style={{ left: position.x, top: position.y, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => {
              const wasDragging = handlePointerUp(e);
              if (!wasDragging && !hasMoved.current) {
                setIsOpen(true);
              }
            }}
            onPointerCancel={(e) => handlePointerUp(e)}
            data-testid="button-enrichment-status"
          >
            <div className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 ${
              allDone
                ? hasErrors ? 'bg-amber-600 shadow-amber-600/30' : 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-indigo-600 shadow-indigo-600/30'
            }`}>
              {inProgress > 0 ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Zap className="w-7 h-7 text-white" />
              )}
            </div>
            {inProgress > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {inProgress}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ left: windowPos.x, top: windowPos.y, width: 360, maxHeight: expanded ? 480 : 280 }}
            data-testid="panel-enrichment-status"
          >
            <div
              className={`flex items-center justify-between px-4 py-3 bg-slate-900 text-white select-none ${isWindowDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ touchAction: 'none' }}
              onPointerDown={onWindowPointerDown}
              onPointerMove={onWindowPointerMove}
              onPointerUp={onWindowPointerUp}
              onPointerCancel={onWindowPointerUp}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-sm">Juror Enrichment</span>
              </div>
              <div className="flex items-center gap-1">
                {inProgress > 0 && (
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="p-1 hover:bg-red-700 bg-red-600 rounded transition-colors flex items-center gap-1 px-2 text-xs font-medium"
                    data-testid="button-enrichment-stop"
                  >
                    {stopping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                    Stop
                  </button>
                )}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  data-testid="button-enrichment-expand"
                >
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  data-testid="button-enrichment-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600">{summary.completed} done</span>
                </div>
                {inProgress > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span className="text-slate-600">{inProgress} in progress</span>
                  </div>
                )}
                {hasErrors > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-slate-600">{hasErrors} failed</span>
                  </div>
                )}
                {(summary.pendingReview ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5" data-testid="text-pending-review">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-indigo-700 font-medium">{summary.pendingReview} to review</span>
                  </div>
                )}
              </div>
              {summary.total > 0 && (
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.completed / summary.total) * 100}%` }}
                  />
                </div>
              )}
              {summary.docketAvailable === false && (
                <div className="mt-2 text-[11px] leading-snug text-slate-500 flex items-start gap-1.5" data-testid="text-docket-unavailable">
                  <AlertTriangle className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <span>Court docket history unavailable — AlaCourt not connected, so litigation and claims history is not searched.</span>
                </div>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: expanded ? 340 : 140 }}>
              {items.map((item) => {
                const matches = item.matches || [];
                const isItemExpanded = expandedItemId === item.enrichmentId;
                const confirmedCount = item.leads?.confirmed ?? 0;
                const pendingReview = item.leads?.pendingReview ?? 0;
                return (
                  <div key={item.enrichmentId} className="border-b border-slate-50 last:border-b-0">
                    <div
                      className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors ${matches.length > 0 ? 'cursor-pointer' : ''}`}
                      onClick={() => matches.length > 0 && setExpandedItemId(isItemExpanded ? null : item.enrichmentId)}
                      data-testid={`enrichment-item-${item.jurorNumber}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {statusIcon(item.status)}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">
                            #{item.jurorNumber} — {item.jurorName}
                          </div>
                          {matches.length > 0 && (
                            <div className="flex items-center gap-2 mt-0.5">
                              {confirmedCount > 0 && (
                                <span className="text-[10px] font-semibold text-emerald-600">{confirmedCount} confirmed</span>
                              )}
                              {pendingReview > 0 && (
                                <span className="text-[10px] font-semibold text-indigo-600">
                                  {pendingReview} lead{pendingReview === 1 ? '' : 's'} to review
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          item.status === 'pending' || item.status === 'dispatched' ? 'bg-amber-50 text-amber-700' :
                          item.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {statusLabel(item.status)}
                        </span>
                        {matches.length > 0 && (
                          isItemExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    {isItemExpanded && matches.map((m) => {
                      const isDeciding = decidingKey === m.id;
                      const autoConfirmed = m.confidence === 'confirmed' && !m.decision;
                      return (
                        <div
                          key={m.id}
                          className={`mx-3 mb-2 rounded-lg border p-2.5 ${
                            m.decision === 'rejected' ? 'border-slate-100 bg-slate-50 opacity-60' :
                            m.decision === 'confirmed' || m.confidence === 'confirmed' ? 'border-emerald-200 bg-emerald-50/50' :
                            'border-slate-200 bg-white'
                          }`}
                          data-testid={`match-card-${m.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold text-slate-800 truncate">{m.name}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${confidenceChipClass(m)}`}>
                                {confidenceChipLabel(m)}
                              </span>
                            </div>
                            {m.sourceUrl && (
                              <a
                                href={m.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0"
                                data-testid={`link-match-source-${m.id}`}
                              >
                                <ExternalLink className="w-3 h-3 text-slate-400 hover:text-indigo-600" />
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            via {m.discriminator.replace(/_/g, ' ')} · {m.category}
                          </div>
                          <div className={`text-xs text-slate-600 mt-1 leading-snug ${m.decision === 'rejected' ? 'line-through' : ''}`}>
                            {m.evidence}
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            {isDeciding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : m.decision ? (
                              <button
                                onClick={() => handleDecision(item.enrichmentId, m.id, 'clear')}
                                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                data-testid={`button-match-undo-${m.id}`}
                              >
                                <RotateCcw className="w-3 h-3" /> Undo
                              </button>
                            ) : (
                              <>
                                {!autoConfirmed && (
                                  <button
                                    onClick={() => handleDecision(item.enrichmentId, m.id, 'confirmed')}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded transition-colors"
                                    data-testid={`button-match-confirm-${m.id}`}
                                  >
                                    <UserCheck className="w-3 h-3" /> It's them
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDecision(item.enrichmentId, m.id, 'rejected')}
                                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                  data-testid={`button-match-reject-${m.id}`}
                                >
                                  <UserX className="w-3 h-3" /> Not them
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  No enrichment requests yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
