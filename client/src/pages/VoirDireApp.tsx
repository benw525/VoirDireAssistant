import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import {
  AppPhase,
  CaseInfo,
  Juror,
  VoirDireQuestion,
  JurorResponse,
  SavedCase } from
'../types';
import { Sidebar } from '../components/voir-dire/Sidebar';
import { WelcomeScreen } from '../components/voir-dire/WelcomeScreen';
import { CaseSetup } from '../components/voir-dire/CaseSetup';
import { StrikeList } from '../components/voir-dire/StrikeList';
import { VoirDireQuestions } from '../components/voir-dire/VoirDireQuestions';
import { ResponseRecording } from '../components/voir-dire/ResponseRecording';
import { JurorReview } from '../components/voir-dire/JurorReview';
import { EndReport } from '../components/voir-dire/EndReport';
import * as api from '../lib/api';

const generateSampleJurors = (): Juror[] => {
  const names = [
  'James Smith', 'Maria Garcia', 'Robert Johnson', 'Linda Davis',
  'William Miller', 'Elizabeth Wilson', 'David Moore', 'Jennifer Taylor',
  'Richard Anderson', 'Susan Thomas'];
  const occupations = [
  'Teacher', 'Software Engineer', 'Retired', 'Nurse', 'Construction Manager',
  'Accountant', 'Retail Manager', 'Mechanic', 'Bank Teller', 'Sales Rep'];
  return names.map((name, i) => ({
    number: i + 1, name,
    address: `${100 + i} Main St`, cityStateZip: 'Mobile, AL 36602',
    sex: i % 2 === 0 ? 'M' : 'F', race: ['W', 'B', 'H', 'A', 'O'][i % 5],
    birthDate: `19${60 + i * 3}-0${i % 9 + 1}-15`,
    occupation: occupations[i], employer: 'Various',
    responses: [], lean: 'unknown' as const, riskTier: 'unassessed' as const, notes: ''
  }));
};

const generateSampleQuestions = (): VoirDireQuestion[] => {
  const qTexts = [
  'Have you or a close family member ever been involved in a lawsuit?',
  'Do you have any strong feelings about awarding damages for emotional distress?',
  'Have you ever had a negative experience with a large corporation?',
  'Do you believe that if someone is injured, someone else must be at fault?'];
  return qTexts.map((text, i) => ({
    id: i + 1, originalText: text,
    rephrase: `(Rephrase) ${text.replace(/\?$/, '')} - how does that apply to you?`,
    followUps: ['Can you elaborate on that?', 'Would that affect your impartiality?'],
    locked: false
  }));
};

export default function VoirDireApp() {
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

  useEffect(() => {
    api.fetchCases().then(cases => {
      setSavedCases(cases);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
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
    setCaseInfo(null);
    setJurors([]);
    setQuestions([]);
    setQuestionsLocked(false);
    setResponses([]);
    setCompletedPhases(new Set<AppPhase>([0]));
    setActiveCaseId(null);
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

  const handleCaseSetup = async (info: CaseInfo) => {
    setCaseInfo(info);
    markPhaseComplete(1);
    try {
      if (!activeCaseId) {
        const id = await api.createCase(info, 1, [0, 1]);
        setActiveCaseId(id);
        const cases = await api.fetchCases();
        setSavedCases(cases);
      } else {
        await api.updateCase(activeCaseId, {
          name: info.name,
          areaOfLaw: info.areaOfLaw,
          summary: info.summary,
          side: info.side,
          favorableTraits: info.favorableTraits,
          riskTraits: info.riskTraits,
        });
      }
    } catch (err) {
      console.error('Failed to save case:', err);
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
      timestamp: Date.now()
    };
    setResponses(prev => [...prev, newResponse]);

    setJurors(prev =>
      prev.map(j => {
        if (j.number === response.jurorNumber) {
          const jResponses = [
            ...responses.filter(r => r.jurorNumber === j.number),
            newResponse
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
        await api.saveResponse(activeCaseId, newResponse);
      } catch (err) {
        console.error('Failed to save response:', err);
      }
    }
  };

  const handleUpdateJuror = async (jurorNumber: number, updates: Partial<Juror>) => {
    setJurors(prev =>
      prev.map(j => j.number === jurorNumber ? { ...j, ...updates } : j)
    );
    if (activeCaseId) {
      try {
        await api.updateJurorOnServer(activeCaseId, jurorNumber, updates);
      } catch (err) {
        console.error('Failed to update juror:', err);
      }
    }
  };

  const renderPhase = () => {
    switch (currentPhase) {
      case 0:
        return (
          <WelcomeScreen
            onNewCase={handleNewCase}
            savedCases={savedCases}
            onResumeCase={handleResumeCase}
            onDeleteCase={handleDeleteCase} />
        );
      case 1:
        return (
          <CaseSetup
            existingInfo={caseInfo}
            onCaseSetup={handleCaseSetup}
            onProceed={() => proceedToPhase(2)} />
        );
      case 2:
        return (
          <StrikeList
            jurors={jurors}
            onJurorsLoaded={handleJurorsLoaded}
            onProceed={() => proceedToPhase(3)}
            generateSampleJurors={generateSampleJurors} />
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
            jurors={jurors} />
        );
      case 4:
        return (
          <ResponseRecording
            jurors={jurors}
            questions={questions}
            responses={responses}
            onRecordResponse={handleRecordResponse}
            onProceed={() => proceedToPhase(5)}
            caseInfo={caseInfo || { name: '', areaOfLaw: '', summary: '', side: 'plaintiff', favorableTraits: [], riskTraits: [] }} />
        );
      case 5:
        return (
          <JurorReview
            jurors={jurors}
            responses={responses}
            questions={questions}
            onUpdateJuror={handleUpdateJuror}
            onProceed={() => proceedToPhase(6)} />
        );
      case 6:
        return (
          <EndReport
            caseInfo={caseInfo}
            jurors={jurors}
            responses={responses}
            questions={questions} />
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
      {currentPhase !== 0 &&
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
        setIsOpen={setIsSidebarOpen} />
      }

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {currentPhase !== 0 &&
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="font-bold">Voir Dire Analyst</div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-1">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        }

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full">
              {renderPhase()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
