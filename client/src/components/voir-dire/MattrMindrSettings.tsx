import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Unlink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Globe,
  Mail,
  Lock
} from 'lucide-react';
import * as api from '../../lib/api';

interface MattrMindrSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function MattrMindrSettings({ isOpen, onClose, onConnectionChange }: MattrMindrSettingsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUrl, setConnectedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const status = await api.getMattrMindrStatus();
      setIsConnected(status.connected);
      if (status.connected && status.url) {
        setConnectedUrl(status.url);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await api.connectMattrMindr(url.trim(), email.trim(), password);
      setIsConnected(true);
      setConnectedUrl(url.trim());
      setSuccess('Connected to MattrMindr successfully');
      setUrl('');
      setEmail('');
      setPassword('');
      onConnectionChange?.(true);
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await api.disconnectMattrMindr();
      setIsConnected(false);
      setConnectedUrl('');
      setSuccess('');
      onConnectionChange?.(false);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">MattrMindr Integration</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600" data-testid="button-close-mattrmindr">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-900">Connected</div>
                    <div className="text-sm text-emerald-700 mt-1">{connectedUrl}</div>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  You can load cases from MattrMindr when creating a new case, and push jury analysis results back after completing voir dire.
                </p>

                <button
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  data-testid="button-disconnect-mattrmindr"
                  className="w-full py-2.5 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <p className="text-sm text-slate-600">
                  Connect your MattrMindr account to import case data and push jury analysis results.
                </p>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {success}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Globe className="w-3.5 h-3.5 inline mr-1.5" />
                    MattrMindr URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="e.g., mobile.mattrmindr.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    data-testid="input-mattrmindr-url"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    data-testid="input-mattrmindr-email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    data-testid="input-mattrmindr-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-connect-mattrmindr"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Connect to MattrMindr
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
