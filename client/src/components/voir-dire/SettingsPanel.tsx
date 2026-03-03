import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  LogOut,
  Link2,
  Unlink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import * as api from '../../lib/api';
import type { BillingStatus } from '../../lib/api';
import { getAuthToken } from '../../lib/auth';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  aiHidden: boolean;
  onAiHiddenChange: (hidden: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  aiHidden,
  onAiHiddenChange,
  onConnectionChange,
}: SettingsPanelProps) {
  const { user, logout } = useAuth();

  const [mmConnected, setMmConnected] = useState(false);
  const [mmUrl, setMmUrl] = useState('');
  const [mmLoading, setMmLoading] = useState(true);
  const [mmSubmitting, setMmSubmitting] = useState(false);
  const [mmError, setMmError] = useState('');
  const [mmSuccess, setMmSuccess] = useState('');
  const [mmFormUrl, setMmFormUrl] = useState('');
  const [mmFormEmail, setMmFormEmail] = useState('');
  const [mmFormPassword, setMmFormPassword] = useState('');

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkMmStatus();
      loadBilling();
    }
  }, [isOpen]);

  const loadBilling = async () => {
    setBillingLoading(true);
    try {
      const status = await api.getBillingStatus();
      setBilling(status);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCheckout = async (plan: 'monthly' | 'per_case') => {
    setCheckoutLoading(plan);
    try {
      const result = await api.createCheckout(plan);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setCheckoutLoading('portal');
    try {
      const result = await api.createPortalSession();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error('Portal error:', err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const checkMmStatus = async () => {
    setMmLoading(true);
    try {
      const status = await api.getMattrMindrStatus();
      setMmConnected(status.connected);
      if (status.connected && status.url) setMmUrl(status.url);
    } catch {
      setMmConnected(false);
    } finally {
      setMmLoading(false);
    }
  };

  const handleMmConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setMmError('');
    setMmSuccess('');
    setMmSubmitting(true);
    try {
      await api.connectMattrMindr(mmFormUrl.trim(), mmFormEmail.trim(), mmFormPassword);
      setMmConnected(true);
      setMmUrl(mmFormUrl.trim());
      setMmSuccess('Connected successfully');
      setMmFormUrl('');
      setMmFormEmail('');
      setMmFormPassword('');
      onConnectionChange?.(true);
    } catch (err: any) {
      setMmError(err.message || 'Failed to connect');
    } finally {
      setMmSubmitting(false);
    }
  };

  const handleMmDisconnect = async () => {
    setMmError('');
    setMmSubmitting(true);
    try {
      await api.disconnectMattrMindr();
      setMmConnected(false);
      setMmUrl('');
      setMmSuccess('');
      onConnectionChange?.(false);
    } catch (err: any) {
      setMmError(err.message || 'Failed to disconnect');
    } finally {
      setMmSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    setPwLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');
      setPwSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setShowChangePassword(false), 1500);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  if (!isOpen) return null;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="font-bold text-lg text-slate-900">Settings</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              data-testid="button-close-settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate" data-testid="text-settings-name">{user?.name}</div>
                <div className="text-sm text-slate-500 truncate" data-testid="text-settings-email">{user?.email}</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Subscription & Billing</h3>
              <div className="bg-slate-50 rounded-xl p-4">
                {billingLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : billing?.isFreeAccess ? (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-amber-800" data-testid="text-billing-plan">Unlimited Access</div>
                      <div className="text-xs text-amber-600">Full access to all features</div>
                    </div>
                  </div>
                ) : billing?.hasActiveSubscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-emerald-800" data-testid="text-billing-plan">Monthly Unlimited</div>
                        <div className="text-xs text-emerald-600">$20/mo — Unlimited cases</div>
                      </div>
                    </div>
                    <button
                      onClick={handleManageBilling}
                      disabled={checkoutLoading === 'portal'}
                      data-testid="button-manage-billing"
                      className="w-full py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Manage Subscription
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-100 border border-slate-200 rounded-xl">
                      <CreditCard className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-slate-800" data-testid="text-billing-plan">
                          {billing?.tier === 'per_case' ? 'Pay Per Case' : 'Free Plan'}
                        </div>
                        <div className="text-xs text-slate-500" data-testid="text-billing-usage">
                          {billing?.casesRemaining !== null
                            ? `${billing?.casesRemaining} case${billing?.casesRemaining === 1 ? '' : 's'} remaining`
                            : `${billing?.casesUsed || 0} case${(billing?.casesUsed || 0) === 1 ? '' : 's'} used`}
                        </div>
                      </div>
                    </div>

                    {!billing?.canCreateCase && billing?.upgradeReason && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700" data-testid="text-billing-upgrade-reason">
                        {billing.upgradeReason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCheckout('monthly')}
                        disabled={!!checkoutLoading}
                        data-testid="button-subscribe-monthly"
                        className="py-3 px-3 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex flex-col items-center gap-1"
                      >
                        {checkoutLoading === 'monthly' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span className="font-bold">$20/mo</span>
                            <span className="text-xs text-amber-100">Unlimited</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCheckout('per_case')}
                        disabled={!!checkoutLoading}
                        data-testid="button-buy-case"
                        className="py-3 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 flex flex-col items-center gap-1"
                      >
                        {checkoutLoading === 'per_case' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span className="font-bold">$20</span>
                            <span className="text-xs text-slate-500">Single Case</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">AI Assistant</h3>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Hide AI Assistant</div>
                    <div className="text-xs text-slate-500">Hides the floating AI button on all screens</div>
                  </div>
                </div>
                <button
                  onClick={() => onAiHiddenChange(!aiHidden)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${aiHidden ? 'bg-amber-500' : 'bg-slate-300'}`}
                  data-testid="toggle-ai-hidden"
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${aiHidden ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">MattrMindr</h3>
              <div className="bg-slate-50 rounded-xl p-4">
                {mmLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : mmConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700">Connected</span>
                      <span className="text-xs text-slate-500 ml-auto truncate max-w-[200px]">{mmUrl}</span>
                    </div>
                    <button
                      onClick={handleMmDisconnect}
                      disabled={mmSubmitting}
                      data-testid="button-disconnect-mattrmindr"
                      className="w-full py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {mmSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMmConnect} className="space-y-3">
                    <p className="text-xs text-slate-500">Connect to import cases and push jury analysis.</p>

                    {mmError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {mmError}
                      </div>
                    )}
                    {mmSuccess && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        {mmSuccess}
                      </div>
                    )}

                    <input
                      type="text"
                      value={mmFormUrl}
                      onChange={e => setMmFormUrl(e.target.value)}
                      placeholder="MattrMindr URL"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      data-testid="input-settings-mattrmindr-url"
                      required
                    />
                    <input
                      type="email"
                      value={mmFormEmail}
                      onChange={e => setMmFormEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      data-testid="input-settings-mattrmindr-email"
                      required
                    />
                    <input
                      type="password"
                      value={mmFormPassword}
                      onChange={e => setMmFormPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      data-testid="input-settings-mattrmindr-password"
                      required
                    />
                    <button
                      type="submit"
                      disabled={mmSubmitting}
                      data-testid="button-connect-mattrmindr"
                      className="w-full py-2 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {mmSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                      Connect
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Security</h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    setShowChangePassword(!showChangePassword);
                    setPwError('');
                    setPwSuccess('');
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  data-testid="button-toggle-change-password"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    Change Password
                  </div>
                  {showChangePassword ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                <AnimatePresence>
                  {showChangePassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3">
                        {pwError && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {pwError}
                          </div>
                        )}
                        {pwSuccess && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            {pwSuccess}
                          </div>
                        )}
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          data-testid="input-current-password"
                          required
                        />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="New password (min 6 characters)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          data-testid="input-new-password"
                          required
                          minLength={6}
                        />
                        <button
                          type="submit"
                          disabled={pwLoading}
                          data-testid="button-change-password"
                          className="w-full py-2 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          Update Password
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Session</h3>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                data-testid="button-settings-logout"
                className="w-full py-2.5 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
