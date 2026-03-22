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
} from 'lucide-react';
import { CaseInfo } from '../../types';
import * as api from '../../lib/api';

interface CaseSetupProps {
  onCaseSetup: (info: CaseInfo, mattrmindrCaseId?: string) => void;
  onProceed: () => void;
  existingInfo: CaseInfo | null;
  isMattrMindrConnected?: boolean;
}

const AREAS_OF_LAW_GROUPED = [
  {
    category: 'Criminal Law',
    options: [
      'Criminal Defense', 'Criminal Prosecution', 'Capital Murder', 'Homicide', 'Manslaughter',
      'DUI/DWI', 'Drug Offense', 'Drug Trafficking', 'Sex Offense', 'Sexual Assault',
      'White Collar Crime', 'Federal Crime', 'Embezzlement', 'Domestic Violence',
    ],
  },
  {
    category: 'Personal Injury / Tort',
    options: [
      'Personal Injury', 'Negligence', 'Slip and Fall', 'Premises Liability',
      'Medical Malpractice', 'Surgical Error', 'Misdiagnosis',
      'Products Liability', 'Defective Product', 'Wrongful Death',
      'Trucking Accident', 'Auto Accident', 'Motor Vehicle Accident',
      'Nursing Home Abuse', 'Elder Abuse',
      'Toxic Tort', 'Environmental Contamination', 'Mass Tort',
    ],
  },
  {
    category: 'Employment Law',
    options: [
      'Employment Law', 'Employment Discrimination', 'Wrongful Termination',
      'Sexual Harassment', 'Hostile Work Environment', 'Whistleblower', 'Retaliation',
    ],
  },
  {
    category: 'Business / Commercial',
    options: [
      'Contract Dispute', 'Breach of Contract', 'Business Dispute', 'Commercial Litigation',
      'Partnership Dispute', 'Fraud', 'Business Fraud',
      'Trade Secret', 'Non-Compete', 'Construction Dispute', 'Construction Defect',
    ],
  },
  {
    category: 'Intellectual Property',
    options: [
      'Intellectual Property', 'Patent Infringement', 'Patent',
      'Trademark', 'Trademark Infringement', 'Copyright', 'Copyright Infringement',
    ],
  },
  {
    category: 'Civil Rights',
    options: [
      'Civil Rights', 'Section 1983', 'Police Excessive Force', 'Police Brutality',
      'Excessive Force', 'Prisoner Rights', 'Inmate Rights',
    ],
  },
  {
    category: 'Family Law',
    options: [
      'Family Law', 'Divorce', 'Custody', 'Child Custody',
      'Custody Modification', 'Termination of Parental Rights',
    ],
  },
  {
    category: 'Probate / Estate',
    options: [
      'Probate', 'Estate Dispute', 'Will Contest', 'Trust Dispute',
      'Undue Influence', 'Estate Litigation',
    ],
  },
  {
    category: 'Insurance',
    options: [
      'Insurance', 'Insurance Dispute', 'Insurance Coverage',
      'Bad Faith Insurance', 'Insurance Bad Faith',
      'UM/UIM', 'Uninsured Motorist', 'Underinsured Motorist', 'Coverage Dispute',
    ],
  },
  {
    category: 'Other',
    options: ['Other'],
  },
];

const CRIMINAL_AREA_PATTERN = /criminal|felony|misdemeanor|prosecution|capital murder|homicide|manslaughter|dui|dwi|drug offense|drug trafficking|drug possession|sex offense|sexual assault|white collar|federal crime|embezzlement|domestic violence/i;

function mapCaseTypeToAreaOfLaw(caseType: string): string {
  const lc = caseType.toLowerCase();
  if (lc.includes('capital') && (lc.includes('murder') || lc.includes('homicide'))) return 'Capital Murder';
  if (lc.includes('murder') || lc.includes('homicide')) return 'Homicide';
  if (lc.includes('manslaughter')) return 'Manslaughter';
  if (lc.includes('dui') || lc.includes('dwi') || lc.includes('drunk driv')) return 'DUI/DWI';
  if (lc.includes('drug') || lc.includes('narcotic') || lc.includes('controlled substance')) return 'Drug Offense';
  if (lc.includes('sexual assault') || lc.includes('rape') || lc.includes('sex offense')) return 'Sex Offense';
  if (lc.includes('domestic violence') || lc.includes('family violence')) return 'Domestic Violence';
  if (lc.includes('white collar') || lc.includes('embezzl') || lc.includes('money launder')) return 'White Collar Crime';
  if (lc.includes('federal') && (lc.includes('crime') || lc.includes('offense'))) return 'Federal Crime';
  if (lc.includes('criminal') || lc.includes('felony') || lc.includes('misdemeanor')) return 'Criminal Defense';
  if (lc.includes('medical') || lc.includes('malpractice')) return 'Medical Malpractice';
  if (lc.includes('wrongful death')) return 'Wrongful Death';
  if (lc.includes('product') && (lc.includes('liab') || lc.includes('defect'))) return 'Products Liability';
  if (lc.includes('truck')) return 'Trucking Accident';
  if (lc.includes('auto') || lc.includes('car accident') || lc.includes('motor vehicle')) return 'Auto Accident';
  if (lc.includes('nursing home') || lc.includes('elder abuse')) return 'Nursing Home Abuse';
  if (lc.includes('toxic') || lc.includes('environmental') || lc.includes('asbestos')) return 'Toxic Tort';
  if (lc.includes('personal injury') || lc.includes('tort') || lc.includes('negligence')) return 'Personal Injury';
  if (lc.includes('sexual harassment') || lc.includes('hostile work')) return 'Sexual Harassment';
  if (lc.includes('discriminat') || lc.includes('wrongful terminat')) return 'Employment Discrimination';
  if (lc.includes('whistleblow') || lc.includes('retaliat')) return 'Whistleblower';
  if (lc.includes('employment') || lc.includes('labor')) return 'Employment Law';
  if (lc.includes('trade secret') || lc.includes('non-compete')) return 'Trade Secret';
  if (lc.includes('fraud')) return 'Fraud';
  if (lc.includes('construction')) return 'Construction Dispute';
  if (lc.includes('contract') || lc.includes('breach')) return 'Contract Dispute';
  if (lc.includes('patent')) return 'Patent Infringement';
  if (lc.includes('trademark') || lc.includes('copyright')) return 'Trademark';
  if (lc.includes('intellectual property')) return 'Intellectual Property';
  if (lc.includes('excessive force') || lc.includes('police brut')) return 'Police Excessive Force';
  if (lc.includes('prisoner') || lc.includes('inmate')) return 'Prisoner Rights';
  if (lc.includes('civil rights') || lc.includes('section 1983')) return 'Civil Rights';
  if (lc.includes('custody')) return 'Child Custody';
  if (lc.includes('family') || lc.includes('divorce')) return 'Family Law';
  if (lc.includes('probate') || lc.includes('estate') || lc.includes('will contest') || lc.includes('trust')) return 'Probate';
  if (lc.includes('bad faith') && lc.includes('insurance')) return 'Bad Faith Insurance';
  if (lc.includes('insurance')) return 'Insurance';
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

  const [isLoadingTraits, setIsLoadingTraits] = useState(false);

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !areaOfLaw || !summary || !side) return;

    setIsLoadingTraits(true);
    try {
      const traits = await api.fetchAnalysisTraits(areaOfLaw, side);
      onCaseSetup(
        { name, areaOfLaw, summary, side, favorableTraits: traits.favorableTraits, riskTraits: traits.riskTraits },
        selectedMattrMindrId || undefined
      );
      setIsInitialized(true);
    } catch {
      onCaseSetup(
        { name, areaOfLaw, summary, side, favorableTraits: ['Evidence-focused', 'Fair-minded', 'Analytical'], riskTraits: ['Strong bias', 'Cannot be impartial', 'Fixed opinion'] },
        selectedMattrMindrId || undefined
      );
      setIsInitialized(true);
    } finally {
      setIsLoadingTraits(false);
    }
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
            <select
              value={areaOfLaw}
              onChange={(e) => setAreaOfLaw(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 transition-colors"
              data-testid="input-area-of-law"
              required
            >
              <option value="">Select Area of Law...</option>
              {AREAS_OF_LAW_GROUPED.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.options.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
                  {CRIMINAL_AREA_PATTERN.test(areaOfLaw) ? 'Prosecution' : 'Plaintiff'}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {CRIMINAL_AREA_PATTERN.test(areaOfLaw) ? 'Prosecuting the charges' : 'Bringing the claims'}
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
              disabled={!areaOfLaw || !summary || !side || isLoadingTraits}
              data-testid="button-initialize-case"
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingTraits ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                'Initialize Case'
              )}
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
