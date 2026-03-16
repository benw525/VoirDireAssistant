import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hand,
  ThumbsUp,
  ThumbsDown,
  StickyNote,
  Settings2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Grid3x3,
} from 'lucide-react';
import { Juror, JurorResponse, SeatingConfig } from '../../types';

interface ActiveQuestion {
  id: number | null;
  text: string;
  side: 'yours' | 'opposing' | 'court';
}

interface JurySeatingGridProps {
  jurors: Juror[];
  responses: JurorResponse[];
  seatingConfig: SeatingConfig | null;
  onSeatingConfigChange: (config: SeatingConfig) => void;
  onRecordResponse: (response: Omit<JurorResponse, 'id' | 'timestamp'>) => void;
  activeQuestion: ActiveQuestion | null;
  courtDismissed: number[];
}

type ReactionType = 'raised-hand' | 'head-nod' | 'head-shake';

const REACTION_LABELS: Record<ReactionType, string> = {
  'raised-hand': '[Hand] Raised hand',
  'head-nod': '[Nod] Head nod',
  'head-shake': '[Shake] Head shake',
};

function arrangeJurorsInGrid(
  jurors: Juror[],
  config: SeatingConfig
): Juror[][] {
  const sorted = [...jurors].sort((a, b) => a.number - b.number);
  const rowCount = config.rows;
  const seatsPerRow = Math.ceil(sorted.length / rowCount);
  const rows: Juror[][] = [];

  for (let r = 0; r < rowCount; r++) {
    const start = r * seatsPerRow;
    const end = Math.min(start + seatsPerRow, sorted.length);
    if (start < sorted.length) {
      rows.push(sorted.slice(start, end));
    }
  }

  if (config.direction === 'bottom-right-first') {
    rows.reverse();
    rows.forEach(row => row.reverse());
  }

  return rows;
}

export function JurySeatingGrid({
  jurors,
  responses,
  seatingConfig,
  onSeatingConfigChange,
  onRecordResponse,
  activeQuestion,
  courtDismissed,
}: JurySeatingGridProps) {
  const [showConfig, setShowConfig] = useState(!seatingConfig);
  const [configRows, setConfigRows] = useState(seatingConfig?.rows || 2);
  const [configDirection, setConfigDirection] = useState<SeatingConfig['direction']>(
    seatingConfig?.direction || 'bottom-right-first'
  );
  const [noteJuror, setNoteJuror] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [flashedCells, setFlashedCells] = useState<Record<number, string>>({});
  const [gridCollapsed, setGridCollapsed] = useState(false);
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (noteJuror !== null) {
      setTimeout(() => noteInputRef.current?.focus(), 180);
    }
  }, [noteJuror]);

  const handleApplyConfig = () => {
    const config: SeatingConfig = { rows: configRows, direction: configDirection };
    onSeatingConfigChange(config);
    setShowConfig(false);
  };

  const currentQuestionResponses = responses.filter(r => {
    if (!activeQuestion) return false;
    if (activeQuestion.id !== null) {
      return r.questionId === activeQuestion.id;
    }
    if (activeQuestion.text) {
      return r.questionSummary === activeQuestion.text && r.side === activeQuestion.side;
    }
    return false;
  });

  const respondedJurors = new Set(currentQuestionResponses.map(r => r.jurorNumber));

  const handleReaction = (jurorNumber: number, reaction: ReactionType) => {
    if (!activeQuestion || !activeQuestion.text) return;

    const responseText = REACTION_LABELS[reaction];
    onRecordResponse({
      jurorNumber,
      questionId: activeQuestion.id,
      responseText,
      side: activeQuestion.side,
      questionSummary: activeQuestion.id === null ? activeQuestion.text : undefined,
    });

    setFlashedCells(prev => ({ ...prev, [jurorNumber]: reaction }));
    setTimeout(() => {
      setFlashedCells(prev => {
        const next = { ...prev };
        delete next[jurorNumber];
        return next;
      });
    }, 800);
  };

  const handleNote = (jurorNumber: number) => {
    if (noteJuror === jurorNumber) {
      setNoteJuror(null);
      setNoteText('');
    } else {
      setNoteJuror(jurorNumber);
      setNoteText('');
    }
  };

  const handleNoteSubmit = (jurorNumber: number) => {
    if (!noteText.trim() || !activeQuestion || !activeQuestion.text) return;
    onRecordResponse({
      jurorNumber,
      questionId: activeQuestion.id,
      responseText: `[Note] ${noteText.trim()}`,
      side: activeQuestion.side,
      questionSummary: activeQuestion.id === null ? activeQuestion.text : undefined,
    });
    setNoteJuror(null);
    setNoteText('');
    setFlashedCells(prev => ({ ...prev, [jurorNumber]: 'note' }));
    setTimeout(() => {
      setFlashedCells(prev => {
        const next = { ...prev };
        delete next[jurorNumber];
        return next;
      });
    }, 800);
  };

  const dismissedSet = new Set(courtDismissed);
  const hasQuestion = activeQuestion && activeQuestion.text;

  useEffect(() => {
    if (!seatingConfig && !showConfig) {
      setShowConfig(true);
    }
  }, [seatingConfig, showConfig]);

  return (
    <div className="mb-4 shrink-0" data-testid="jury-seating-grid">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => {
            if (seatingConfig) setGridCollapsed(!gridCollapsed);
            else setShowConfig(true);
          }}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
          data-testid="button-toggle-seating-grid"
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-sm text-slate-800">Jury Seating Chart</span>
            {seatingConfig && (
              <span className="text-xs text-slate-400">
                ({seatingConfig.rows} rows, {seatingConfig.direction === 'bottom-right-first' ? 'lowest # bottom-right' : 'lowest # top-left'})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {seatingConfig && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(!showConfig);
                }}
                className="p-1 rounded hover:bg-slate-200 transition-colors"
                data-testid="button-seating-config"
              >
                <Settings2 className="w-4 h-4 text-slate-400" />
              </button>
            )}
            {gridCollapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <h4 className="text-sm font-bold text-blue-900 mb-3">Configure Seating Layout</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase mb-1.5">
                      Number of Rows
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(n => (
                        <button
                          key={n}
                          onClick={() => setConfigRows(n)}
                          data-testid={`button-rows-${n}`}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                            configRows === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-300 hover:bg-blue-50'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase mb-1.5">
                      Seating Direction
                    </label>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setConfigDirection('bottom-right-first')}
                        data-testid="button-direction-bottom-right"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                          configDirection === 'bottom-right-first'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-blue-50'
                        }`}
                      >
                        #1 bottom-right → last top-left
                      </button>
                      <button
                        onClick={() => setConfigDirection('top-left-first')}
                        data-testid="button-direction-top-left"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                          configDirection === 'top-left-first'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-blue-50'
                        }`}
                      >
                        #1 top-left → last bottom-right
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-blue-600 font-medium">
                    {jurors.length} jurors → {Math.ceil(jurors.length / configRows)} seats per row
                  </span>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleApplyConfig}
                    data-testid="button-apply-seating"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Apply Layout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {seatingConfig && !gridCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {hasQuestion && (
                <div className="px-4 pt-3 pb-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 ${
                    activeQuestion.side === 'yours' ? 'bg-amber-100 text-amber-800' :
                    activeQuestion.side === 'court' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    Active: {activeQuestion.id ? `Q${activeQuestion.id} — ` : ''}{activeQuestion.text.length > 80 ? activeQuestion.text.slice(0, 80) + '...' : activeQuestion.text}
                  </div>
                </div>
              )}

              {!hasQuestion && (
                <div className="px-4 pt-3 pb-1">
                  <div className="text-xs text-slate-400 italic">
                    Enter a question number or summary below to enable quick reactions.
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-1">
                  ← Judge's Bench →
                </div>
                {arrangeJurorsInGrid(jurors, seatingConfig).map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-2 justify-center">
                    {row.map(juror => {
                      const isDismissed = dismissedSet.has(juror.number);
                      const hasResponded = respondedJurors.has(juror.number);
                      const flashType = flashedCells[juror.number];
                      const isNoteOpen = noteJuror === juror.number;
                      const lastName = juror.name.split(' ')[0] || juror.name;

                      return (
                        <div
                          key={juror.number}
                          data-testid={`seating-cell-${juror.number}`}
                          className={`relative flex-1 min-w-0 max-w-[160px] rounded-lg border p-2 transition-all duration-200 ${
                            isDismissed
                              ? 'bg-slate-100 border-slate-200 opacity-50'
                              : flashType
                              ? flashType === 'raised-hand' ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300'
                                : flashType === 'head-nod' ? 'bg-green-100 border-green-400 ring-2 ring-green-300'
                                : flashType === 'head-shake' ? 'bg-red-100 border-red-400 ring-2 ring-red-300'
                                : 'bg-blue-100 border-blue-400 ring-2 ring-blue-300'
                              : hasResponded
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-center mb-1.5">
                            <div className={`text-xs font-bold truncate ${isDismissed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              #{juror.number} - {lastName}
                            </div>
                            {isDismissed && (
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Dismissed</span>
                            )}
                            {hasResponded && !isDismissed && (
                              <span className="text-[9px] font-bold text-emerald-600">✓ Responded</span>
                            )}
                          </div>

                          {!isDismissed && (
                            <>
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleReaction(juror.number, 'raised-hand')}
                                  disabled={!hasQuestion}
                                  data-testid={`button-reaction-hand-${juror.number}`}
                                  title="Raised Hand"
                                  className={`p-1 rounded transition-colors ${
                                    hasQuestion
                                      ? 'hover:bg-yellow-100 text-yellow-700 active:bg-yellow-200'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  <Hand className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReaction(juror.number, 'head-nod')}
                                  disabled={!hasQuestion}
                                  data-testid={`button-reaction-nod-${juror.number}`}
                                  title="Head Nod"
                                  className={`p-1 rounded transition-colors ${
                                    hasQuestion
                                      ? 'hover:bg-green-100 text-green-700 active:bg-green-200'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReaction(juror.number, 'head-shake')}
                                  disabled={!hasQuestion}
                                  data-testid={`button-reaction-shake-${juror.number}`}
                                  title="Head Shake"
                                  className={`p-1 rounded transition-colors ${
                                    hasQuestion
                                      ? 'hover:bg-red-100 text-red-700 active:bg-red-200'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleNote(juror.number)}
                                  disabled={!hasQuestion}
                                  data-testid={`button-reaction-note-${juror.number}`}
                                  title="Note"
                                  className={`p-1 rounded transition-colors ${
                                    isNoteOpen
                                      ? 'bg-blue-100 text-blue-700'
                                      : hasQuestion
                                      ? 'hover:bg-blue-100 text-blue-600 active:bg-blue-200'
                                      : 'text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  <StickyNote className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <AnimatePresence>
                                {isNoteOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden mt-1"
                                  >
                                    <div className="flex gap-1">
                                      <input
                                        ref={noteInputRef}
                                        type="text"
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleNoteSubmit(juror.number);
                                          }
                                          if (e.key === 'Escape') {
                                            setNoteJuror(null);
                                            setNoteText('');
                                          }
                                        }}
                                        data-testid={`input-note-${juror.number}`}
                                        className="flex-1 min-w-0 px-1.5 py-1 text-xs rounded border border-blue-300 focus:ring-1 focus:ring-blue-400 bg-white"
                                        placeholder="Note..."
                                      />
                                      <button
                                        onClick={() => handleNoteSubmit(juror.number)}
                                        className="p-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors shrink-0"
                                        data-testid={`button-submit-note-${juror.number}`}
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => { setNoteJuror(null); setNoteText(''); }}
                                        className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shrink-0"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mt-1">
                  ← Gallery →
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
