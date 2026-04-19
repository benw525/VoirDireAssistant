import React from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { friendlyApiError } from '../lib/api';

interface ApiErrorBannerProps {
  error: any;
  fallback: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  testIdPrefix?: string;
  className?: string;
}

export function ApiErrorBanner({
  error,
  fallback,
  onRetry,
  onDismiss,
  isRetrying = false,
  testIdPrefix = 'api-error',
  className = '',
}: ApiErrorBannerProps) {
  if (!error) return null;
  const friendly = friendlyApiError(error, fallback);
  const isWarn = friendly.code === 'rate_limit' || friendly.code === 'overloaded';
  const Icon = isWarn ? AlertTriangle : AlertCircle;
  const palette = isWarn
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-rose-50 border-rose-200 text-rose-800';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${palette} ${className}`}
      data-testid={`${testIdPrefix}-banner`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold" data-testid={`${testIdPrefix}-title`}>{friendly.title}</div>
        <div className="opacity-90 mt-0.5" data-testid={`${testIdPrefix}-message`}>{friendly.message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          data-testid={`${testIdPrefix}-retry`}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-current/20 hover:bg-current/5 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          data-testid={`${testIdPrefix}-dismiss`}
          className="shrink-0 p-1 rounded hover:bg-current/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
