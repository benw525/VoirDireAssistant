import React, { useCallback, useEffect, useState } from 'react';
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
const STORAGE_KEY = 'voir-dire-saved-cases';
const loadSavedCases = (): SavedCase[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const persistCases = (cases: SavedCase[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
};
// --- MOCK DATA GENERATORS ---
const generateSampleJurors = (): Juror[] => {
  const names = [
  'James Smith',
  'Maria Garcia',
  'Robert Johnson',
  'Linda Davis',
  'William Miller',
  'Elizabeth Wilson',
  'David Moore',
  'Jennifer Taylor',
  'Richard Anderson',
  'Susan Thomas'];

  const occupations = [
  'Teacher',
  'Software Engineer',
  'Retired',
  'Nurse',
  'Construction Manager',
  'Accountant',
  'Retail Manager',
  'Mechanic',
  'Bank Teller',
  'Sales Rep'];

  return names.map((name, i) => ({
    number: i + 1,
    name,
    address: `${100 + i} Main St`,
    cityStateZip: 'Mobile, AL 36602',
    sex: i % 2 === 0 ? 'M' : 'F',
    race: ['W', 'B', 'H', 'A', 'O'][i % 5],
    birthDate: `19${60 + i * 3}-0${i % 9 + 1}-15`,
    occupation: occupations[i],
    employer: 'Various',
    responses: [],
    lean: 'unknown',
    riskTier: 'unassessed',
    notes: ''
  }));
};
const generateSampleQuestions = (): VoirDireQuestion[] => {
  const qTexts = [
  'Have you or a close family member ever been involved in a lawsuit?',
  'Do you have any strong feelings about awarding damages for emotional distress?',
  'Have you ever had a negative experience with a large corporation?',
  'Do you believe that if someone is injured, someone else must be at fault?'];

  return qTexts.map((text, i) => ({
    id: i + 1,
    originalText: text,
    rephrase: `(Rephrase) ${text.replace(/\?$/, '')} - how does that apply to you?`,
    followUps: [
    'Can you elaborate on that?',
    'Would that affect your impartiality?'],

    locked: false
  }));
};
export default function VoirDireApp() {
  // State
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(0);
  const [completedPhases, setCompletedPhases] = useState<Set<AppPhase>>(
    new Set<AppPhase>([0])
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Data State
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [questions, setQuestions] = useState<VoirDireQuestion[]>([]);
  const [questionsLocked, setQuestionsLocked] = useState(false);
  const [responses, setResponses] = useState<JurorResponse[]>([]);
  // Saved Cases
  const [savedCases, setSavedCases] = useState<SavedCase[]>(loadSavedCases);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  // Auto-save active case whenever key data changes
  useEffect(() => {
    if (!caseInfo || currentPhase === 0) return;
    const id = activeCaseId || Math.random().toString(36).substr(2, 9);
    if (!activeCaseId) setActiveCaseId(id);
    const updated: SavedCase = {
      id,
      savedAt: Date.now(),
      lastPhase: currentPhase,
      caseInfo,
      jurors,
      questions,
      questionsLocked,
      responses,
      completedPhases: Array.from(completedPhases)
    };
    setSavedCases((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const next = [updated, ...filtered];
      persistCases(next);
      return next;
    });
  }, [
  caseInfo,
  jurors,
  questions,
  questionsLocked,
  responses,
  currentPhase,
  completedPhases]
  );
  // Resume a saved case
  const handleResumeCase = useCallback((saved: SavedCase) => {
    setCaseInfo(saved.caseInfo);
    setJurors(saved.jurors);
    setQuestions(saved.questions);
    setQuestionsLocked(saved.questionsLocked);
    setResponses(saved.responses);
    setCompletedPhases(new Set(saved.completedPhases as AppPhase[]));
    setActiveCaseId(saved.id);
    setCurrentPhase(saved.lastPhase);
  }, []);
  const handleDeleteCase = useCallback((id: string) => {
    setSavedCases((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistCases(next);
      return next;
    });
  }, []);
  // Actions
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
    setCompletedPhases((prev) => {
      const next = new Set(prev);
      next.add(phase);
      return next;
    });
  };
  const proceedToPhase = (nextPhase: AppPhase) => {
    markPhaseComplete(currentPhase);
    setCurrentPhase(nextPhase);
  };
  const handleRecordResponse = (
  response: Omit<JurorResponse, 'id' | 'timestamp'>) =>
  {
    const newResponse: JurorResponse = {
      ...response,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setResponses((prev) => [...prev, newResponse]);
    // Mock auto-analysis logic
    setJurors((prev) =>
    prev.map((j) => {
      if (j.number === response.jurorNumber) {
        // Very basic mock logic: if they answer a lot, risk goes up.
        // If they answer OCQ, lean might shift.
        const jResponses = [
        ...responses.filter((r) => r.jurorNumber === j.number),
        newResponse];

        let newRisk = j.riskTier;
        let newLean = j.lean;
        if (jResponses.length > 2) newRisk = 'high';else
        if (jResponses.length > 0) newRisk = 'medium';
        if (newLean === 'unknown') {
          newLean = Math.random() > 0.5 ? 'favorable' : 'unfavorable'; // Random mock lean
        }
        return {
          ...j,
          riskTier: newRisk,
          lean: newLean
        };
      }
      return j;
    })
    );
  };
  const handleUpdateJuror = (jurorNumber: number, updates: Partial<Juror>) => {
    setJurors((prev) =>
    prev.map((j) =>
    j.number === jurorNumber ?
    {
      ...j,
      ...updates
    } :
    j
    )
    );
  };
  // Render Phase Content
  const renderPhase = () => {
    switch (currentPhase) {
      case 0:
        return (
          <WelcomeScreen
            onNewCase={handleNewCase}
            savedCases={savedCases}
            onResumeCase={handleResumeCase}
            onDeleteCase={handleDeleteCase} />);


      case 1:
        return (
          <CaseSetup
            existingInfo={caseInfo}
            onCaseSetup={(info) => {
              setCaseInfo(info);
              markPhaseComplete(1);
            }}
            onProceed={() => proceedToPhase(2)} />);


      case 2:
        return (
          <StrikeList
            jurors={jurors}
            onJurorsLoaded={(j) => {
              setJurors(j);
              markPhaseComplete(2);
            }}
            onProceed={() => proceedToPhase(3)}
            generateSampleJurors={generateSampleJurors} />);


      case 3:
        return (
          <VoirDireQuestions
            questions={questions}
            onQuestionsProcessed={(q) => {
              setQuestions(q);
              if (q.length > 0) markPhaseComplete(3);
            }}
            locked={questionsLocked}
            onLockQuestions={() => setQuestionsLocked(true)}
            onProceed={() => proceedToPhase(4)}
            generateSampleQuestions={generateSampleQuestions} />);


      case 4:
        return (
          <ResponseRecording
            jurors={jurors}
            questions={questions}
            responses={responses}
            onRecordResponse={handleRecordResponse}
            onProceed={() => proceedToPhase(5)} />);


      case 5:
        return (
          <JurorReview
            jurors={jurors}
            responses={responses}
            questions={questions}
            onUpdateJuror={handleUpdateJuror}
            onProceed={() => proceedToPhase(6)} />);


      case 6:
        return (
          <EndReport
            caseInfo={caseInfo}
            jurors={jurors}
            responses={responses}
            questions={questions} />);


      default:
        return <div>Phase not found</div>;
    }
  };
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        {currentPhase !== 0 &&
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="font-bold">Voir Dire Analyst</div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-1">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        }

        {/* Phase Content with Animation */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                y: -10
              }}
              transition={{
                duration: 0.2
              }}
              className="h-full">

              {renderPhase()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>);

}