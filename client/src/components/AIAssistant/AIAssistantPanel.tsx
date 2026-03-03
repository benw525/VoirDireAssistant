import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, BrainCircuit, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { getAuthToken } from '../../lib/auth';
import type { CaseInfo, Juror } from '../../types';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextLabel?: string;
  caseInfo?: CaseInfo | null;
  jurors?: Juror[];
  currentPhase?: number;
}

const SUGGESTIONS = [
  "What should I focus on in voir dire?",
  "Summarize my current case",
  "Which jurors are highest risk?",
];

function buildContextBlock(caseInfo?: CaseInfo | null, jurors?: Juror[], currentPhase?: number): string {
  const parts: string[] = [];

  if (currentPhase !== undefined && currentPhase !== null) {
    const phaseNames: Record<number, string> = {
      0: 'Welcome Screen',
      1: 'Case Setup',
      2: 'Strike List / Juror Entry',
      3: 'Voir Dire Questions',
      4: 'Recording Responses',
      5: 'Review & Strategy',
      6: 'Final Report',
    };
    parts.push(`The user is currently on: ${phaseNames[currentPhase] || 'Unknown'} (Phase ${currentPhase})`);
  }

  if (caseInfo) {
    parts.push(`Active Case: "${caseInfo.name}"`);
    parts.push(`Area of Law: ${caseInfo.areaOfLaw}`);
    parts.push(`Side: ${caseInfo.side}`);
    if (caseInfo.summary) parts.push(`Case Summary: ${caseInfo.summary}`);
    if (caseInfo.favorableTraits?.length) parts.push(`Favorable juror traits: ${caseInfo.favorableTraits.join(', ')}`);
    if (caseInfo.riskTraits?.length) parts.push(`Risk juror traits: ${caseInfo.riskTraits.join(', ')}`);
  }

  if (jurors && jurors.length > 0) {
    parts.push(`\nJuror Panel (${jurors.length} jurors):`);
    const leanCounts = { favorable: 0, neutral: 0, unfavorable: 0, unknown: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0, unassessed: 0 };
    jurors.forEach(j => {
      leanCounts[j.lean] = (leanCounts[j.lean] || 0) + 1;
      riskCounts[j.riskTier] = (riskCounts[j.riskTier] || 0) + 1;
    });
    parts.push(`Lean breakdown: ${leanCounts.favorable} favorable, ${leanCounts.neutral} neutral, ${leanCounts.unfavorable} unfavorable, ${leanCounts.unknown} unknown`);
    parts.push(`Risk breakdown: ${riskCounts.low} low, ${riskCounts.medium} medium, ${riskCounts.high} high, ${riskCounts.unassessed} unassessed`);

    const jurorSummaries = jurors.slice(0, 30).map(j =>
      `#${j.number} ${j.name} | ${j.occupation} | ${j.sex}/${j.race} | lean:${j.lean} risk:${j.riskTier}${j.notes ? ` | notes: ${j.notes.slice(0, 80)}` : ''}`
    );
    parts.push(jurorSummaries.join('\n'));
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

export function AIAssistantPanel({ isOpen, onClose, contextLabel, caseInfo, jurors, currentPhase }: AIAssistantPanelProps) {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      createConversation();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const createConversation = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: 'AI Assistant Chat' }),
      });
      if (res.ok) {
        const conv = await res.json();
        setConversationId(conv.id);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleNewChat = async () => {
    if (conversationId && messages.length > 0) {
      try {
        const token = getAuthToken();
        await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
      } catch {}
    }
    setMessages([]);
    setStreamingContent('');
    setConversationId(null);
    await createConversation();
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let convId = conversationId;
    if (!convId) {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title: 'AI Assistant Chat' }),
        });
        if (res.ok) {
          const conv = await res.json();
          convId = conv.id;
          setConversationId(conv.id);
        }
      } catch {
        return;
      }
    }

    const userMsg: Message = { id: Date.now(), role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const token = getAuthToken();
      const contextBlock = buildContextBlock(caseInfo, jurors, currentPhase);

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: content.trim(),
          context: contextBlock || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || err.message || 'Request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.done) {
              streamDone = true;
              break;
            }
            if (data.error) {
              fullContent += `\n\n*Error: ${data.error}*`;
              setStreamingContent(fullContent);
              streamDone = true;
              break;
            }
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: fullContent };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingContent('');
    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMsg: Message = { id: Date.now() + 1, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMsg]);
      setStreamingContent('');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[70] flex flex-col bg-white sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[420px] sm:shadow-2xl sm:border-l sm:border-slate-200"
      data-testid="panel-ai-assistant"
    >
      <div className="bg-slate-900 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">AI Assistant</h2>
            {contextLabel && (
              <p className="text-slate-400 text-xs">{contextLabel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            title="New chat"
            data-testid="button-ai-new-chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            data-testid="button-ai-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-slate-100 p-5 rounded-2xl mb-5">
              <BrainCircuit className="w-12 h-12 text-amber-500" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">How can I help?</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-[280px]">
              Ask me anything — Alabama law, case strategy, or how to use Voir Dire Analyst.
            </p>
            <div className="space-y-2 w-full max-w-[300px]">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/50 text-sm text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-center gap-2.5"
                  data-testid={`button-ai-suggestion-${i}`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-800 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-slate max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 px-4 py-3 text-sm leading-relaxed">
                  <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0 bg-white"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-slate-50 outline-none"
          disabled={isStreaming}
          data-testid="input-ai-message"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="bg-amber-500 text-white p-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          data-testid="button-ai-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}
