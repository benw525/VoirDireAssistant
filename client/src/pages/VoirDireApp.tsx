import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import {
  AppPhase,
  CaseInfo,
  Juror,
  VoirDireQuestion,
  JurorResponse,
  SavedCase,
} from '../types';
import { Sidebar } from '../components/voir-dire/Sidebar';
import { WelcomeScreen } from '../components/voir-dire/WelcomeScreen';
import { CaseSetup } from '../components/voir-dire/CaseSetup';
import { StrikeList } from '../components/voir-dire/StrikeList';
import { VoirDireQuestions } from '../components/voir-dire/VoirDireQuestions';
import { ResponseRecording } from '../components/voir-dire/ResponseRecording';
import { JurorReview } from '../components/voir-dire/JurorReview';
import { EndReport } from '../components/voir-dire/EndReport';
import { SettingsPanel } from '../components/voir-dire/SettingsPanel';
import { HelpCenter } from '../components/voir-dire/HelpCenter';
import { GuidedTour, TourStep } from '../components/voir-dire/GuidedTour';
import { AIAssistantButton } from '../components/AIAssistant/AIAssistantButton';
import { AIAssistantPanel } from '../components/AIAssistant/AIAssistantPanel';
import { useAuth } from '../lib/auth';
import * as api from '../lib/api';

const WELCOME_TOUR_STEPS: TourStep[] = [
  {
    target: 'welcome-features',
    title: 'Welcome to Voir Dire Analyst',
    content: 'This app guides you through the entire jury selection process in 6 phases — from ingesting your strike list to generating final strike recommendations.',
    placement: 'bottom',
  },
  {
    target: 'start-new-case',
    title: 'Start a New Case',
    content: 'Click here to begin a new case. You\'ll set up your case details, upload your juror strike list, and walk through each phase of voir dire.',
    placement: 'top',
  },
];

const CASE_TOUR_STEPS: TourStep[] = [
  {
    target: 'sidebar-phases',
    title: 'Your Workflow Phases',
    content: 'These are the 6 phases of your case. You\'ll move through them in order — each phase unlocks after you complete the previous one. You can always click back to review earlier phases.',
    placement: 'right',
  },
  {
    target: 'sidebar-settings',
    title: 'Settings & Connections',
    content: 'Access your account settings here. You can connect to MattrMindr to import cases and push jury analysis, manage your subscription, and toggle the AI assistant.',
    placement: 'right',
  },
  {
    target: 'sidebar-help',
    title: 'Help Center',
    content: 'Need guidance? The Help Center has detailed tutorials for every phase, FAQs, and a way to contact support. You can also chat with the AI Assistant for real-time help.',
    placement: 'right',
  },
  {
    target: 'ai-assistant',
    title: 'AI Assistant',
    content: 'This is your AI-powered assistant. It\'s context-aware — it knows which phase you\'re in and can help with strategy, legal research, and answering questions about your case. Click it anytime.',
    placement: 'left',
  },
];

const generateSampleJurors = (): Juror[] => {
  const names = [
    'James Smith', 'Maria Garcia', 'Robert Johnson', 'Linda Davis',
    'William Miller', 'Elizabeth Wilson', 'David Moore', 'Jennifer Taylor',
    'Richard Anderson', 'Susan Thomas',
  ];
  const occupations = [
    'Teacher', 'Software Engineer', 'Retired', 'Nurse', 'Construction Manager',
    'Accountant', 'Retail Manager', 'Mechanic', 'Bank Teller', 'Sales Rep',
  ];
  return names.map((name, i) => ({
    number: i + 1, name,
    address: `${100 + i} Main St`, cityStateZip: 'Mobile, AL 36602',
    phone: 'Unknown',
    sex: i % 2 === 0 ? 'M' : 'F', race: ['W', 'B', 'H', 'A', 'O'][i % 5],
    birthDate: `19${60 + i * 3}-0${i % 9 + 1}-15`,
    occupation: occupations[i], employer: 'Various',
    responses: [], lean: 'unknown' as const, riskTier: 'unassessed' as const, notes: '',
    aiSummary: '', aiAnalysis: '',
  }));
};

export default function VoirDireApp() {
  const { user, logout } = useAuth();
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(0);
  const [completedPhases, setCompletedPhases] = useState<Set<AppPhase>>(new Set<AppPhase>([0]));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [questions, setQuestions] = useState<VoirDireQuestion[]>([]);
  const [questionsLocked, setQuestionsLocked] = useState(false);
  const [responses, setResponses] = useState<JurorResponse[]>([]);
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mattrmindrCaseId, setMattrmindrCaseId] = useState<string | null>(null);
  const [isMattrMindrConnected, setIsMattrMindrConnected] = useState(false);
  const [savedStrikesForCause, setSavedStrikesForCause] = useState<any[]>([]);
  const [savedBatsonAnalysis, setSavedBatsonAnalysis] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [aiHidden, setAiHidden] = useState(() => sessionStorage.getItem('voir_dire_ai_hidden') === 'true');
  const [billingStatus, setBillingStatus] = useState<api.BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);

  const refreshBilling = useCallback(async () => {
    try {
      const status = await api.getBillingStatus();
      setBillingStatus(status);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      api.fetchCases().then(cases => setSavedCases(cases)).catch(() => {}),
      api.getMattrMindrStatus().then(s => setIsMattrMindrConnected(s.connected)).catch(() => {}),
      refreshBilling(),
    ]).finally(() => setIsLoading(false));
  }, []);

  const persistToServer = useCallback(async () => {
    if (!caseInfo || currentPhase === 0 || !activeCaseId) return;
    try {
      await api.updateCase(activeCaseId, {
        name: caseInfo.name,
        areaOfLaw: caseInfo.areaOfLaw,
        summary: caseInfo.summary,
        side: caseInfo.side,
        favorableTraits: caseInfo.favorableTraits,
        riskTraits: caseInfo.riskTraits,
        lastPhase: currentPhase,
        completedPhases: Array.from(completedPhases),
        questionsLocked,
      });
      const cases = await api.fetchCases();
      setSavedCases(cases);
    } catch (err) {
      console.error('Failed to save case:', err);
    }
  }, [caseInfo, currentPhase, completedPhases, questionsLocked, activeCaseId]);

  useEffect(() => {
    if (!caseInfo || currentPhase === 0 || !activeCaseId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistToServer();
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [caseInfo, currentPhase, completedPhases, questionsLocked, persistToServer]);

  const handleResumeCase = useCallback(async (saved: SavedCase) => {
    try {
      const fullCase = await api.fetchFullCase(saved.id);
      setCaseInfo(fullCase.caseInfo);
      setJurors(fullCase.jurors);
      setQuestions(fullCase.questions);
      setQuestionsLocked(fullCase.questionsLocked);
      setResponses(fullCase.responses);
      setCompletedPhases(new Set(fullCase.completedPhases as AppPhase[]));
      setActiveCaseId(fullCase.id);
      setCurrentPhase(fullCase.lastPhase);
      setMattrmindrCaseId(saved.mattrmindrCaseId || null);
      setSavedStrikesForCause(fullCase.strikesForCause || []);
      setSavedBatsonAnalysis(fullCase.batsonAnalysis || null);
    } catch (err) {
      console.error('Failed to load case:', err);
    }
  }, []);

  const handleDeleteCase = useCallback(async (id: string) => {
    try {
      await api.deleteCase(id);
      setSavedCases(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  }, []);

  const handleNewCase = () => {
    if (billingStatus && !billingStatus.canCreateCase) {
      setBillingError(billingStatus.upgradeReason || 'You have reached your case limit. Open Settings to upgrade.');
      return;
    }
    setBillingError(null);
    setCaseInfo(null);
    setJurors([]);
    setQuestions([]);
    setQuestionsLocked(false);
    setResponses([]);
    setCompletedPhases(new Set<AppPhase>([0]));
    setActiveCaseId(null);
    setMattrmindrCaseId(null);
    setCurrentPhase(1);
  };

  const markPhaseComplete = (phase: AppPhase) => {
    setCompletedPhases(prev => {
      const next = new Set(prev);
      next.add(phase);
      return next;
    });
  };

  const proceedToPhase = (nextPhase: AppPhase) => {
    markPhaseComplete(currentPhase);
    setCurrentPhase(nextPhase);
  };

  const handleCaseSetup = async (info: CaseInfo, mmCaseId?: string) => {
    setCaseInfo(info);
    markPhaseComplete(1);
    if (mmCaseId) setMattrmindrCaseId(mmCaseId);
    try {
      if (!activeCaseId) {
        const id = await api.createCase(info, 1, [0, 1]);
        setActiveCaseId(id);
        if (mmCaseId) {
          await api.updateCase(id, { mattrmindrCaseId: mmCaseId });
        }
        const cases = await api.fetchCases();
        setSavedCases(cases);
        refreshBilling();
      } else {
        await api.updateCase(activeCaseId, {
          name: info.name,
          areaOfLaw: info.areaOfLaw,
          summary: info.summary,
          side: info.side,
          favorableTraits: info.favorableTraits,
          riskTraits: info.riskTraits,
          ...(mmCaseId ? { mattrmindrCaseId: mmCaseId } : {}),
        });
      }
    } catch (err: any) {
      console.error('Failed to save case:', err);
      if (err.code === 'CASE_LIMIT_REACHED' || err.status === 403) {
        setBillingError(err.message || 'You have reached your case limit. Open Settings to upgrade.');
        setCurrentPhase(0);
        refreshBilling();
        return;
      }
    }
  };

  const handleJurorsLoaded = async (j: Juror[]) => {
    setJurors(j);
    if (j.length > 0) markPhaseComplete(2);
    if (activeCaseId) {
      try {
        await api.saveJurors(activeCaseId, j);
      } catch (err) {
        console.error('Failed to save jurors:', err);
      }
    }
  };

  const handleQuestionsProcessed = async (q: VoirDireQuestion[]) => {
    setQuestions(q);
    if (q.length > 0) markPhaseComplete(3);
    if (activeCaseId) {
      try {
        await api.saveQuestions(activeCaseId, q);
      } catch (err) {
        console.error('Failed to save questions:', err);
      }
    }
  };

  const handleLockQuestions = async () => {
    setQuestionsLocked(true);
    if (activeCaseId) {
      try {
        await api.updateCase(activeCaseId, { questionsLocked: true });
      } catch (err) {
        console.error('Failed to lock questions:', err);
      }
    }
  };

  const handleUnlockQuestions = async () => {
    setQuestionsLocked(false);
    setQuestions([]);
    if (activeCaseId) {
      try {
        await api.updateCase(activeCaseId, { questionsLocked: false });
        await api.saveQuestions(activeCaseId, []);
      } catch (err) {
        console.error('Failed to unlock questions:', err);
      }
    }
  };

  const handleRecordResponse = async (
    response: Omit<JurorResponse, 'id' | 'timestamp'>
  ) => {
    const newResponse: JurorResponse = {
      ...response,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setResponses(prev => [...prev, newResponse]);

    setJurors(prev =>
      prev.map(j => {
        if (j.number === response.jurorNumber) {
          const jResponses = [
            ...responses.filter(r => r.jurorNumber === j.number),
            newResponse,
          ];
          let newRisk = j.riskTier;
          let newLean = j.lean;
          if (jResponses.length > 2) newRisk = 'high';
          else if (jResponses.length > 0) newRisk = 'medium';
          if (newLean === 'unknown') {
            newLean = Math.random() > 0.5 ? 'favorable' : 'unfavorable';
          }
          const updated = { ...j, riskTier: newRisk, lean: newLean };
          if (activeCaseId) {
            api.updateJurorOnServer(activeCaseId, j.number, { riskTier: newRisk, lean: newLean }).catch(console.error);
          }
          return updated;
        }
        return j;
      })
    );

    if (activeCaseId) {
      try {
        const saved = await api.saveResponse(activeCaseId, newResponse);
        if (saved && saved.id) {
          setResponses(prev => prev.map(r => r.id === newResponse.id ? { ...r, id: saved.id } : r));
        }
      } catch (err) {
        console.error('Failed to save response:', err);
      }
    }
  };

  const handleAddFollowUp = async (responseId: string, followUp: { question: string; answer: string }) => {
    setResponses(prev =>
      prev.map(r =>
        r.id === responseId ? { ...r, followUps: [...(r.followUps || []), followUp] } : r
      )
    );
    try {
      await api.addFollowUp(responseId, followUp);
    } catch (err) {
      console.error('Failed to save follow-up:', err);
    }
  };

  const handleUpdateJuror = async (jurorNumber: number, updates: Partial<Juror>) => {
    setJurors(prev => prev.map(j => (j.number === jurorNumber ? { ...j, ...updates } : j)));
    if (activeCaseId) {
      try {
        await api.updateJurorOnServer(activeCaseId, jurorNumber, updates);
      } catch (err) {
        console.error('Failed to update juror:', err);
      }
    }
  };

  const handleAiHiddenChange = (hidden: boolean) => {
    setAiHidden(hidden);
    sessionStorage.setItem('voir_dire_ai_hidden', String(hidden));
  };

  const startTour = useCallback((steps: TourStep[]) => {
    setTourSteps(steps);
    setTourActive(true);
  }, []);

  const handleTourComplete = useCallback(() => {
    setTourActive(false);
    localStorage.setItem('voir_dire_tour_completed', 'true');
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const tourCompleted = localStorage.getItem('voir_dire_tour_completed');
    if (!tourCompleted && currentPhase === 0 && savedCases.length === 0) {
      const timer = setTimeout(() => startTour(WELCOME_TOUR_STEPS), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentPhase, savedCases.length, startTour]);

  useEffect(() => {
    if (tourActive) return;
    const caseTourDone = localStorage.getItem('voir_dire_case_tour_completed');
    if (!caseTourDone && currentPhase === 1 && caseInfo) {
      const timer = setTimeout(() => {
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(true);
        }
        startTour(CASE_TOUR_STEPS);
        localStorage.setItem('voir_dire_case_tour_completed', 'true');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, caseInfo, tourActive, startTour]);

  const PHASE_LABELS: Record<number, string> = {
    0: 'Welcome',
    1: 'Case Setup',
    2: 'Strike List',
    3: 'Voir Dire Questions',
    4: 'Record Responses',
    5: 'Review & Strategy',
    6: 'Final Report',
  };

  const renderPhase = () => {
    switch (currentPhase) {
      case 0:
        return (
          <WelcomeScreen
            onNewCase={handleNewCase}
            savedCases={savedCases}
            onResumeCase={handleResumeCase}
            onDeleteCase={handleDeleteCase}
            billingError={billingError}
            billingStatus={billingStatus}
            onOpenSettings={() => setShowSettings(true)}
            onStartTour={() => startTour(WELCOME_TOUR_STEPS)}
          />
        );
      case 1:
        return (
          <CaseSetup
            existingInfo={caseInfo}
            onCaseSetup={handleCaseSetup}
            onProceed={() => proceedToPhase(2)}
            isMattrMindrConnected={isMattrMindrConnected}
          />
        );
      case 2:
        return (
          <StrikeList
            jurors={jurors}
            onJurorsLoaded={handleJurorsLoaded}
            onProceed={() => proceedToPhase(3)}
            generateSampleJurors={generateSampleJurors}
          />
        );
      case 3:
        return (
          <VoirDireQuestions
            questions={questions}
            onQuestionsProcessed={handleQuestionsProcessed}
            locked={questionsLocked}
            onLockQuestions={handleLockQuestions}
            onUnlockQuestions={handleUnlockQuestions}
            onProceed={() => proceedToPhase(4)}
            caseInfo={caseInfo || { name: '', areaOfLaw: '', summary: '', side: 'plaintiff', favorableTraits: [], riskTraits: [] }}
            jurors={jurors}
          />
        );
      case 4:
        return (
          <ResponseRecording
            jurors={jurors}
            questions={questions}
            responses={responses}
            onRecordResponse={handleRecordResponse}
            onAddFollowUp={handleAddFollowUp}
            onProceed={() => proceedToPhase(5)}
            caseInfo={caseInfo || { name: '', areaOfLaw: '', summary: '', side: 'plaintiff', favorableTraits: [], riskTraits: [] }}
          />
        );
      case 5:
        return (
          <JurorReview
            jurors={jurors}
            responses={responses}
            questions={questions}
            caseInfo={caseInfo || { name: '', areaOfLaw: '', summary: '', side: 'plaintiff', favorableTraits: [], riskTraits: [] }}
            onUpdateJuror={handleUpdateJuror}
            onProceed={() => proceedToPhase(6)}
          />
        );
      case 6:
        return (
          <EndReport
            caseInfo={caseInfo || { name: '', areaOfLaw: '', summary: '', side: 'plaintiff', favorableTraits: [], riskTraits: [] }}
            jurors={jurors}
            responses={responses}
            questions={questions}
            mattrmindrCaseId={mattrmindrCaseId}
            isMattrMindrConnected={isMattrMindrConnected}
            activeCaseId={activeCaseId}
            onUpdateJuror={handleUpdateJuror}
            savedStrikesForCause={savedStrikesForCause}
            savedBatsonAnalysis={savedBatsonAnalysis}
          />
        );
      default:
        return <div>Phase not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {currentPhase !== 0 && (
        <Sidebar
          currentPhase={currentPhase}
          caseInfo={caseInfo}
          jurorCount={jurors.length}
          completedPhases={completedPhases}
          onPhaseSelect={(p) => {
            setCurrentPhase(p);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          userName={user?.name}
          onLogout={logout}
          onOpenMattrMindr={() => setShowSettings(true)}
          isMattrMindrConnected={isMattrMindrConnected}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelpCenter={() => setShowHelpCenter(true)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {currentPhase !== 0 && (
          <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="font-bold">Voir Dire Analyst</div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-1">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderPhase()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        aiHidden={aiHidden}
        onAiHiddenChange={handleAiHiddenChange}
        onConnectionChange={(connected) => setIsMattrMindrConnected(connected)}
      />

      <AIAssistantButton
        hidden={aiHidden}
        onClick={() => setShowAIPanel(true)}
      />

      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        onOpenAIAssistant={() => setShowAIPanel(true)}
      />

      <AnimatePresence>
        {showAIPanel && (
          <AIAssistantPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            contextLabel={PHASE_LABELS[currentPhase] || ''}
            caseInfo={caseInfo}
            jurors={jurors}
            currentPhase={currentPhase}
          />
        )}
      </AnimatePresence>

      <GuidedTour
        steps={tourSteps}
        isActive={tourActive}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />
    </div>
  );
}
