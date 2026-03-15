import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import { useDraggablePosition } from '../../hooks/useDraggablePosition';

interface AIAssistantButtonProps {
  hidden: boolean;
  onClick: () => void;
}

export function AIAssistantButton({ hidden, onClick }: AIAssistantButtonProps) {
  const {
    position,
    isDragging,
    hasMoved,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useDraggablePosition({
    storageKey: 'voir_dire_ai_btn_pos',
    defaultPosition: () => ({ x: window.innerWidth - 56 - 24, y: window.innerHeight - 56 - 24 }),
  });

  if (hidden) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 60,
    touchAction: 'none',
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={style}
      className={`select-none ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => {
        const wasDragging = handlePointerUp(e);
        if (!wasDragging && !hasMoved.current) {
          onClick();
        }
      }}
      onPointerCancel={(e) => handlePointerUp(e)}
      data-testid="button-ai-assistant"
      data-tour="ai-assistant"
    >
      <div className="w-14 h-14 rounded-full bg-slate-900 shadow-lg shadow-slate-900/30 flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105">
        <BrainCircuit className="w-7 h-7 text-amber-500" />
      </div>
    </motion.div>
  );
}
