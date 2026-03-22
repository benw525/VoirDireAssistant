import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Scale, Users, ArrowRight, Loader2 } from 'lucide-react';
import * as api from '../lib/api';
import { setCollabSession } from '../lib/collabAuth';

export default function TeamJoinPage() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get('code');
    if (prefill) setCode(prefill.toUpperCase().slice(0, 6));
  }, []);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = displayName.trim();

    if (trimmedCode.length !== 6) {
      setError('Session code must be 6 characters');
      return;
    }
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.joinSession(trimmedCode, trimmedName);
      setCollabSession({
        token: result.token,
        sessionId: result.sessionId,
        participantId: result.participantId,
        displayName: trimmedName,
        caseId: result.caseId,
        caseName: result.caseName,
      });
      setLocation('/team/session');
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Scale className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join Recording Session</h1>
          <p className="text-slate-500 mt-2">Enter the session code shared by your team lead to start recording juror responses together.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Session Code</label>
            <input
              type="text"
              data-testid="input-session-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none uppercase"
              maxLength={6}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
            <input
              type="text"
              data-testid="input-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Sarah, Paralegal"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              maxLength={50}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm" data-testid="text-join-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            data-testid="button-join-session"
            disabled={isLoading || code.length !== 6 || !displayName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Join Session
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Voir Dire Analyst — Collaborative Recording
        </p>
      </div>
    </div>
  );
}
