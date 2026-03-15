# Voir Dire Analyst

## Overview
A full-stack jury selection assistant application with user authentication, AI-powered chat assistant, and optional MattrMindr case management integration. Helps legal professionals organize juror data, track voir dire responses, and develop strategic strike recommendations in real-time.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS, wouter routing, framer-motion animations
- **Backend**: Express.js server with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based authentication with bcrypt password hashing, per-user data isolation
- **AI**: OpenAI for voir dire generation (gpt-5.2), juror analysis (gpt-4o), AI chat assistant (gpt-4o-mini), voice transcription (whisper-1); Google Gemini (gemini-3.1-pro-preview) for strike list OCR/parsing with image support via sharp conversion
- **MattrMindr**: Optional integration to import cases from MattrMindr (filtered to Trial Center only) and push jury analysis back
- **Build**: Vite for frontend, tsx for server

## Routing
- `/` — Public landing page (LandingPage.tsx) — product info, features, pricing, footer with legal links
- `/auth` — Login/registration page (redirects to `/app` if authenticated)
- `/app` — Authenticated dashboard (VoirDireApp.tsx, protected route)
- `/terms` — Terms of Service (public)
- `/privacy` — Privacy Policy (public)

## Key Files
- `shared/schema.ts` — Drizzle database schema (users, cases, jurors, questions, responses, conversations, messages)
- `server/routes.ts` — API routes (all prefixed with `/api`), auth middleware applied
- `server/billing.ts` — Billing logic (canCreateCase, getUserBillingInfo, Stripe checkout/portal stubs)
- `server/storage.ts` — Database storage layer implementing IStorage interface
- `server/db.ts` — Drizzle database instance export (shared by storage and chat modules)
- `server/auth.ts` — JWT authentication middleware, password hashing, token management
- `server/mattrmindr.ts` — MattrMindr external API proxy functions
- `server/replit_integrations/chat/routes.ts` — AI Assistant chat routes (conversations, messages, streaming)
- `server/replit_integrations/chat/storage.ts` — Chat-specific DB operations for conversations/messages
- `server/parseStrikeList.ts` — AI-powered strike list document parser (Gemini vision for images + pdftoppm for PDF-to-image rendering, sharp for compression, size-aware batching under 45MB, tesseract.js OCR fallback). Extracts phone numbers. Preserves original juror numbers from strike list documents; multi-file uploads sorted by juror number (not renumbered).
- `server/generateVoirDire.ts` — AI voir dire strategy agent (full generation + question refinement)
- `server/analyzeJuror.ts` — AI juror risk assessment agent (individual juror analysis)
- `client/src/App.tsx` — Root component with routing (public landing, auth, protected app, legal pages)
- `client/src/pages/LandingPage.tsx` — Public marketing landing page (hero, features, pricing, footer)
- `client/src/pages/AuthPage.tsx` — Login/registration page with links to terms/privacy
- `client/src/pages/TermsPage.tsx` — Terms of Service page
- `client/src/pages/PrivacyPage.tsx` — Privacy Policy page
- `client/src/pages/VoirDireApp.tsx` — Main application component with phase-based workflow
- `client/src/lib/auth.ts` — AuthProvider context, useAuth hook, token management
- `client/src/lib/api.ts` — Frontend API client with auth headers and type conversions
- `client/src/types/index.ts` — Frontend TypeScript types
- `client/src/components/voir-dire/` — UI components for each phase
- `client/src/components/voir-dire/SettingsPanel.tsx` — Settings page (profile, AI toggle, MattrMindr, password, logout)
- `client/src/components/voir-dire/HelpCenter.tsx` — Help Center modal (4 tabs: Tutorials, FAQ, AI Assistant, Contact)
- `client/src/components/voir-dire/GuidedTour.tsx` — Guided tour component with spotlight overlay, auto-positioning tooltip, prev/next/skip navigation, progress dots
- `client/src/components/AIAssistant/AIAssistantButton.tsx` — Floating draggable AI chat button (pointer capture)
- `client/src/components/AIAssistant/AIAssistantPanel.tsx` — AI Assistant chat panel with streaming and context awareness
- `client/src/lib/exportVoirDire.ts` — Voir dire strategy export (PDF via jsPDF, Word via docx, plain text via file-saver)

## Application Phases
0. Welcome Screen (past cases, new case)
1. Case Initialization (name, area of law, summary, side) — optional MattrMindr import
2. Strike List (upload/paste juror data — AI-powered parsing)
3. Voir Dire Questions (enter/generate questions)
4. Response Recording (two sub-stages: your side's examination + opposing counsel's examination)
5. Juror Review (assess leanings and risk tiers)
6. End Report (final analysis, collapsible jury panel, peremptory strike boxes, recommendations, optional push to MattrMindr)

## AI Assistant
- Floating circular button (bottom-right) with BrainCircuit icon in slate-900/amber-500
- Mobile: long-press (500ms) enables drag mode to reposition; uses pointer capture for reliable dragging
- Desktop: right-click context menu with "Move" and "Reset Position"
- Opens a slide-in chat panel with streaming AI responses
- **Context-aware**: Sends current case info (name, area of law, side, summary, traits), juror panel summary (lean/risk breakdown + individual juror details), and current phase to the AI system prompt dynamically with each message
- Server accepts optional `context` field in POST `/api/conversations/:id/messages` and appends it to the system prompt
- Legal assistant system prompt specializing in Alabama jury selection law
- Suggestion chips for common queries
- Can be hidden via Settings toggle (persisted in sessionStorage)

## Help Center
- Pop-up modal accessible from sidebar "Help Center" button (HelpCircle icon)
- 4 tabs with amber underline indicator:
  - **Tutorials**: Accordion sections for each workflow phase (Getting Started, Strike List, Voir Dire Questions, Recording Responses, Review & Strategy, Final Report)
  - **FAQ**: 7 expandable Q&A items covering file formats, AI analysis, question locking, MattrMindr, security, multiple cases, AI model
  - **AI Assistant**: Overview page with BrainCircuit icon, description, "Open AI Assistant" button, and 4 capability cards (Case Strategy, Juror Assessment, Legal Research, App Guidance)
  - **Contact**: Form with pre-filled email, subject, message, and "Send to Support" button (frontend-only, shows success toast)
- Component: `client/src/components/voir-dire/HelpCenter.tsx`

## Peremptory Strikes (Phase 6)
- Two side-by-side strike boxes: one for Plaintiff/Prosecution, one for Defense
- Labels are context-aware: "Prosecution" for criminal cases, "Plaintiff" for civil cases (based on `caseInfo.areaOfLaw`)
- Click a juror in either box to mark them as struck; clicking again removes the strike
- A juror can only be struck by one side at a time (mutual exclusion)
- Struck jurors appear with strikethrough in the jury panel and a "Struck by [side]" label
- The Complete Juror Panel section is collapsible (click the header to toggle)
- The same civil/criminal label logic applies throughout: CaseSetup side selection, ResponseRecording labels, and EndReport

## Strikes for Cause (Phase 6)
- AI-powered analysis of all jurors for potential strikes for cause
- Uses `POST /api/analyze-strikes-for-cause` endpoint with GPT-4o (JSON response format)
- Evaluates: stated biases, relationships to parties, inability to follow law, fixed opinions, prior experiences, hardship claims, prejudgment
- Each juror categorized into three tiers:
  - **Highly Likely** (emerald/green) — Strong articulable grounds; judge would likely grant
  - **Possible** (amber/yellow) — Concerning indicators but may need development or rehabilitation
  - **Unlikely** (slate/gray) — No significant cause basis identified
- Each entry shows: juror number + name, basis tag (short label), AI reasoning (why it was categorized), and for Highly Likely/Possible jurors a full courtroom-ready script the attorney can read verbatim to the judge
- Output fields per juror: `reasoning` (analytical explanation of categorization), `argument` (courtroom script for HL/Possible, brief note for Unlikely), `basis` (short label)
- Categories are collapsible; ordered from Highly Likely → Possible → Unlikely
- Placed in End Report between Peremptory Strikes and Suggested Strike Order sections
- Server function: `analyzeStrikesForCause()` in `server/analyzeJuror.ts`
- Client function: `analyzeStrikesForCause()` in `client/src/lib/api.ts`

## Batson Challenge Check (Phase 6 — End Report)
- AI-powered analysis of peremptory strike patterns for Batson v. Kentucky (1986) violations
- Uses `POST /api/analyze-batson` endpoint with GPT-4o (JSON response format)
- Two-sided analysis:
  - **Defensive** — Evaluates attorney's own strikes for vulnerability to a Batson challenge
  - **Offensive** — Evaluates opposing counsel's strikes for challengeable patterns
- Analysis framework: statistical pattern analysis across race/sex, comparative juror analysis (Miller-El v. Dretke, 2005), evaluation of stated reasons from notes/AI summaries
- Overall risk assessment: Low / Moderate / High
- Defensive entries: jurorNumber, jurorName, protectedClass, riskLevel, statisticalFlag, comparativeConcern, currentJustification, recommendedArticulation, warning (optional)
- Offensive entries: jurorNumber, jurorName, protectedClass, strengthOfChallenge, statisticalPattern, comparativeEvidence, suggestedArgument
- UI: "Batson Check" button (violet themed) in End Report between Peremptory Strikes and Strikes for Cause sections
- Results automatically saved to case (`batsonAnalysis` JSONB column) and pushed to MattrMindr
- DB column: `batson_analysis` on `cases` table (JSONB, nullable)
- Server function: `analyzeBatson()` in `server/analyzeJuror.ts`
- Client function: `analyzeBatson()` in `client/src/lib/api.ts`
- MattrMindr push includes `batsonAnalysis` in jury-analysis payload

## FluxPrompt Juror Enrichment (Automatic, Internal)
- Automatic background enrichment via FluxPrompt API when jurors are saved
- Each juror is sent individually as a CSV row to FluxPrompt flow `a576a6c5-ad7e-4a92-89e0-628a21735432`
- FluxPrompt sends enriched data back via webhook callback
- Enrichment data stored in `juror_enrichments` table with status tracking (pending → dispatched → completed)
- Enriched data automatically fed into AI juror analysis (analyzeJuror) and batch summaries (generateBriefSummary) when available
- No user-facing UI — entirely server-side and invisible to users
- Files: `server/fluxEnrichment.ts` (dispatch + webhook handler), `shared/schema.ts` (juror_enrichments table)
- Webhook endpoint: `POST /api/webhooks/juror-enrichment/:enrichmentId` (public, no JWT)
- Environment: `FLUX_API_KEY` env var required
- Enrichment data cleared when jurors are deleted (save flow = delete + re-create)

## Billing & Subscription
- Plans: Free (1 case), Monthly Unlimited ($20/mo), Per Case ($20 each)
- Free access override list: `FREE_ACCESS_EMAILS` in `server/billing.ts` (currently `benw52592@gmail.com`)
- Billing logic: `server/billing.ts` — `canCreateCase()`, `getUserBillingInfo()`, `createCheckoutSession()`, `createPortalSession()`
- Case creation gated in `POST /api/cases` route (returns 403 with `CASE_LIMIT_REACHED` code)
- Frontend gating: `handleNewCase()` in VoirDireApp checks `billingStatus.canCreateCase` before allowing Phase 1
- WelcomeScreen shows remaining cases count and billing error with "Open Settings to Upgrade" link
- Settings panel has "Subscription & Billing" section with plan cards ($20/mo unlimited, $20 single case)
- Stripe integration: LIVE — real Stripe Checkout, Billing Portal, and webhook handling via `stripe` npm package
- Webhook endpoint: `POST /api/billing/webhook` (no auth, uses raw body + Stripe signature verification)
- Stripe products/prices auto-created on first checkout via lookup keys (`vda_monthly_20`, `vda_per_case_20`)
- DB fields on users: `subscriptionTier` (free/monthly/per_case), `stripeCustomerId`, `stripeSubscriptionId`, `casesUsed`, `casesPurchased`

## Settings Page
- Accessible via gear icon in sidebar footer
- Sections: User Profile, Subscription & Billing, AI Assistant toggle, MattrMindr connection, Change Password, Sign Out
- MattrMindr connection controls moved from standalone modal into Settings

## API Endpoints

### Auth (public)
- `POST /api/auth/register` — Create account (name, email, password)
- `POST /api/auth/login` — Login (email, password) → JWT token
- `GET /api/auth/me` — Get current user info (protected)
- `PATCH /api/auth/change-password` — Change password (protected, requires current password)

### Billing (protected except webhook)
- `GET /api/billing/status` — Get billing info (tier, casesUsed, casesPurchased, casesRemaining, canCreateCase)
- `POST /api/billing/checkout` — Create Stripe Checkout session (body: `{ plan: 'monthly' | 'per_case' }`) → `{ url }`
- `POST /api/billing/portal` — Create Stripe billing portal session → `{ url }`
- `POST /api/billing/webhook` — Stripe webhook endpoint (no auth, raw body, signature verified via `STRIPE_WEBHOOK_SECRET`)

### Cases (protected, user-scoped, billing-gated)
- `GET/POST /api/cases` — List user's cases / create case (POST checks billing limits)
- `GET/PATCH/DELETE /api/cases/:id` — Single case operations (ownership verified)
- `GET /api/cases/:id/full` — Load full case with jurors, questions, responses

### Jurors, Questions, Responses (protected)
- `GET/POST/DELETE /api/cases/:caseId/jurors` — Juror CRUD
- `PATCH /api/jurors/:id` — Update single juror
- `GET/POST/DELETE /api/cases/:caseId/questions` — Question CRUD
- `PATCH /api/questions/:id` — Update single question
- `GET/POST /api/cases/:caseId/responses` — Response operations
- `POST /api/responses/:id/follow-ups` — Append follow-up Q&A

### AI (protected)
- `POST /api/parse-strike-list` — AI document parsing (multipart file or text body)
- `POST /api/generate-voir-dire` — AI full voir dire generation
- `POST /api/refine-questions` — AI question refinement
- `POST /api/analyze-juror` — AI individual juror risk assessment
- `POST /api/analyze-jurors-batch` — AI batch brief summaries for all jurors
- `POST /api/analyze-strikes-for-cause` — AI strike-for-cause analysis for all jurors (returns categorized results with legal arguments)

### AI Assistant Chat (protected)
- `GET /api/conversations` — List user's conversations
- `POST /api/conversations` — Create conversation
- `GET /api/conversations/:id` — Get conversation with messages
- `DELETE /api/conversations/:id` — Delete conversation
- `POST /api/conversations/:id/messages` — Send message and stream AI response (SSE)

### MattrMindr Integration (protected)
- `POST /api/mattrmindr/connect` — Login to MattrMindr, store credentials
- `POST /api/mattrmindr/disconnect` — Clear MattrMindr credentials
- `GET /api/mattrmindr/status` — Check connection status
- `GET /api/mattrmindr/cases` — List MattrMindr cases (filtered to `inTrialCenter: true` only, prioritized by user association, sorted alphabetically by defendant name)
- `GET /api/mattrmindr/cases/:id` — Get MattrMindr case detail
- `POST /api/mattrmindr/cases/:id/jury-analysis` — Push jury analysis to MattrMindr

### MattrMindr Case Import UI
- Search bar with auto-filtering suggestions (filters by defendant name and case number)
- Only shows: defendant/client name, case number, trial date
- Sorted: user-associated cases first, then alphabetically by defendant name
- Mobile: vertical-only scroll (overflow-x-hidden) to prevent horizontal sliding

## Database Tables
- `users` — User accounts (email, passwordHash, name, mattrmindrUrl, mattrmindrToken, subscriptionTier, stripeCustomerId, stripeSubscriptionId, casesUsed, casesPurchased)
- `cases` — Case metadata (name, area of law, summary, side, traits, phase state, userId, mattrmindrCaseId, strikesForCause JSONB)
- `jurors` — Juror demographic data per case (includes `ai_summary` and `ai_analysis` text columns for persisted AI outputs)
- `questions` — Voir dire questions per case
- `responses` — Recorded juror responses per case (includes `follow_ups` JSONB)
- `juror_enrichments` — FluxPrompt enrichment records per juror (caseId, jurorNumber, enrichmentId, status, rawRequest, rawResponse, enrichedData, timestamps)
- `conversations` — AI Assistant chat conversations (userId, title, createdAt)
- `messages` — Chat messages within conversations (conversationId, role, content, createdAt)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provided)
- `JWT_SECRET` — JWT signing secret (falls back to default in dev)
- `OPENAI_API_KEY` — OpenAI API key (user's own key, used directly with OpenAI API)
- `STRIPE_SECRET_KEY` — Stripe secret API key (sk_test_* or sk_live_*)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (whsec_*, optional but recommended for production)
- `FLUXPROMPT_API_KEY` — FluxPrompt API key for automatic juror enrichment (follows FluxPrompt naming convention; falls back to `FLUX_API_KEY` if not set)

## Dependencies
- `react-dropzone` — File drag-and-drop for strike list upload
- `framer-motion` — Page transition animations
- `lucide-react` — Icons
- `drizzle-orm` / `drizzle-zod` — Database ORM and validation
- `openai` — AI client for document parsing and chat
- `multer` — File upload middleware
- `pdf-parse` — PDF text extraction
- `jspdf` — PDF document generation for voir dire strategy export
- `docx` — Word document generation for voir dire strategy export
- `file-saver` — File download utility for exports
- `bcrypt` — Password hashing
- `jsonwebtoken` — JWT token management
