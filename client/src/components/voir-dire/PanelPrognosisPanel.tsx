import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Gem,
  Loader2,
  RefreshCw,
  Scale,
  Users,
} from 'lucide-react';
import type { PanelPrognosis } from '../../types';
import { ApiErrorBanner } from '../ApiErrorBanner';

interface PanelPrognosisPanelProps {
  prognosis: PanelPrognosis | null;
  loading: boolean;
  error: any;
  onRetry?: () => void;
  /** Compact = collapsed by default (used inside phase screens). */
  defaultExpanded?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  panel_load: 'At panel load — composition only, no responses yet',
  responses_closed: 'Responses closed — includes recorded raises and flags',
};

function pct(density: number): string {
  return `${Math.round(density * 100)}%`;
}

function JurorChips({ numbers, tone }: { numbers: number[]; tone: 'rose' | 'sky' | 'emerald' }) {
  if (numbers.length === 0) return null;
  const palette =
    tone === 'rose'
      ? 'bg-rose-100 text-rose-800'
      : tone === 'sky'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-emerald-100 text-emerald-800';
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {numbers.map((n) => (
        <span key={n} className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${palette}`}>
          #{n}
        </span>
      ))}
    </span>
  );
}

export function PanelPrognosisPanel({ prognosis, loading, error, onRetry, defaultExpanded = true }: PanelPrognosisPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3" data-testid="panel-prognosis-loading">
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        <div className="text-sm text-slate-600">
          Generating panel prognosis — densities and strike arithmetic are computed, the strategist is writing the read…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorBanner
        error={error}
        fallback="Failed to generate the panel prognosis."
        onRetry={onRetry}
        testIdPrefix="panel-prognosis-error"
      />
    );
  }

  if (!prognosis) return null;

  const m = prognosis.metrics;
  const warning = prognosis.settlementPostureWarning || m.settlementPostureWarning;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="panel-prognosis">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white"
        data-testid="panel-prognosis-toggle"
      >
        <span className="flex items-center gap-2 font-bold text-sm">
          <Activity className="w-4 h-4" />
          Panel Prognosis
          <span className="text-[11px] font-medium text-slate-300">
            {STAGE_LABELS[prognosis.stage] || prognosis.stage}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {warning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {warning && (
            <div
              className="flex items-start gap-3 p-3 rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-900"
              data-testid="prognosis-settlement-warning"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-bold text-sm uppercase tracking-wide">Settlement-Posture Warning</div>
                <div className="text-sm mt-1">{warning}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="prognosis-metrics">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Active Panel</div>
              <div className="text-xl font-bold text-slate-900">{m.panelSize}</div>
              <div className="text-[11px] text-slate-500">{m.dismissedCount > 0 ? `${m.dismissedCount} dismissed` : 'none dismissed'}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Strikes / Side</div>
              <div className="text-xl font-bold text-slate-900">{m.strikesPerSide}</div>
              <div className="text-[11px] text-slate-500">jury of {m.jurySize}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Claimant History</div>
              <div className="text-xl font-bold text-rose-700">
                {m.claimantHistory.count}
                <span className="text-sm font-semibold text-slate-500 ml-1">({pct(m.claimantHistory.density)})</span>
              </div>
              <div className="mt-1"><JurorChips numbers={m.claimantHistory.jurorNumbers} tone="rose" /></div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Clinical / Advocacy</div>
              <div className="text-xl font-bold text-sky-700">
                {m.clinicalAdvocacy.count}
                <span className="text-sm font-semibold text-slate-500 ml-1">({pct(m.clinicalAdvocacy.density)})</span>
              </div>
              <div className="mt-1"><JurorChips numbers={m.clinicalAdvocacy.matches.map((x) => x.jurorNumber)} tone="sky" /></div>
            </div>
          </div>

          {m.adverseSurvivalFloor > 0 && (
            <div className="text-xs text-rose-700 font-semibold" data-testid="prognosis-survival-floor">
              Strike arithmetic: at least {m.adverseSurvivalFloor} claimant-history juror{m.adverseSurvivalFloor === 1 ? '' : 's'} cannot be removed with {m.strikesPerSide} peremptories.
            </div>
          )}

          <div className="text-sm text-slate-700 leading-relaxed" data-testid="prognosis-narrative">
            {prognosis.narrative}
          </div>

          {prognosis.assets.length > 0 && (
            <div data-testid="prognosis-assets">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                <Gem className="w-3.5 h-3.5 text-emerald-600" /> Assets & Fragility
              </div>
              <div className="space-y-2">
                {prognosis.assets.map((a) => (
                  <div key={a.jurorNumber} className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-sm">
                    <span className="font-bold text-slate-900">#{a.jurorNumber} {a.jurorName}</span>
                    <span className="text-slate-700"> — {a.why}</span>
                    <div className="text-xs text-amber-800 mt-1">
                      <span className="font-semibold uppercase">Fragility:</span> {a.fragility}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(prognosis.strikeTargets.ours.length > 0 || prognosis.strikeTargets.theirs.length > 0) && (
            <div className="grid md:grid-cols-2 gap-3" data-testid="prognosis-strike-targets">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  <Crosshair className="w-3.5 h-3.5 text-rose-600" /> Our Likely Strikes
                </div>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {prognosis.strikeTargets.ours.map((t) => (
                    <li key={t.jurorNumber}>
                      <span className="font-bold">#{t.jurorNumber} {t.jurorName}</span> — {t.reason}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  <Crosshair className="w-3.5 h-3.5 text-sky-600" /> Their Likely Strikes
                </div>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {prognosis.strikeTargets.theirs.map((t) => (
                    <li key={t.jurorNumber}>
                      <span className="font-bold">#{t.jurorNumber} {t.jurorName}</span> — {t.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {prognosis.bestCaseSeatedJury.jurorNumbers.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3" data-testid="prognosis-best-case">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                <Scale className="w-3.5 h-3.5 text-slate-700" /> Realistic Best-Case Seated Jury
              </div>
              <div className="mb-2"><JurorChips numbers={prognosis.bestCaseSeatedJury.jurorNumbers} tone="emerald" /></div>
              <div className="text-sm text-slate-700">{prognosis.bestCaseSeatedJury.assessment}</div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Densities and strike arithmetic computed from panel data; strategy narrative AI-generated.
            </span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
                data-testid="prognosis-regenerate"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
