import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onBeforeShow?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

function getPlacement(rect: DOMRect, placement: string, tooltipW: number, tooltipH: number) {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = 0;
  let y = 0;
  let arrowSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

  switch (placement) {
    case 'bottom':
      x = rect.left + rect.width / 2 - tooltipW / 2;
      y = rect.bottom + gap;
      arrowSide = 'top';
      break;
    case 'top':
      x = rect.left + rect.width / 2 - tooltipW / 2;
      y = rect.top - tooltipH - gap;
      arrowSide = 'bottom';
      break;
    case 'right':
      x = rect.right + gap;
      y = rect.top + rect.height / 2 - tooltipH / 2;
      arrowSide = 'left';
      break;
    case 'left':
      x = rect.left - tooltipW - gap;
      y = rect.top + rect.height / 2 - tooltipH / 2;
      arrowSide = 'right';
      break;
  }

  if (x < 10) x = 10;
  if (x + tooltipW > vw - 10) x = vw - tooltipW - 10;
  if (y < 10) y = 10;
  if (y + tooltipH > vh - 10) y = vh - tooltipH - 10;

  return { x, y, arrowSide };
}

function bestPlacement(rect: DOMRect): 'top' | 'bottom' | 'left' | 'right' {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;

  const spaces = [
    { dir: 'bottom' as const, space: spaceBelow },
    { dir: 'top' as const, space: spaceAbove },
    { dir: 'right' as const, space: spaceRight },
    { dir: 'left' as const, space: spaceLeft },
  ];
  spaces.sort((a, b) => b.space - a.space);
  return spaces[0].dir;
}

export function GuidedTour({ steps, isActive, onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; arrowSide: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const repositionTooltip = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(`[data-testid="${step.target}"]`) ||
               document.querySelector(`[data-tour="${step.target}"]`);

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      requestAnimationFrame(() => {
        const tooltipW = 340;
        const tooltipH = 180;
        const placement = step.placement || bestPlacement(rect);
        const pos = getPlacement(rect, placement, tooltipW, tooltipH);
        setTooltipPos(pos);
      });
    } else {
      setTargetRect(null);
      setTooltipPos({ x: window.innerWidth / 2 - 170, y: window.innerHeight / 2 - 90, arrowSide: 'top' });
    }
  }, [step]);

  useEffect(() => {
    if (!isActive || !step) return;
    if (step.onBeforeShow) step.onBeforeShow();

    const el = document.querySelector(`[data-testid="${step.target}"]`) ||
               document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const timer = setTimeout(repositionTooltip, 100);
    window.addEventListener('resize', repositionTooltip);
    window.addEventListener('scroll', repositionTooltip, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', repositionTooltip);
      window.removeEventListener('scroll', repositionTooltip, true);
    };
  }, [isActive, currentStep, step, repositionTooltip]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setTargetRect(null);
      setTooltipPos(null);
    }
  }, [isActive]);

  if (!isActive || !step) return null;

  const padding = 8;

  return (
    <div className="fixed inset-0 z-[9999]" data-testid="guided-tour-overlay">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight)"
          style={{ pointerEvents: 'all' }}
          onClick={onSkip}
        />
      </svg>

      {targetRect && (
        <div
          className="absolute border-2 border-amber-400 rounded-lg pointer-events-none"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 4px rgba(251,191,36,0.3), 0 0 20px rgba(251,191,36,0.2)',
          }}
        />
      )}

      <AnimatePresence mode="wait">
        {tooltipPos && (
          <motion.div
            ref={tooltipRef}
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-[340px]"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              zIndex: 10000,
            }}
            data-testid="guided-tour-tooltip"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{step.title}</h3>
              </div>
              <button
                onClick={onSkip}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                data-testid="button-tour-skip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-4">{step.content}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {currentStep + 1} of {steps.length}
              </span>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                    data-testid="button-tour-prev"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1"
                  data-testid="button-tour-next"
                >
                  {currentStep === steps.length - 1 ? 'Done' : 'Next'}
                  {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep ? 'w-4 bg-amber-500' : i < currentStep ? 'w-1.5 bg-amber-300' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
