import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  FileText,
  Scale,
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  ExternalLink,
  Search,
  Mic,
  MicOff,
  Square,
  Target,
  Plus,
  X,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { CaseInfo } from '../../types';
import * as api from '../../lib/api';

interface CaseSetupProps {
  onCaseSetup: (info: CaseInfo, mattrmindrCaseId?: string) => void;
  onProceed: () => void;
  existingInfo: CaseInfo | null;
  isMattrMindrConnected?: boolean;
}

const CASE_TYPES = [
  'Personal Injury',
  'Criminal Defense',
  'Medical Malpractice',
  'Contract Dispute',
  'Employment Law',
  'Family Law',
  'Civil Rights',
  'Other',
];

interface JurorProfile {
  favorable: string[];
  risk: string[];
}

const TARGET_JUROR_PROFILES: Record<string, Record<string, JurorProfile>> = {
  'Personal Injury': {
    plaintiff: {
      favorable: [
        'Empathetic toward injury victims',
        'Believes in corporate accountability',
        'Open to significant non-economic damages',
        'Has experienced personal injury or knows someone who has',
        'Distrusts large corporations or insurers',
      ],
      risk: [
        'Tort reform advocate',
        'Skeptical of emotional distress claims',
        'Believes lawsuits are excessive',
        'Works in insurance or risk management',
        'Strong personal responsibility ideology',
      ],
    },
    defense: {
      favorable: [
        'Values personal responsibility',
        'Skeptical of large damage awards',
        'Detail-oriented and analytical',
        'Works in business, finance, or management',
        'Believes some lawsuits are frivolous',
      ],
      risk: [
        'Anti-corporate bias',
        'Highly emotional or sympathetic',
        'Prior negative experience with insurance companies',
        'Has filed a personal injury claim before',
        'Distrusts corporations',
      ],
    },
  },
  'Criminal Defense': {
    plaintiff: {
      favorable: [
        'Trusts law enforcement',
        'Believes in strict justice',
        'Has been a victim of crime or knows a victim',
        'Respects authority and institutions',
        'Favors community safety over individual rights',
      ],
      risk: [
        'Distrusts police or prosecutors',
        'Believes system is biased against defendants',
        'Has had negative experiences with law enforcement',
        'Strong civil liberties advocate',
        'Knows someone who was wrongly accused',
      ],
    },
    defense: {
      favorable: [
        'Skeptical of government authority',
        'Believes strongly in presumption of innocence',
        'Independent thinker, questions narratives',
        'Values civil liberties and individual rights',
        'Has had negative experience with law enforcement',
      ],
      risk: [
        'Law-and-order oriented',
        'Victim of crime or close to a victim',
        'Works in law enforcement or military',
        'Trusts prosecutors and authority figures',
        'Believes accused are usually guilty',
      ],
    },
  },
  'Medical Malpractice': {
    plaintiff: {
      favorable: [
        'Skeptical of medical establishment',
        'Has had a bad medical experience',
        'Empathetic toward patients',
        'Open to holding doctors accountable',
        'Believes medical errors should be compensated',
      ],
      risk: [
        'Works in healthcare or has close family in healthcare',
        'Believes doctors do their best under difficult conditions',
        'Skeptical of large damage awards',
        'Thinks malpractice suits raise healthcare costs',
        'Highly deferential to medical professionals',
      ],
    },
    defense: {
      favorable: [
        'Works in or respects medical profession',
        'Understands medicine involves inherent risk',
        'Skeptical of large damage awards',
        'Analytical and evidence-focused',
        'Believes malpractice suits are often frivolous',
      ],
      risk: [
        'Has experienced medical negligence firsthand',
        'Distrusts doctors or hospitals',
        'Highly empathetic toward patients',
        'Anti-corporate or anti-institutional bias',
        'Lost a loved one due to medical error',
      ],
    },
  },
  'Contract Dispute': {
    plaintiff: {
      favorable: [
        'Values honoring agreements',
        'Has experience with business dealings',
        'Believes in holding parties accountable',
        'Detail-oriented and reads fine print',
        'Sympathetic to smaller party in a dispute',
      ],
      risk: [
        'Skeptical of contract claims',
        'Believes both sides share blame in disputes',
        'Dislikes litigation over business disagreements',
        'Pro-business with large company sympathy',
        'Believes contracts are too complex for juries',
      ],
    },
    defense: {
      favorable: [
        'Business-savvy and understands commercial risk',
        'Skeptical of breach claims',
        'Analytical and focused on contract language',
        'Believes in freedom of contract',
        'Works in business, law, or finance',
      ],
      risk: [
        'Sympathizes with smaller parties',
        'Anti-corporate sentiment',
        'Has felt cheated by a contract',
        'Emotional decision-maker',
        'Suspicious of large organizations',
      ],
    },
  },
  'Employment Law': {
    plaintiff: {
      favorable: [
        'Has experienced workplace mistreatment',
        'Pro-worker and pro-union',
        'Empathetic toward employees',
        'Skeptical of corporate HR departments',
        'Believes employers have significant power imbalance',
      ],
      risk: [
        'Business owner or manager',
        'Believes employees exaggerate complaints',
        'Skeptical of discrimination claims',
        'Pro-employer and values at-will employment',
        'Works in HR or management',
      ],
    },
    defense: {
      favorable: [
        'Business owner, manager, or HR professional',
        'Understands workplace management challenges',
        'Skeptical of employee complaints',
        'Values at-will employment doctrine',
        'Believes in following proper procedures',
      ],
      risk: [
        'Has been fired or laid off unfairly',
        'Pro-worker, pro-union background',
        'Has filed a workplace complaint or lawsuit',
        'Distrusts corporate employers',
        'Strong empathy for employees',
      ],
    },
  },
  'Family Law': {
    plaintiff: {
      favorable: [
        'Values stability for children',
        'Sympathetic to primary caregivers',
        'Believes in equitable asset division',
        'Has been through a similar family situation',
        'Empathetic and emotionally attuned',
      ],
      risk: [
        'Strong bias toward one parent gender',
        'Believes divorce is always avoidable',
        'Judgmental about family decisions',
        'Lacks empathy for emotional situations',
        'Very traditional family values',
      ],
    },
    defense: {
      favorable: [
        'Values fairness and both parents having involvement',
        'Analytical approach to family disputes',
        'Believes in examining both sides',
        'Skeptical of emotional manipulation in custody',
        'Understands complexity of family situations',
      ],
      risk: [
        'Strong sympathy toward one parent type',
        'Has had a bitter divorce or custody battle',
        'Emotional decision-maker in family matters',
        'Pre-formed opinions about custody',
        'Distrusts the other gender in family disputes',
      ],
    },
  },
  'Civil Rights': {
    plaintiff: {
      favorable: [
        'Believes in systemic accountability',
        'Has experienced discrimination',
        'Strong advocate for civil rights and equality',
        'Distrusts institutions that resist reform',
        'Open to significant damages for rights violations',
      ],
      risk: [
        'Skeptical of discrimination claims',
        'Works in law enforcement or government',
        'Believes system works fairly for everyone',
        'Strong authority-respecting disposition',
        'Views civil rights suits as politically motivated',
      ],
    },
    defense: {
      favorable: [
        'Respects institutions and authority',
        'Believes system generally works fairly',
        'Skeptical of large damage awards',
        'Analytical and evidence-focused',
        'Works in government, law enforcement, or administration',
      ],
      risk: [
        'Has experienced discrimination personally',
        'Distrusts government institutions',
        'Strong civil rights advocate',
        'Highly empathetic toward marginalized groups',
        'Active in social justice causes',
      ],
    },
  },
};

function mapCaseTypeToAreaOfLaw(caseType: string): string {
  const lc = caseType.toLowerCase();
  if (lc.includes('criminal') || lc.includes('felony') || lc.includes('misdemeanor')) return 'Criminal Defense';
  if (lc.includes('personal injury') || lc.includes('tort')) return 'Personal Injury';
  if (lc.includes('family') || lc.includes('divorce') || lc.includes('custody')) return 'Family Law';
  if (lc.includes('medical') || lc.includes('malpractice')) return 'Medical Malpractice';
  if (lc.includes('employment') || lc.includes('labor')) return 'Employment Law';
  if (lc.includes('civil rights')) return 'Civil Rights';
  if (lc.includes('contract')) return 'Contract Dispute';
  return caseType || 'Other';
}

function buildCaseSummary(detail: api.MattrMindrCaseDetail): string {
  const parts: string[] = [];

  if (detail.defendantName) {
    parts.push(`Defendant: ${detail.defendantName}`);
  }

  if (detail.charges && detail.charges.length > 0) {
    const chargeDesc = detail.charges
      .map(c => {
        let s = c.description;
        if (c.severity) s += ` (${c.severity})`;
        if (c.statute) s += ` [${c.statute}]`;
        return s;
      })
      .join('; ');
    parts.push(`Charges: ${chargeDesc}`);
  }

  if (detail.trialDate) parts.push(`Trial Date: ${detail.trialDate}`);

  const coDefendants = detail.parties?.filter(p => {
    const pt = p.partyType?.toLowerCase() || '';
    return pt.includes('co-defendant') || pt.includes('codefendant');
  });
  const witnesses = detail.parties?.filter(p => p.partyType?.toLowerCase().includes('witness'));
  const experts = detail.parties?.filter(p => p.partyType?.toLowerCase().includes('expert'));

  if (coDefendants && coDefendants.length > 0) {
    parts.push(`Co-Defendants: ${coDefendants.map(d => d.name).join(', ')}`);
  }
  if (witnesses && witnesses.length > 0) {
    parts.push(`Witnesses: ${witnesses.map(w => w.name).join(', ')}`);
  }
  if (experts && experts.length > 0) {
    parts.push(`Experts: ${experts.map(e => e.name).join(', ')}`);
  }

  const relevantNotes = detail.notes?.filter(n =>
    ['case', 'trial', 'voir dire', 'jury'].some(k => n.category?.toLowerCase().includes(k))
  );
  if (relevantNotes && relevantNotes.length > 0) {
    parts.push(`Notes: ${relevantNotes.map(n => n.content).slice(0, 3).join(' | ')}`);
  }

  return parts.join('\n');
}

export function CaseSetup({
  onCaseSetup,
  onProceed,
  existingInfo,
  isMattrMindrConnected,
}: CaseSetupProps) {
  const [name, setName] = useState(existingInfo?.name || '');
  const [areaOfLaw, setAreaOfLaw] = useState(existingInfo?.areaOfLaw || '');
  const [summary, setSummary] = useState(existingInfo?.summary || '');
  const [side, setSide] = useState<'plaintiff' | 'defense' | null>(existingInfo?.side || null);
  const [isInitialized, setIsInitialized] = useState(!!existingInfo);
  const [selectedMattrMindrId, setSelectedMattrMindrId] = useState<string | null>(null);
  const [objectiveSource, setObjectiveSource] = useState<'preset' | 'custom'>('preset');
  const [favorableTraits, setFavorableTraits] = useState<string[]>(existingInfo?.favorableTraits || []);
  const [riskTraits, setRiskTraits] = useState<string[]>(existingInfo?.riskTraits || []);
  const [newFavorableTrait, setNewFavorableTrait] = useState('');
  const [newRiskTrait, setNewRiskTrait] = useState('');
  const [customObjectivesText, setCustomObjectivesText] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            const text = await api.transcribeAudio(audioBlob);
            setSummary(prev => prev ? `${prev} ${text}` : text);
          } catch (err: any) {
            setVoiceError(err.message || 'Voice transcription failed. Please try again or type your summary.');
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setVoiceError('Microphone access denied. Please allow microphone permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const [showMmPicker, setShowMmPicker] = useState(false);
  const [mmCases, setMmCases] = useState<api.MattrMindrCaseListItem[]>([]);
  const [mmLoading, setMmLoading] = useState(false);
  const [mmError, setMmError] = useState('');
  const [mmSearch, setMmSearch] = useState('');
  const mmSearchRef = useRef<HTMLInputElement>(null);

  const filteredMmCases = useMemo(() => {
    if (!mmSearch.trim()) return mmCases;
    const q = mmSearch.toLowerCase();
    return mmCases.filter(c =>
      (c.defendantName || '').toLowerCase().includes(q) ||
      (c.caseNum || '').toLowerCase().includes(q)
    );
  }, [mmCases, mmSearch]);

  useEffect(() => {
    if (showMmPicker && !mmLoading && mmCases.length > 0) {
      setTimeout(() => mmSearchRef.current?.focus(), 100);
    }
  }, [showMmPicker, mmLoading, mmCases.length]);

  const loadPresetProfile = (caseType: string, selectedSide: 'plaintiff' | 'defense') => {
    const profile = TARGET_JUROR_PROFILES[caseType]?.[selectedSide];
    if (profile) {
      setFavorableTraits([...profile.favorable]);
      setRiskTraits([...profile.risk]);
      setObjectiveSource('preset');
    }
  };

  const parseCustomObjectives = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const favorable: string[] = [];
    const risk: string[] = [];
    let section: 'favorable' | 'risk' | null = null;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('favorable') || lower.includes('ideal') || lower.includes('want') || lower.includes('target')) {
        section = 'favorable';
        continue;
      }
      if (lower.includes('risk') || lower.includes('avoid') || lower.includes('unfavorable') || lower.includes('concern')) {
        section = 'risk';
        continue;
      }
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (!cleaned) continue;
      if (section === 'risk') risk.push(cleaned);
      else favorable.push(cleaned);
    }
    if (favorable.length > 0) setFavorableTraits(favorable);
    if (risk.length > 0) setRiskTraits(risk);
  };

  const handleInitialize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !areaOfLaw || !summary || !side) return;

    let finalFavorable = favorableTraits;
    let finalRisk = riskTraits;

    if (finalFavorable.length === 0 && finalRisk.length === 0) {
      const profile = TARGET_JUROR_PROFILES[areaOfLaw]?.[side];
      if (profile) {
        finalFavorable = profile.favorable;
        finalRisk = profile.risk;
      } else {
        finalFavorable = side === 'plaintiff'
          ? ['Empathetic', 'Believes in accountability', 'Open to damages']
          : ['Skeptical of claims', 'Values personal responsibility', 'Detail-oriented'];
        finalRisk = side === 'plaintiff'
          ? ['Skeptical of claims', 'Pro-defendant bias', 'Resistant to emotional arguments']
          : ['Anti-corporate bias', 'Highly emotional', 'Prior negative experience'];
      }
    }

    onCaseSetup(
      { name, areaOfLaw, summary, side, favorableTraits: finalFavorable, riskTraits: finalRisk },
      selectedMattrMindrId || undefined
    );
    setIsInitialized(true);
  };

  const handleLoadFromMattrMindr = async () => {
    setMmError('');
    setMmLoading(true);
    setShowMmPicker(true);
    setMmSearch('');
    try {
      const cases = await api.fetchMattrMindrCases();
      setMmCases(cases);
    } catch (err: any) {
      setMmError(err.message || 'Failed to load cases');
    } finally {
      setMmLoading(false);
    }
  };

  const handleSelectMmCase = async (mmCase: api.MattrMindrCaseListItem) => {
    setMmLoading(true);
    setMmError('');
    try {
      const detail = await api.fetchMattrMindrCase(mmCase.id);
      setName(detail.title || `${detail.caseNum} - ${detail.defendantName}`);
      setAreaOfLaw(mapCaseTypeToAreaOfLaw(detail.caseType));
      setSummary(buildCaseSummary(detail));
      setSide('defense');
      setSelectedMattrMindrId(detail.id);
      setShowMmPicker(false);
    } catch (err: any) {
      setMmError(err.message || 'Failed to load case details');
    } finally {
      setMmLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Phase 1: Case Initialization</h2>
        <p className="text-slate-600 mt-1">
          Define the parameters of your case to calibrate the analysis engine.
        </p>
      </div>

      {!isInitialized ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleInitialize}
          className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm"
        >
          {isMattrMindrConnected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">MattrMindr Connected</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadFromMattrMindr}
                  disabled={mmLoading}
                  data-testid="button-load-mattrmindr"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  {mmLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Load from MattrMindr
                </button>
              </div>

              <AnimatePresence>
                {showMmPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden overflow-x-hidden mt-3"
                  >
                    {mmError && (
                      <div className="text-sm text-rose-600 mb-2">{mmError}</div>
                    )}
                    {mmLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-blue-700">Loading cases...</span>
                      </div>
                    ) : mmCases.length === 0 ? (
                      <div className="text-sm text-slate-500 py-2">No trial center cases found.</div>
                    ) : (
                      <div>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            ref={mmSearchRef}
                            type="text"
                            value={mmSearch}
                            onChange={e => setMmSearch(e.target.value)}
                            placeholder="Search by defendant name or case number..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-blue-200 bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                            data-testid="input-mm-search"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto overflow-x-hidden bg-white rounded-lg border border-blue-200">
                          {filteredMmCases.length === 0 ? (
                            <div className="text-sm text-slate-500 py-3 px-3">No matching cases found.</div>
                          ) : (
                            filteredMmCases.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectMmCase(c)}
                                data-testid={`button-mm-case-${c.id}`}
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                              >
                                <div className="flex items-baseline justify-between gap-2 min-w-0">
                                  <span className="font-semibold text-sm text-slate-900 truncate">
                                    {c.defendantName || c.title}
                                  </span>
                                  <span className="text-xs text-slate-500 flex-shrink-0">{c.caseNum}</span>
                                </div>
                                {c.trialDate && (
                                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                                    Trial: {c.trialDate}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedMattrMindrId && (
                <div className="mt-2 text-xs text-blue-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Case loaded from MattrMindr
                </div>
              )}
            </div>
          )}

          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-2">
              <FileText className="w-4 h-4 mr-2 text-slate-500" />
              Case Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith v. Jones Corporation"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors"
              data-testid="input-case-name"
              required
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-2">
              <Briefcase className="w-4 h-4 mr-2 text-slate-500" />
              Area of Law
            </label>
            <input
              type="text"
              list="areas-of-law-options"
              value={areaOfLaw}
              onChange={(e) => setAreaOfLaw(e.target.value)}
              placeholder="Enter or select Area of Law..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors"
              data-testid="input-area-of-law"
              required
            />
            <datalist id="areas-of-law-options">
              {AREAS_OF_LAW.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-semibold text-slate-900 mb-2">
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                Case Summary
              </span>
              <span className="flex items-center gap-2">
                {isTranscribing && (
                  <span className="flex items-center text-xs text-violet-600 font-normal">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Transcribing...
                  </span>
                )}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    data-testid="button-stop-recording"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-lg hover:bg-rose-200 transition-colors animate-pulse"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Stop Recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isTranscribing}
                    data-testid="button-voice-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 hover:text-slate-800 transition-colors disabled:opacity-50"
                    title="Dictate case summary using voice"
                  >
                    <Mic className="w-3 h-3" />
                    Voice Input
                  </button>
                )}
              </span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide a brief summary of the facts, or use voice input..."
              rows={4}
              className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors resize-none ${
                isRecording ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
              data-testid="input-summary"
              required
            />
            {voiceError && (
              <p className="mt-2 text-xs text-rose-600 flex items-center gap-1" data-testid="text-voice-error">
                <MicOff className="w-3 h-3" />
                {voiceError}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center text-sm font-semibold text-slate-900 mb-3">
              <Scale className="w-4 h-4 mr-2 text-slate-500" />
              Which side do you represent?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSide('plaintiff')}
                data-testid="button-side-plaintiff"
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  side === 'plaintiff'
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-900 text-lg">
                  {/criminal|felony|misdemeanor/i.test(areaOfLaw) ? 'Prosecution' : 'Plaintiff'}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {/criminal|felony|misdemeanor/i.test(areaOfLaw) ? 'Prosecuting the charges' : 'Bringing the claims'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSide('defense')}
                data-testid="button-side-defense"
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  side === 'defense'
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-900 text-lg">Defense</div>
                <div className="text-sm text-slate-500 mt-1">Defending against charges or claims</div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={!areaOfLaw || !summary || !side}
              data-testid="button-initialize-case"
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Initialize Case
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mr-3" />
              <h3 className="text-xl font-bold text-emerald-900">Case Initialized Successfully</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">
                  Case Details
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-emerald-200/50 pb-2">
                    <dt className="text-emerald-700">Area of Law</dt>
                    <dd className="font-medium text-emerald-900">{existingInfo?.areaOfLaw}</dd>
                  </div>
                  <div className="flex justify-between border-b border-emerald-200/50 pb-2">
                    <dt className="text-emerald-700">Side</dt>
                    <dd className="font-medium text-emerald-900 capitalize">{existingInfo?.side}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">
                  Analysis Parameters
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-emerald-700 mb-1">Target Favorable Traits</div>
                    <div className="flex flex-wrap gap-2">
                      {existingInfo?.favorableTraits.map((trait, i) => (
                        <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-rose-700 mb-1">Target Risk Traits</div>
                    <div className="flex flex-wrap gap-2">
                      {existingInfo?.riskTraits.map((trait, i) => (
                        <span key={i} className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setIsInitialized(false)}
              data-testid="button-edit-case"
              className="text-slate-500 hover:text-slate-700 font-medium text-sm"
            >
              Edit Case Details
            </button>
            <button
              onClick={onProceed}
              data-testid="button-proceed-strike-list"
              className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm"
            >
              Proceed to Strike List
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
