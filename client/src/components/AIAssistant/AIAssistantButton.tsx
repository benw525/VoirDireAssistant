import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Move, RotateCcw } from 'lucide-react';

interface AIAssistantButtonProps {
  hidden: boolean;
  onClick: () => void;
}

const STORAGE_KEY = 'voir_dire_ai_btn_pos';

function loadPosition() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ x: number; y: number; bx: number; by: number } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const didDrag = useRef(false);

  const resetPosition = useCallback(() => {
    setPosition(null);
    savePosition(null);
    setDragMode(false);
  }, []);

  useEffect(() => {
    const handler = () => setShowContextMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    didDrag.current = false;

    if (dragMode) {
      e.preventDefault();
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: e.clientX, y: e.clientY, bx: rect.left, by: rect.top };
        setIsDragging(true);
      }
      return;
    }

    longPressTimer.current = setTimeout(() => {
      setDragMode(true);
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: e.clientX, y: e.clientY, bx: rect.left, by: rect.top };
        setIsDragging(true);
        didDrag.current = true;
      }
    }, 500);
  }, [dragMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current) return;
    e.preventDefault();
    didDrag.current = true;

    const newLeft = dragStart.current.bx + (e.clientX - dragStart.current.x);
    const newTop = dragStart.current.by + (e.clientY - dragStart.current.y);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampedLeft = Math.max(0, Math.min(newLeft, vw - 56));
    const clampedTop = Math.max(0, Math.min(newTop, vh - 56));

    const absPos = { x: clampedLeft, y: clampedTop };
    setPosition(absPos);
    savePosition(absPos);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      dragStart.current = null;
      if (dragMode && didDrag.current) {
        setTimeout(() => setDragMode(false), 100);
      }
      return;
    }
    if (!didDrag.current) {
      onClick();
    }
  }, [isDragging, dragMode, onClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  if (hidden) return null;

  const style: React.CSSProperties = position && typeof position.x === 'number' && position.x >= 0
    ? { position: 'fixed', left: position.x, top: position.y, right: 'auto', bottom: 'auto', zIndex: 60 }
    : { position: 'fixed', right: 24, bottom: 24, zIndex: 60 };

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
      >
        <div className={`w-14 h-14 rounded-full bg-slate-900 shadow-lg shadow-slate-900/30 flex items-center justify-center transition-all duration-200 ${dragMode ? 'ring-2 ring-amber-500 ring-offset-2' : 'hover:shadow-xl hover:scale-105'}`}>
          <BrainCircuit className="w-7 h-7 text-amber-500" />
        </div>
        {dragMode && !isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
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
