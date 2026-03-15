import { useState, useRef, useCallback } from 'react';

interface DraggableOptions {
  storageKey: string;
  defaultPosition: { x: number; y: number } | (() => { x: number; y: number });
  size?: number;
  holdDelay?: number;
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

export function useDraggablePosition({ storageKey, defaultPosition, size = 56, holdDelay = 400 }: DraggableOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => loadPos(storageKey));
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const holdActivated = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef({ px: 0, py: 0, ex: 0, ey: 0 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const getPosition = useCallback((): { x: number; y: number } => {
    if (position) return position;
    return typeof defaultPosition === 'function' ? defaultPosition() : defaultPosition;
  }, [position, defaultPosition]);

  const resetPosition = useCallback(() => {
    setPosition(null);
    savePos(storageKey, null);
  }, [storageKey]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    const pos = getPosition();
    startPos.current = { px: pos.x, py: pos.y, ex: e.clientX, ey: e.clientY };
    hasMoved.current = false;
    isDraggingRef.current = false;
    holdActivated.current = false;
    pointerIdRef.current = e.pointerId;

    holdTimer.current = setTimeout(() => {
      holdActivated.current = true;
      isDraggingRef.current = true;
      setIsDragging(true);
      hasMoved.current = true;
    }, holdDelay);
  }, [getPosition, holdDelay]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startPos.current.ex;
    const dy = e.clientY - startPos.current.ey;

    if (!holdActivated.current) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        clearHoldTimer();
      }
      return;
    }

    if (!isDraggingRef.current) return;

    e.preventDefault();
    hasMoved.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const newX = startPos.current.px + dx;
    const newY = startPos.current.py + dy;
    const clamped = {
      x: Math.max(0, Math.min(newX, window.innerWidth - size)),
      y: Math.max(0, Math.min(newY, window.innerHeight - size)),
    };
    setPosition(clamped);
    savePos(storageKey, clamped);
  }, [storageKey, size, clearHoldTimer]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    clearHoldTimer();
    const wasDragging = isDraggingRef.current && hasMoved.current && holdActivated.current;
    isDraggingRef.current = false;
    holdActivated.current = false;
    setIsDragging(false);
    pointerIdRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    return wasDragging;
  }, [clearHoldTimer]);

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
