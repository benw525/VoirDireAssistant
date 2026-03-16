import { useState, useRef, useCallback } from 'react';

interface DraggableWindowOptions {
  storageKey: string;
  defaultPosition: { x: number; y: number } | (() => { x: number; y: number });
  panelWidth?: number;
  panelHeight?: number;
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

function savePos(key: string, pos: { x: number; y: number }) {
  sessionStorage.setItem(key, JSON.stringify(pos));
}

export function useDraggableWindow({ storageKey, defaultPosition, panelWidth = 370, panelHeight = 520 }: DraggableWindowOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => loadPos(storageKey));
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);
  const startRef = useRef({ px: 0, py: 0, ex: 0, ey: 0 });
  const handleRef = useRef<HTMLElement | null>(null);

  const getPosition = useCallback((): { x: number; y: number } => {
    if (position) return position;
    return typeof defaultPosition === 'function' ? defaultPosition() : defaultPosition;
  }, [position, defaultPosition]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    const pos = getPosition();
    startRef.current = { px: pos.x, py: pos.y, ex: e.clientX, ey: e.clientY };
    dragging.current = true;
    setIsDragging(true);
    handleRef.current = e.currentTarget as HTMLElement;
    handleRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [getPosition]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const dx = e.clientX - startRef.current.ex;
    const dy = e.clientY - startRef.current.ey;
    const newPos = {
      x: Math.max(-panelWidth + 80, Math.min(startRef.current.px + dx, window.innerWidth - 80)),
      y: Math.max(0, Math.min(startRef.current.py + dy, window.innerHeight - 40)),
    };
    setPosition(newPos);
    savePos(storageKey, newPos);
  }, [storageKey, panelWidth]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    setIsDragging(false);
    try {
      handleRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    handleRef.current = null;
  }, []);

  return {
    position: getPosition(),
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
