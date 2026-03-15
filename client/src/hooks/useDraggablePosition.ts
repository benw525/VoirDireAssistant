import { useState, useRef, useCallback } from 'react';

interface DraggableOptions {
  storageKey: string;
  defaultPosition: { x: number; y: number } | (() => { x: number; y: number });
  size?: number;
}

function loadPos(key: string): { x: number; y: number } | null {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
    }
  } catch {}
  return null;
}

function savePos(key: string, pos: { x: number; y: number } | null) {
  if (pos) {
    sessionStorage.setItem(key, JSON.stringify(pos));
  } else {
    sessionStorage.removeItem(key);
  }
}

export function useDraggablePosition({ storageKey, defaultPosition, size = 56 }: DraggableOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => loadPos(storageKey));
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef({ px: 0, py: 0, ex: 0, ey: 0 });

  const getPosition = useCallback((): { x: number; y: number } => {
    if (position) return position;
    return typeof defaultPosition === 'function' ? defaultPosition() : defaultPosition;
  }, [position, defaultPosition]);

  const resetPosition = useCallback(() => {
    setPosition(null);
    savePos(storageKey, null);
  }, [storageKey]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    const pos = getPosition();
    startPos.current = { px: pos.x, py: pos.y, ex: e.clientX, ey: e.clientY };
    hasMoved.current = false;
    isDraggingRef.current = false;
  }, [getPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startPos.current.ex;
    const dy = e.clientY - startPos.current.ey;

    if (!isDraggingRef.current) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
        setIsDragging(true);
        hasMoved.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } else {
        return;
      }
    }

    e.preventDefault();
    const newX = startPos.current.px + dx;
    const newY = startPos.current.py + dy;
    const clamped = {
      x: Math.max(0, Math.min(newX, window.innerWidth - size)),
      y: Math.max(0, Math.min(newY, window.innerHeight - size)),
    };
    setPosition(clamped);
    savePos(storageKey, clamped);
  }, [storageKey, size]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    return wasDragging;
  }, []);

  return {
    position: getPosition(),
    isDragging,
    hasMoved,
    resetPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
