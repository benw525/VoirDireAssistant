import React from 'react';
import { Link } from 'wouter';
import {
  Scale,
  FileText,
  Brain,
  Mic,
  AlertTriangle,
  Gavel,
  Target,
  ArrowRight,
  ClipboardList,
  Users,
  BarChart3,
  Check,
  ChevronDown,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Strike List Parsing',
    description: 'Upload and parse strike lists automatically. Extract juror information from any format with AI-powered document processing.',
  },
  {
    icon: Brain,
    title: 'AI Question Generation',
    description: 'Generate tailored voir dire questions based on your case specifics, area of law, and strategic objectives.',
  },
  {
    icon: Mic,
    title: 'Real-Time Response Recording',
    description: 'Record and organize juror responses during voir dire in real time. Never miss a critical answer again.',
  },
  {
    icon: AlertTriangle,
    title: 'Juror Risk Analysis',
    description: 'AI-powered risk assessment for each juror based on their responses, demographics, and behavioral patterns.',
  },
  {
    icon: Gavel,
    title: 'Strikes for Cause',
    description: 'Identify and document grounds for cause challenges with AI-suggested legal justifications.',
  },
  {
    icon: Target,
    title: 'Strategic Recommendations',
    description: 'Get data-driven recommendations on peremptory strikes and jury composition strategy.',
  },
];

const steps = [
  { icon: ClipboardList, label: 'Set Up Case', description: 'Enter case details, area of law, and strategic goals.' },
  { icon: Users, label: 'Import Jurors', description: 'Upload your strike list or enter juror information manually.' },
  { icon: Mic, label: 'Record Voir Dire', description: 'Capture juror responses in real time during questioning.' },
  { icon: BarChart3, label: 'Get AI Analysis', description: 'Receive risk assessments, strategy recommendations, and a final report.' },
];

export default function LandingPage() {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-500 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-brand">Voir Dire Analyst</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" data-testid="link-sign-in" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link href="/auth" data-testid="link-get-started" className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(251,191,36,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(251,191,36,0.2) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6" data-testid="badge-tagline">
              <Scale className="w-4 h-4" />
              AI-Powered Jury Selection Assistant for Legal Professionals
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6" data-testid="text-hero-headline">
              Win Your Case Before the{' '}
              <span className="text-amber-400">Trial Begins</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto" data-testid="text-hero-description">
              Voir Dire Analyst uses artificial intelligence to help attorneys analyze juror profiles, generate strategic voir dire questions, and make data-driven jury selection decisions — all in one streamlined platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth" data-testid="button-start-free" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 transition-colors text-base">
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button onClick={scrollToFeatures} data-testid="button-learn-more" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors text-base border border-white/10">
                Learn More
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28" data-testid="section-features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-heading">Everything You Need for Jury Selection</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Powerful AI tools designed specifically for trial attorneys to gain a strategic edge during voir dire.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all group" data-testid={`card-feature-${i}`}>
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white" data-testid="section-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-heading">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">From case setup to final analysis in four simple steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center" data-testid={`card-step-${i}`}>
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-500 flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="w-8 h-8" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{step.label}</h3>
                <p className="text-slate-600 text-sm">{step.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)]">
                    <div className="border-t-2 border-dashed border-slate-300 w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28" data-testid="section-pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-pricing-heading">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Choose the plan that works for your practice. Every new account gets 1 free case to try.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-slate-300 transition-all relative" data-testid="card-pricing-monthly">
              <h3 className="text-xl font-bold mb-1">Monthly Unlimited</h3>
              <p className="text-slate-500 text-sm mb-6">Best for active trial attorneys</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$20</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited cases', 'All AI features', 'Real-time response recording', 'Juror risk analysis', 'Final reports & export', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth" data-testid="button-pricing-monthly" className="block w-full py-3 bg-slate-900 text-white font-semibold rounded-xl text-center hover:bg-slate-800 transition-colors">
                Get Started
              </Link>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-slate-300 transition-all" data-testid="card-pricing-single">
              <h3 className="text-xl font-bold mb-1">Single Case</h3>
              <p className="text-slate-500 text-sm mb-6">Pay as you go</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$20</span>
                <span className="text-slate-500"> one-time</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['1 case', 'All AI features', 'Real-time response recording', 'Juror risk analysis', 'Final reports & export', 'Email support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth" data-testid="button-pricing-single" className="block w-full py-3 bg-white text-slate-900 font-semibold rounded-xl text-center border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                Buy Single Case
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500 mt-8" data-testid="text-pricing-note">
            🎉 Every new account includes 1 free case — no credit card required to start.
          </p>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-amber-500 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <span className="text-white font-bold" data-testid="text-footer-brand">Voir Dire Analyst</span>
              </div>
              <p className="text-sm leading-relaxed">AI-powered jury selection assistant helping trial attorneys make smarter, data-driven decisions during voir dire.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" data-testid="link-footer-terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" data-testid="link-footer-privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@voirdireanalyst.com" data-testid="link-footer-email" className="hover:text-white transition-colors">support@voirdireanalyst.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} Voir Dire Analyst. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}