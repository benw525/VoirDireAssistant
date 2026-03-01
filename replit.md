# Voir Dire Analyst

## Overview
A full-stack jury selection assistant application. Helps legal professionals organize juror data, track voir dire responses, and develop strategic strike recommendations in real-time.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS, wouter routing, framer-motion animations
- **Backend**: Express.js server with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite for frontend, tsx for server

## Key Files
- `shared/schema.ts` — Drizzle database schema (cases, jurors, questions, responses)
- `server/routes.ts` — API routes (all prefixed with `/api`)
- `server/storage.ts` — Database storage layer implementing IStorage interface
- `client/src/pages/VoirDireApp.tsx` — Main application component with phase-based workflow
- `client/src/lib/api.ts` — Frontend API client with type conversions
- `client/src/types/index.ts` — Frontend TypeScript types
- `client/src/components/voir-dire/` — UI components for each phase

## Application Phases
0. Welcome Screen (past cases, new case)
1. Case Initialization (name, area of law, summary, side)
2. Strike List (upload/paste juror data with drag-and-drop)
3. Voir Dire Questions (enter/generate questions)
4. Response Recording (record juror answers in real-time)
5. Juror Review (assess leanings and risk tiers)
6. End Report (final analysis and recommendations)

## API Endpoints
- `GET/POST /api/cases` — List/create cases
- `GET/PATCH/DELETE /api/cases/:id` — Single case operations
- `GET /api/cases/:id/full` — Load full case with jurors, questions, responses
- `GET/POST/DELETE /api/cases/:caseId/jurors` — Juror CRUD
- `PATCH /api/jurors/:id` — Update single juror
- `GET/POST/DELETE /api/cases/:caseId/questions` — Question CRUD
- `PATCH /api/questions/:id` — Update single question
- `GET/POST /api/cases/:caseId/responses` — Response operations

## Database Tables
- `cases` — Case metadata (name, area of law, summary, side, traits, phase state)
- `jurors` — Juror demographic data per case
- `questions` — Voir dire questions per case
- `responses` — Recorded juror responses per case

## Dependencies
- `react-dropzone` — File drag-and-drop for strike list upload
- `framer-motion` — Page transition animations
- `lucide-react` — Icons
- `drizzle-orm` / `drizzle-zod` — Database ORM and validation
