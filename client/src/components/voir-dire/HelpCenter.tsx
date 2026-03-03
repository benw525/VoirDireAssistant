import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Users,
  MessageSquare,
  ClipboardList,
  BarChart3,
  FileText,
  BrainCircuit,
  Scale,
  Search,
  BookOpen,
  HelpCircle,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAIAssistant?: () => void;
}

type Tab = 'tutorials' | 'faq' | 'ai' | 'contact';

interface AccordionItem {
  icon: React.ReactNode;
  title: string;
  content: string;
}

const TUTORIALS: AccordionItem[] = [
  {
    icon: <Rocket className="w-5 h-5" />,
    title: 'Getting Started',
    content: `Voir Dire Analyst guides you through a 6-phase workflow for jury selection:

1. **Case Setup** — Enter your case details: name, area of law, case summary, and which side you represent. You can also import cases from MattrMindr if connected.

2. **Strike List** — Upload or paste your juror strike list. The AI will automatically parse juror demographics from PDF, TXT, CSV files, or pasted text. You can also manually add jurors.

3. **Voir Dire Questions** — Generate AI-powered voir dire questions tailored to your case and juror panel, or enter your own questions. Lock them when ready.

4. **Record Responses** — During voir dire, record each juror's responses to your questions and opposing counsel's questions. Add follow-up Q&A as needed.

5. **Review & Strategy** — Assess each juror's lean (favorable/neutral/unfavorable) and risk tier. Get AI-powered analysis for individual jurors.

6. **Final Report** — View the complete analysis, juror recommendations, and strike strategy. Export or push results to MattrMindr.

To start, click "New Case" on the welcome screen. You can save and resume cases at any time.`,
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Strike List Management',
    content: `**Uploading Strike Lists**
Upload your juror strike list as a PDF, TXT, or CSV file, or paste the text directly. The AI will automatically extract juror information including:
- Juror number, name, address
- Sex, race, date of birth
- Occupation and employer

**AI-Powered Parsing**
The AI parser handles various strike list formats. After parsing, review each juror's data and correct any errors. Jurors flagged for review will be highlighted.

**Manual Entry**
You can also add jurors manually using the "Add Juror" button. Fill in available demographic information.

**Editing Jurors**
Click on any juror to edit their information. You can update demographics, add notes, and adjust their lean and risk tier throughout the process.`,
  },
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: 'Voir Dire Questions',
    content: `**AI-Generated Questions**
Click "Generate with AI" to create voir dire questions tailored to your specific case, area of law, and juror panel. The AI considers your favorable and risk traits to craft targeted questions.

**Custom Questions**
Enter your own questions by typing or pasting them into the text area. Click "Refine with AI" to have the AI improve your questions with follow-ups and rephrasing suggestions.

**Question Management**
- Each question shows the original text, an AI-suggested rephrase, and follow-up questions
- Edit any question by clicking on it
- Reorder questions as needed
- Lock questions when you're satisfied — this moves you to the response recording phase

**Unlocking**
You can unlock questions later to make changes, but be aware this may affect previously recorded responses.`,
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Recording Responses',
    content: `**Two-Stage Recording**
Record responses in two stages:
1. **Your Side's Examination** — Record juror answers to your voir dire questions
2. **Opposing Counsel's Examination** — Record notable responses during opposing counsel's questioning

**How to Record**
Select a juror and a question, then type or dictate their response. The response is saved and linked to that juror automatically.

**Follow-Up Questions**
After recording a response, you can add follow-up questions and answers. These provide additional context for the AI analysis.

**Tips**
- Focus on capturing the substance of responses, not word-for-word transcription
- Note body language and demeanor in the response text
- Add follow-ups for any concerning or noteworthy exchanges`,
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Review & Strategy',
    content: `**Juror Assessment**
Review each juror and set their:
- **Lean**: Favorable, Neutral, Unfavorable, or Unknown
- **Risk Tier**: Low, Medium, High, or Unassessed

**AI Analysis**
Click "Analyze" on any juror to get an AI-powered assessment that considers:
- Their demographic profile relative to case factors
- Their recorded responses and follow-ups
- Your favorable and risk trait profiles
- Patterns across their answers

**Batch Analysis**
Use "Analyze All" to get brief AI summaries for every juror at once. This gives you a quick overview of your entire panel.

**Notes**
Add notes to any juror to track impressions, concerns, or strategic considerations.`,
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'Final Report',
    content: `**Report Contents**
The final report includes:
- Case overview and voir dire summary
- Individual juror assessments with recommendations (strike, keep, watch)
- Strike strategy recommendations
- Key observations and risk factors

**MattrMindr Integration**
If connected to MattrMindr and the case was imported from there, you can push the complete jury analysis back to MattrMindr with one click.

**Saving & Resuming**
Your case is automatically saved throughout the process. You can return to the welcome screen and resume any saved case later.`,
  },
];

const FAQ_ITEMS: AccordionItem[] = [
  {
    icon: <FileText className="w-4 h-4" />,
    title: 'What file formats are supported for strike lists?',
    content: 'Voir Dire Analyst supports PDF, TXT, and CSV files for strike list upload. You can also paste text directly into the text area. The AI parser handles a variety of formats and will extract juror demographics automatically.',
  },
  {
    icon: <BrainCircuit className="w-4 h-4" />,
    title: 'How does AI analysis work?',
    content: 'The AI evaluates each juror based on their demographic profile, recorded responses, follow-up answers, and your case-specific favorable and risk trait profiles. It uses this information to assess potential biases, predict juror leanings, and recommend strike strategy.',
  },
  {
    icon: <ClipboardList className="w-4 h-4" />,
    title: 'Can I edit questions after locking them?',
    content: 'Yes, you can unlock your questions at any time to make changes. However, be aware that unlocking will clear your question set, so you may want to back up your current questions first. Previously recorded responses will remain intact.',
  },
  {
    icon: <HelpCircle className="w-4 h-4" />,
    title: 'What is MattrMindr?',
    content: 'MattrMindr is a separate case management platform. If your firm uses MattrMindr, you can connect your account in Settings to import case details (defendant info, charges, parties) directly into Voir Dire Analyst, and push completed jury analysis back to MattrMindr.',
  },
  {
    icon: <Scale className="w-4 h-4" />,
    title: 'Is my data secure?',
    content: 'Yes. All data is stored per-user with JWT authentication. Each user can only access their own cases and data. All communication is encrypted in transit. Your case data and juror information are kept confidential and isolated.',
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: 'Can I work on multiple cases?',
    content: 'Yes! You can create and save multiple cases. From the welcome screen, you can see all your saved cases, resume any case, or start a new one. Each case maintains its own juror data, questions, and responses independently.',
  },
  {
    icon: <BrainCircuit className="w-4 h-4" />,
    title: 'What AI model is used?',
    content: 'Voir Dire Analyst uses OpenAI models via Replit AI Integrations. The AI is used for strike list parsing, voir dire question generation, juror analysis, and the AI Assistant chat. The models are optimized for legal analysis and natural language understanding.',
  },
];

function Accordion({ items, small }: { items: AccordionItem[]; small?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className={`w-full flex items-center justify-between py-4 text-left transition-colors hover:text-slate-900 ${small ? 'text-sm' : 'text-base font-medium'} text-slate-700`}
            data-testid={`help-accordion-${i}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-slate-400 flex-shrink-0">{item.icon}</span>
              <span>{item.title}</span>
            </div>
            {openIndex === i ? (
              <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-4 pl-8 pr-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function ContactForm() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setSubject('');
    setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-amber-600 mb-1.5">Email</label>
        <input
          type="email"
          value={user?.email || ''}
          readOnly
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
          data-testid="input-help-email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-amber-600 mb-1.5">Subject (optional)</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          data-testid="input-help-subject"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-amber-600 mb-1.5">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue or suggestion..."
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
          required
          data-testid="input-help-message"
        />
      </div>

      {sent && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Message sent! We'll get back to you soon.
        </div>
      )}

      <button
        type="submit"
        disabled={!message.trim()}
        className="w-full py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        data-testid="button-help-send"
      >
        <Send className="w-4 h-4" />
        Send to Support
      </button>
    </form>
  );
}

export function HelpCenter({ isOpen, onClose, onOpenAIAssistant }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tutorials');

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tutorials', label: 'Tutorials' },
    { id: 'faq', label: 'FAQ' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'contact', label: 'Contact' },
  ];

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
          <div className="px-6 pt-6 pb-0 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-xl text-slate-900">Help Center</h2>
              <p className="text-sm text-slate-500 mt-1">Guides, answers, and support for Voir Dire Analyst</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              data-testid="button-close-help"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pt-4">
            <div className="flex border-b border-slate-200">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  data-testid={`tab-help-${tab.id}`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="help-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {activeTab === 'tutorials' && (
              <Accordion items={TUTORIALS} />
            )}

            {activeTab === 'faq' && (
              <Accordion items={FAQ_ITEMS} small />
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                  <BrainCircuit className="w-14 h-14 text-amber-500" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-2">AI Assistant</h3>
                <p className="text-sm text-slate-600 mb-6 max-w-[340px]">
                  Your AI-powered legal assistant. The AI Assistant is context-aware and can help with case strategy, explain Voir Dire Analyst features, suggest voir dire questions, and answer questions about your cases.
                </p>

                <button
                  onClick={() => {
                    onClose();
                    onOpenAIAssistant?.();
                  }}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors flex items-center gap-2 mb-8"
                  data-testid="button-help-open-ai"
                >
                  <BrainCircuit className="w-5 h-5" />
                  Open AI Assistant
                </button>

                <h4 className="font-bold text-base text-slate-900 mb-4 self-start">What can the AI Assistant do?</h4>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[
                    { icon: <Scale className="w-6 h-6 text-slate-400" />, title: 'Case Strategy', desc: 'Get strategic advice for jury selection' },
                    { icon: <Users className="w-6 h-6 text-slate-400" />, title: 'Juror Assessment', desc: 'Ask about specific jurors and risk factors' },
                    { icon: <Search className="w-6 h-6 text-slate-400" />, title: 'Legal Research', desc: 'Questions about voir dire law and procedure' },
                    { icon: <BookOpen className="w-6 h-6 text-slate-400" />, title: 'App Guidance', desc: 'Learn how to use Voir Dire Analyst features' },
                  ].map((cap, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 text-left">
                      <div className="mb-2">{cap.icon}</div>
                      <div className="font-semibold text-sm text-slate-900">{cap.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{cap.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="py-2">
                <ContactForm />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
