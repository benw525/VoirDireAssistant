import React from 'react';
import {
  Scale,
  CheckCircle2,
  Circle,
  Lock,
  ChevronRight,
  Menu,
  X } from
'lucide-react';
import { AppPhase, CaseInfo } from '../../types';
interface SidebarProps {
  currentPhase: AppPhase;
  caseInfo: CaseInfo | null;
  jurorCount: number;
  completedPhases: Set<AppPhase>;
  onPhaseSelect: (phase: AppPhase) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}
const PHASES = [
{
  id: 1,
  label: 'New Case',
  short: 'Setup'
},
{
  id: 2,
  label: 'Strike List',
  short: 'Jurors'
},
{
  id: 3,
  label: 'Voir Dire Questions',
  short: 'Questions'
},
{
  id: 4,
  label: 'Record Responses',
  short: 'Record'
},
{
  id: 5,
  label: 'Review & Strategy',
  short: 'Review'
},
{
  id: 6,
  label: 'End Voir Dire',
  short: 'Report'
}] as
const;
export function Sidebar({
  currentPhase,
  caseInfo,
  jurorCount,
  completedPhases,
  onPhaseSelect,
  isOpen,
  setIsOpen
}: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen &&
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
        onClick={() => setIsOpen(false)} />

      }

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-900 text-slate-300 flex flex-col h-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div
            className="flex items-center space-x-3 text-white cursor-pointer"
            onClick={() => onPhaseSelect(0)}>

            <div className="bg-amber-500 p-2 rounded-lg">
              <Scale className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                Voir Dire Analyst
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                Jury Selection
              </p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}>

            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Case Mini-Summary */}
        {caseInfo &&
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Case
            </div>
            <div className="font-medium text-white truncate">
              {caseInfo.areaOfLaw}
            </div>
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-amber-500 capitalize">{caseInfo.side}</span>
              <span className="text-slate-400">{jurorCount} Jurors</span>
            </div>
          </div>
        }

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {PHASES.map((phase) => {
            const isCurrent = currentPhase === phase.id;
            const isCompleted = completedPhases.has(phase.id as AppPhase);
            const isLocked =
            !isCompleted &&
            !isCurrent &&
            phase.id > Math.max(0, ...Array.from(completedPhases)) + 1;
            const isClickable =
            isCompleted ||
            isCurrent ||
            phase.id === Math.max(0, ...Array.from(completedPhases)) + 1;
            return (
              <button
                key={phase.id}
                onClick={() =>
                isClickable && onPhaseSelect(phase.id as AppPhase)
                }
                disabled={!isClickable}
                className={`
                  w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCurrent ? 'bg-amber-500/10 text-amber-500' : ''}
                  ${!isCurrent && isClickable ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : ''}
                  ${!isClickable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}>

                <div className="flex-shrink-0 mr-3">
                  {isCompleted && !isCurrent ?
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                  isCurrent ?
                  <div className="relative flex items-center justify-center w-5 h-5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-20 animate-ping"></span>
                      <Circle className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                    </div> :
                  isLocked ?
                  <Lock className="w-5 h-5 text-slate-600" /> :

                  <Circle className="w-5 h-5 text-slate-600" />
                  }
                </div>
                <span className="flex-1 text-left">
                  {phase.id}. {phase.label}
                </span>
                {isCurrent &&
                <ChevronRight className="w-4 h-4 text-amber-500" />
                }
              </button>);

          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Confidential Legal Work Product
        </div>
      </div>
    </>);

}