import { AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import type { FlagRollupResult } from '../../types';

/**
 * Shared renderer for the unresolved-flag queue (Lewis/Whigham Section 5):
 * the panel-level rollup ranked by case-dispositive value, with per-topic
 * unresolved juror chips. Used on demand in the recording phase and
 * automatically at the top of the strike phase.
 */
export function FlagRollupPanel({ data }: { data: FlagRollupResult }) {
  if (data.totalUnresolved === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-700 text-sm" data-testid="text-no-unresolved-flags">
        <CheckCircle2 className="w-4 h-4" />
        No unresolved flags — every raise or note on a case-critical topic has a recorded answer.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="panel-flag-rollup">
      <p className="text-sm font-medium text-amber-900" data-testid="text-flag-summary-line">
        {data.summaryLine}
      </p>
      {data.posture === 'conceded-or-weak-liability' && (
        <p className="text-xs text-amber-800">
          Liability posture: conceded/weak — jurors with no damages-posture answer are flagged below.
        </p>
      )}
      <div className="space-y-3">
        {data.topics.filter(t => t.unresolvedCount > 0).map(topic => (
          <div key={topic.topic} className="bg-white/70 rounded-lg border border-amber-200 p-3" data-testid={`flag-topic-${topic.topic}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Flag className="w-3.5 h-3.5 text-amber-600" />
                {topic.label}
                <span className="text-amber-700">({topic.unresolvedCount} unresolved)</span>
              </div>
              {topic.resolvedCount > 0 && (
                <span className="text-xs text-emerald-700">{topic.resolvedCount} resolved</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topic.unresolvedJurors.map(j => (
                <span
                  key={j.number}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-medium"
                  data-testid={`flag-juror-${topic.topic}-${j.number}`}
                >
                  #{j.number} {j.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        A flag resolves when a follow-up answer is recorded on it (or the juror gave a developed
        narrative answer). Whigham lesson: an unvalenced raise is not neutral — it is unknown risk.
      </p>
    </div>
  );
}
