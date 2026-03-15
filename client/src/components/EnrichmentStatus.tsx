import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, StopCircle } from 'lucide-react';
import { getAuthToken } from '../lib/auth';
import { useDraggablePosition } from '../hooks/useDraggablePosition';

interface EnrichmentItem {
  jurorNumber: number;
  jurorName: string;
  status: string;
  enrichmentId: string;
  createdAt: number;
  completedAt: number | null;
  hasData: boolean;
}

interface EnrichmentSummary {
  total: number;
  pending: number;
  dispatched: number;
  completed: number;
  failed: number;
  error: number;
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
            style={{ left: Math.min(position.x, window.innerWidth - 380), bottom: Math.max(20, window.innerHeight - position.y - 56), width: 360, maxHeight: expanded ? 480 : 280 }}
            data-testid="panel-enrichment-status"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
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
              </div>
              {summary.total > 0 && (
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(summary.completed / summary.total) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: expanded ? 340 : 140 }}>
              {items.map((item) => (
                <div
                  key={item.enrichmentId}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors"
                  data-testid={`enrichment-item-${item.jurorNumber}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {statusIcon(item.status)}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        #{item.jurorNumber} — {item.jurorName}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                    item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    item.status === 'pending' || item.status === 'dispatched' ? 'bg-amber-50 text-amber-700' :
                    item.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
              ))}
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
