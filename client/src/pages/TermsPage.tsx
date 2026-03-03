import { Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" data-testid="link-back-home" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-500 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900" data-testid="text-brand-name">Voir Dire Analyst</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2" data-testid="text-terms-title">Terms of Service</h1>
        <p className="text-slate-500 mb-10" data-testid="text-terms-effective-date">Last updated: January 1, 2025</p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to Voir Dire Analyst ("Service," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the Voir Dire Analyst platform, an AI-powered jury selection assistant designed for legal professionals. By creating an account or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Service Description</h2>
            <p>
              Voir Dire Analyst provides AI-powered tools to assist legal professionals during the jury selection (voir dire) process. Features include strike list parsing, AI-generated voir dire questions, real-time response recording, juror risk analysis, strikes for cause identification, and strategic recommendations. The Service is intended to support, not replace, professional legal judgment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Accounts</h2>
            <p className="mb-2">
              To access the Service, you must create an account by providing your name, email address, and a password. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>Ensuring the information you provide is accurate and up to date</li>
            </ul>
            <p className="mt-2">
              We reserve the right to suspend or terminate accounts that violate these Terms or are used for unauthorized purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Payment and Billing</h2>
            <p className="mb-2">Voir Dire Analyst offers the following pricing plans:</p>
            <ul className="list-disc pl-6 space-y-1 mb-2">
              <li><strong>Monthly Unlimited:</strong> $20.00 per month for unlimited case access, billed monthly, cancel anytime</li>
              <li><strong>Single Case:</strong> $20.00 one-time payment for access to a single case</li>
            </ul>
            <p className="mb-2">
              New users receive one (1) free case upon registration. All payments are processed securely through Stripe. By providing payment information, you authorize us to charge the applicable fees to your selected payment method.
            </p>
            <p>
              Subscription fees are billed in advance on a monthly basis. You may cancel your subscription at any time through your account settings, and cancellation will take effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Refund Policy</h2>
            <p>
              Due to the digital nature of the Service, refunds are generally not provided once a case has been accessed or AI analysis has been generated. If you experience a technical issue that prevents you from using a paid feature, please contact us within 7 days and we will evaluate your request on a case-by-case basis. Unused single-case purchases may be eligible for a refund within 30 days of purchase if no case data has been entered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations</li>
              <li>Share your account credentials with third parties</li>
              <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Use automated tools (bots, scrapers) to access the Service without prior written consent</li>
              <li>Upload malicious code, viruses, or any harmful content</li>
              <li>Use the Service in a manner that could damage, disable, or impair the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Intellectual Property</h2>
            <p className="mb-2">
              All content, features, and functionality of the Service — including but not limited to text, graphics, logos, software, and AI models — are owned by Voir Dire Analyst and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You retain ownership of all case data, juror information, and other content you upload to the Service. By using the Service, you grant us a limited license to process your data solely for the purpose of providing the Service to you. We do not claim ownership of your data and will not use it for any purpose other than delivering the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. AI-GENERATED ANALYSIS AND RECOMMENDATIONS ARE PROVIDED FOR INFORMATIONAL PURPOSES ONLY AND SHOULD NOT BE RELIED UPON AS LEGAL ADVICE. LEGAL PROFESSIONALS SHOULD EXERCISE THEIR OWN INDEPENDENT JUDGMENT IN ALL JURY SELECTION DECISIONS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOIR DIRE ANALYST AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OF OR INABILITY TO USE THE SERVICE; (B) ANY AI-GENERATED ANALYSIS OR RECOMMENDATIONS; (C) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY PERSONAL INFORMATION STORED THEREIN; OR (D) ANY INTERRUPTION OR CESSATION OF TRANSMISSION TO OR FROM THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Termination</h2>
            <p>
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. You may terminate your account at any time by contacting us. Upon termination, we will delete your account data in accordance with our Privacy Policy, unless retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify registered users of material changes via email or through a notice on the Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located within the United States.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-2 font-medium text-slate-900" data-testid="text-contact-email">
              support@voirdireanalyst.com
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Voir Dire Analyst. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" data-testid="link-privacy" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/auth" data-testid="link-sign-in" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
