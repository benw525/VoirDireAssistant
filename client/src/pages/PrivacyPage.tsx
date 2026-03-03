import React from 'react';
import { Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-amber-500">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-slate-900">Voir Dire Analyst</span>
            </div>
          </Link>
          <Link href="/" data-testid="link-back-home">
            <span className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mb-8" data-testid="text-privacy-effective-date">Effective Date: January 1, 2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
              <p className="text-slate-700 leading-relaxed">
                Voir Dire Analyst ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered jury selection assistant platform (the "Service"). By using the Service, you consent to the data practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
              <p className="text-slate-700 leading-relaxed mb-3">We collect the following types of information:</p>
              <h3 className="text-lg font-medium text-slate-800 mb-2">2.1 Account Information</h3>
              <ul className="list-disc pl-6 text-slate-700 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (stored in hashed form)</li>
              </ul>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.2 Payment Information</h3>
              <p className="text-slate-700 leading-relaxed">
                Payment processing is handled by Stripe. We do not store your credit card numbers, bank account details, or other sensitive payment information on our servers. Stripe collects and processes payment data in accordance with their own privacy policy. We receive only a transaction confirmation and basic billing details (such as the last four digits of your card and billing address) from Stripe.
              </p>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.3 Case and Juror Data</h3>
              <p className="text-slate-700 leading-relaxed">
                When you use the Service, you may input case information, juror details, strike lists, voir dire questions and responses, and other case-related data. This information is necessary to provide the core functionality of the Service, including AI-powered juror analysis and strategic recommendations.
              </p>
              <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">2.4 Usage Data</h3>
              <p className="text-slate-700 leading-relaxed">
                We may automatically collect information about how you interact with the Service, including pages visited, features used, timestamps, device type, browser type, and IP address.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <p className="text-slate-700 leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-slate-700 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process your transactions and manage your subscription</li>
                <li>Generate AI-powered juror analysis and recommendations</li>
                <li>Communicate with you about your account, updates, and support</li>
                <li>Monitor usage patterns to improve performance and user experience</li>
                <li>Detect, prevent, and address security issues and fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Data Storage and Security</h2>
              <p className="text-slate-700 leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption in transit (TLS/SSL) and at rest. Your data is stored on secure servers with access controls and monitoring. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Third-Party Services</h2>
              <p className="text-slate-700 leading-relaxed mb-3">We share information with the following third-party service providers:</p>
              <ul className="list-disc pl-6 text-slate-700 space-y-2">
                <li>
                  <strong>Stripe:</strong> We use Stripe for payment processing. When you make a payment, your payment information is transmitted directly to Stripe. Please review <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">Stripe's Privacy Policy</a> for details on how they handle your data.
                </li>
                <li>
                  <strong>OpenAI:</strong> We use OpenAI's API to provide AI-powered analysis features including juror risk assessment, question generation, and strategic recommendations. Case and juror data may be sent to OpenAI for processing. OpenAI processes this data in accordance with their <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">Privacy Policy</a> and API data usage policies. We use the API configuration that does not allow OpenAI to use your data for model training.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-3">
                We do not sell your personal information to third parties. We do not share your data with third parties for their own marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Retention</h2>
              <p className="text-slate-700 leading-relaxed">
                We retain your account information for as long as your account is active or as needed to provide the Service. Case and juror data is retained as long as your account is active. You may request deletion of your data at any time by contacting us. Upon account termination, we will delete or anonymize your data within 90 days, except where we are required to retain it for legal, regulatory, or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
              <p className="text-slate-700 leading-relaxed mb-3">Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 text-slate-700 space-y-1">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> Object to the processing of your data in certain circumstances</li>
                <li><strong>Restriction:</strong> Request restriction of processing of your data</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-3">
                To exercise any of these rights, please contact us at the email address provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Cookies and Tracking</h2>
              <p className="text-slate-700 leading-relaxed">
                We use essential cookies to maintain your session and authentication state. These cookies are necessary for the Service to function and cannot be disabled. We do not use third-party advertising or analytics cookies. Session cookies are automatically deleted when you close your browser or when your session expires.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Children's Privacy</h2>
              <p className="text-slate-700 leading-relaxed">
                The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete such information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Changes to This Privacy Policy</h2>
              <p className="text-slate-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page and updating the "Effective Date" at the top. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed">
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:support@voirdireanalyst.com" className="text-amber-600 hover:text-amber-700 underline" data-testid="link-contact-email">
                  support@voirdireanalyst.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Voir Dire Analyst. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" data-testid="link-terms">
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Terms of Service</span>
            </Link>
            <Link href="/privacy" data-testid="link-privacy">
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Privacy Policy</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
