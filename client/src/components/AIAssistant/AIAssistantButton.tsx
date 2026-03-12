import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Move, RotateCcw } from 'lucide-react';

interface AIAssistantButtonProps {
  hidden: boolean;
  onClick: () => void;
}

const STORAGE_KEY = 'voir_dire_ai_btn_pos';

function loadPosition(): { x: number; y: number } | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
    }
  } catch {}
  return null;
}

function savePosition(pos: { x: number; y: number } | null) {
  if (pos) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function AIAssistantButton({ hidden, onClick }: AIAssistantButtonProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(loadPosition);
  const [dragMode, setDragMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef<{ px: number; py: number; ex: number; ey: number }>({ px: 0, py: 0, ex: 0, ey: 0 });
  const btnRef = useRef<HTMLDivElement>(null);

  const resetPosition = useCallback(() => {
    setPosition(null);
    savePosition(null);
    setDragMode(false);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setShowContextMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const getButtonPosition = useCallback(() => {
    if (position) return position;
    return { x: window.innerWidth - 56 - 24, y: window.innerHeight - 56 - 24 };
  }, [position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;

    const btnPos = getButtonPosition();
    startPos.current = { px: btnPos.x, py: btnPos.y, ex: e.clientX, ey: e.clientY };
    hasMoved.current = false;

    if (dragMode) {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    longPressTimer.current = setTimeout(() => {
      isDraggingRef.current = true;
      hasMoved.current = true;
      setDragMode(true);
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }, 500);
  }, [dragMode, getButtonPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startPos.current.ex;
    const dy = e.clientY - startPos.current.ey;

    if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    if (!isDraggingRef.current) return;
    e.preventDefault();
    hasMoved.current = true;

    const newX = startPos.current.px + dx;
    const newY = startPos.current.py + dy;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamped = {
      x: Math.max(0, Math.min(newX, vw - 56)),
      y: Math.max(0, Math.min(newY, vh - 56)),
    };
    setPosition(clamped);
    savePosition(clamped);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (wasDragging) {
      if (dragMode) {
        setTimeout(() => setDragMode(false), 50);
      }
      return;
    }

    if (!hasMoved.current) {
      onClick();
    }
  }, [dragMode, onClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  if (hidden) return null;

  const pos = getButtonPosition();
  const style: React.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    zIndex: 60,
    touchAction: 'none',
  };

  return (
    <>
      <motion.div
        ref={btnRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={style}
        className={`select-none ${isDragging ? 'cursor-grabbing' : dragMode ? 'cursor-grab' : 'cursor-pointer'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={handleContextMenu}
        data-testid="button-ai-assistant"
        data-tour="ai-assistant"
      >
        <div className={`w-14 h-14 rounded-full bg-slate-900 shadow-lg shadow-slate-900/30 flex items-center justify-center transition-all duration-200 ${dragMode ? 'ring-2 ring-amber-500 ring-offset-2' : 'hover:shadow-xl hover:scale-105'}`}>
          <BrainCircuit className="w-7 h-7 text-amber-500" />
        </div>
        {dragMode && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none"
          >
            Drag to move
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              onClick={() => {
                setDragMode(true);
                setShowContextMenu(false);
              }}
              data-testid="button-ai-move"
            >
              <Move className="w-4 h-4 text-slate-400" />
              Move
            </button>
            <button
              className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              onClick={() => {
                resetPosition();
                setShowContextMenu(false);
              }}
              data-testid="button-ai-reset"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              Reset Position
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
