# Voir Dire Analyst

## Overview
A full-stack jury selection assistant application with user authentication, AI-powered chat assistant, and optional MattrMindr case management integration. Helps legal professionals organize juror data, track voir dire responses, and develop strategic strike recommendations in real-time.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS, wouter routing, framer-motion animations
- **Backend**: Express.js server with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based authentication with bcrypt password hashing, per-user data isolation
- **AI**: OpenAI via Replit AI Integrations for strike list parsing, voir dire generation, juror analysis, and AI chat assistant
- **MattrMindr**: Optional integration to import cases from MattrMindr (filtered to Trial Center only) and push jury analysis back
- **Build**: Vite for frontend, tsx for server

## Key Files
- `shared/schema.ts` — Drizzle database schema (users, cases, jurors, questions, responses, conversations, messages)
- `server/routes.ts` — API routes (all prefixed with `/api`), auth middleware applied
- `server/storage.ts` — Database storage layer implementing IStorage interface
- `server/db.ts` — Drizzle database instance export (shared by storage and chat modules)
- `server/auth.ts` — JWT authentication middleware, password hashing, token management
- `server/mattrmindr.ts` — MattrMindr external API proxy functions
- `server/replit_integrations/chat/routes.ts` — AI Assistant chat routes (conversations, messages, streaming)
- `server/replit_integrations/chat/storage.ts` — Chat-specific DB operations for conversations/messages
- `server/parseStrikeList.ts` — AI-powered strike list document parser (OpenAI + pdf-parse)
- `server/generateVoirDire.ts` — AI voir dire strategy agent (full generation + question refinement)
- `server/analyzeJuror.ts` — AI juror risk assessment agent (individual juror analysis)
- `client/src/App.tsx` — Root component with AuthProvider wrapper and protected routing
- `client/src/pages/AuthPage.tsx` — Login/registration page
- `client/src/pages/VoirDireApp.tsx` — Main application component with phase-based workflow
- `client/src/lib/auth.ts` — AuthProvider context, useAuth hook, token management
- `client/src/lib/api.ts` — Frontend API client with auth headers and type conversions
- `client/src/types/index.ts` — Frontend TypeScript types
- `client/src/components/voir-dire/` — UI components for each phase
- `client/src/components/voir-dire/SettingsPanel.tsx` — Settings page (profile, AI toggle, MattrMindr, password, logout)
- `client/src/components/voir-dire/HelpCenter.tsx` — Help Center modal (4 tabs: Tutorials, FAQ, AI Assistant, Contact)
- `client/src/components/AIAssistant/AIAssistantButton.tsx` — Floating draggable AI chat button (pointer capture)
- `client/src/components/AIAssistant/AIAssistantPanel.tsx` — AI Assistant chat panel with streaming and context awareness

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
- Each entry shows: juror number + name, basis tag (short label), and full legal argument written as if addressing the judge
- Categories are collapsible; ordered from Highly Likely → Possible → Unlikely
- Placed in End Report between Peremptory Strikes and Suggested Strike Order sections
- Server function: `analyzeStrikesForCause()` in `server/analyzeJuror.ts`
- Client function: `analyzeStrikesForCause()` in `client/src/lib/api.ts`

## Settings Page
- Accessible via gear icon in sidebar footer
- Sections: User Profile, AI Assistant toggle, MattrMindr connection, Change Password, Sign Out
- MattrMindr connection controls moved from standalone modal into Settings

## API Endpoints

### Auth (public)
- `POST /api/auth/register` — Create account (name, email, password)
- `POST /api/auth/login` — Login (email, password) → JWT token
- `GET /api/auth/me` — Get current user info (protected)
- `PATCH /api/auth/change-password` — Change password (protected, requires current password)

### Cases (protected, user-scoped)
- `GET/POST /api/cases` — List user's cases / create case
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
- `users` — User accounts (email, passwordHash, name, mattrmindrUrl, mattrmindrToken)
- `cases` — Case metadata (name, area of law, summary, side, traits, phase state, userId, mattrmindrCaseId)
- `jurors` — Juror demographic data per case
- `questions` — Voir dire questions per case
- `responses` — Recorded juror responses per case (includes `follow_ups` JSONB)
- `conversations` — AI Assistant chat conversations (userId, title, createdAt)
- `messages` — Chat messages within conversations (conversationId, role, content, createdAt)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provided)
- `JWT_SECRET` — JWT signing secret (falls back to default in dev)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL (via Replit AI Integrations)

## Dependencies
- `react-dropzone` — File drag-and-drop for strike list upload
- `framer-motion` — Page transition animations
- `lucide-react` — Icons
- `drizzle-orm` / `drizzle-zod` — Database ORM and validation
- `openai` — AI client for document parsing and chat
- `multer` — File upload middleware
- `pdf-parse` — PDF text extraction
- `bcrypt` — Password hashing
- `jsonwebtoken` — JWT token management
