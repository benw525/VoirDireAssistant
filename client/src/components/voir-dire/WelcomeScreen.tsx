import React, { useState, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  ArrowRight,
  Shield,
  Users,
  BrainCircuit,
  Gavel,
  FolderOpen,
  Clock,
  Trash2,
  ChevronRight,
  Briefcase } from
'lucide-react';
import { SavedCase } from '../../types';
interface WelcomeScreenProps {
  onNewCase: () => void;
  savedCases: SavedCase[];
  onResumeCase: (saved: SavedCase) => void;
  onDeleteCase: (id: string) => void;
}
const PHASE_LABELS: Record<number, string> = {
  1: 'Case Setup',
  2: 'Strike List',
  3: 'Voir Dire Questions',
  4: 'Recording Responses',
  5: 'Review & Strategy',
  6: 'Final Report'
};
export function WelcomeScreen({
  onNewCase,
  savedCases,
  onResumeCase,
  onDeleteCase
}: WelcomeScreenProps) {
  const [showPastCases, setShowPastCases] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return (
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) +
      ' at ' +
      d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      }));

  };
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 max-w-4xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          duration: 0.5
        }}>

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 text-amber-500 mb-6 shadow-xl">
          <Scale className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
          Voir Dire Analyst
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Advanced Jury Selection Assistant. Organize juror data, track
          responses, extract psychological indicators, and get strategic strike
          guidance in real-time.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!showPastCases ?
        <motion.div
          key="home"
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0,
            y: -10
          }}
          className="w-full">

            <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible">

              <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">

                <div className="bg-blue-50 p-3 rounded-lg text-blue-600 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    1. Ingest Strike List
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Instantly parse court-provided juror data into a sortable,
                    searchable database.
                  </p>
                </div>
              </motion.div>

              <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">

                <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    2. Process Questions
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Input your voir dire questions to generate rephrases and
                    strategic follow-ups.
                  </p>
                </div>
              </motion.div>

              <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">

                <div className="bg-amber-50 p-3 rounded-lg text-amber-600 shrink-0">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    3. Record Responses
                  </h3>
                  <p className="text-slate-600 text-sm">
                    High-speed data entry designed for the courtroom. Track
                    every answer instantly.
                  </p>
                </div>
              </motion.div>

              <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">

                <div className="bg-rose-50 p-3 rounded-lg text-rose-600 shrink-0">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    4. Strike Strategy
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Review psychological profiles, favorability scores, and
                    ranked strike recommendations.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.6
            }}>

              <button
              onClick={onNewCase}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-900 bg-amber-500 rounded-full overflow-hidden transition-all hover:bg-amber-400 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">

                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-0.5 transition-transform" />
                <span>START NEW CASE</span>
              </button>

              <button
              onClick={() => setShowPastCases(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-full overflow-hidden transition-all hover:border-slate-900 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">

                <FolderOpen className="w-5 h-5 mr-2" />
                <span>VIEW PAST CASES</span>
                {savedCases.length > 0 &&
              <span className="ml-2 bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {savedCases.length}
                  </span>
              }
              </button>
            </motion.div>
          </motion.div> :

        <motion.div
          key="past-cases"
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
          className="w-full">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <FolderOpen className="w-6 h-6 mr-2 text-slate-500" />
                Past Cases
              </h2>
              <button
              onClick={() => setShowPastCases(false)}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium">

                ← Back
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {savedCases.length === 0 ?
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    No Past Cases
                  </h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Cases you work on will automatically be saved here so you
                    can resume them later.
                  </p>
                </div> :

            savedCases.map((saved, index) =>
            <motion.div
              key={saved.id}
              initial={{
                opacity: 0,
                y: 10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: index * 0.05
              }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                          <Briefcase className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">
                            {saved.caseInfo.name || saved.caseInfo.areaOfLaw}
                          </h3>
                          <p className="text-sm text-slate-500 truncate max-w-md">
                            {saved.caseInfo.summary}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDate(saved.savedAt)}
                            </span>
                            <span className="capitalize font-medium text-amber-600">
                              {saved.caseInfo.side}
                            </span>
                            <span>
                              {saved.jurors.length} Juror
                              {saved.jurors.length !== 1 ? 's' : ''}
                            </span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                              Phase {saved.lastPhase}:{' '}
                              {PHASE_LABELS[saved.lastPhase] || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {confirmDeleteId === saved.id ?
                  <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-rose-700 font-medium">
                              Delete?
                            </span>
                            <button
                      onClick={() => {
                        onDeleteCase(saved.id);
                        setConfirmDeleteId(null);
                        if (savedCases.length <= 1)
                        setShowPastCases(false);
                      }}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 transition-colors">

                              Yes
                            </button>
                            <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1">

                              No
                            </button>
                          </div> :

                  <>
                            <button
                      onClick={() => setConfirmDeleteId(saved.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete case">

                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                      onClick={() => onResumeCase(saved)}
                      className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">

                              Resume
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                          </>
                  }
                      </div>
                    </div>
                  </motion.div>
            )
            }
            </div>

            <div className="text-center">
              <button
              onClick={onNewCase}
              className="group inline-flex items-center justify-center px-6 py-3 text-base font-bold text-slate-900 bg-amber-500 rounded-full transition-all hover:bg-amber-400 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">

                <span className="mr-2">START NEW CASE</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}