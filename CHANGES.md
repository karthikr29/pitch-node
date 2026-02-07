# PitchNode - Full Application Build Changelog

## Phase 0: Project Setup

### 0A. ShadCN Initialization
- Ran `npx shadcn@latest init` with New York style, Tailwind v4
- Configured CSS variables to use AWS-inspired theme (orange primary, navy dark BG)
- Installed 16 base ShadCN components: button, card, badge, avatar, skeleton, tabs, select, input, dialog, dropdown-menu, sonner, separator, scroll-area, table, pagination, label, textarea
- Mapped ShadCN variables (`--background`, `--foreground`, `--card`, `--sidebar-*`, etc.) to AWS color palette in both light and dark themes

### 0B. Test Framework
- Added Vitest + React Testing Library + jsdom for unit tests
- Added Playwright for E2E tests
- Created `vitest.config.ts` with path aliases and jsdom environment
- Created `playwright.config.ts` targeting Chrome
- Created `src/test/setup.ts` with global mocks for next/navigation and next/headers
- Created `src/test/utils.tsx` with custom render wrapper

### 0C. Dependencies
- `@supabase/ssr` — SSR-compatible Supabase auth (already installed)
- `@livekit/components-react`, `livekit-client` — LiveKit WebRTC SDKs
- `recharts` — Charts for analytics dashboard
- `date-fns` — Date formatting utilities

### 0D. Environment Files
- Updated `.env.example` with Supabase, Pipecat, and LiveKit variables
- Created `pipecat-service/.env.example` with voice pipeline configuration

---

## Phase 1: Foundation

### 1A. Supabase Auth Setup
- Created `src/lib/supabase/client.ts` — Browser client using `createBrowserClient`
- Created `src/lib/supabase/server.ts` — Server client using `createServerClient` with cookie handling
- Created `src/lib/supabase/middleware.ts` — Middleware client for session refresh + route protection
- Kept existing `src/lib/supabase.ts` for waitlist backward compatibility

### 1B. Auth Middleware
- Created `src/middleware.ts` — Protects `/dashboard/**` routes, redirects unauthenticated users to `/login`
- Redirects authenticated users from `/login` and `/signup` to `/dashboard`
- Public routes: `/`, `/privacy`, `/terms`, API routes

### 1C. Auth Pages
- Created `src/app/(auth)/layout.tsx` — Centered card layout with PitchNode branding
- Created `src/app/(auth)/login/page.tsx` — Email/password + Google OAuth login
- Created `src/app/(auth)/signup/page.tsx` — Registration with name, email, password
- Created `src/app/(auth)/actions.ts` — Server actions: signIn, signUp, signInWithGoogle, signOut
- Created `src/app/auth/callback/route.ts` — OAuth code exchange handler
- Updated `src/contexts/auth-context.tsx` — Uses new SSR-compatible client
- Updated `src/app/providers.tsx` — Added Sonner Toaster component
- Removed old `src/app/login/` directory (replaced by route group)

### 1D. Database Schema (Supabase MCP — staging `slttlpzxiynbbhotxfhy`)
Applied 5 migrations:

1. **`create_enums_and_profiles`**: Created enums (call_type, difficulty_level, persona_type, session_status), profiles table with auto-creation trigger on auth.users INSERT
2. **`create_scenarios_and_personas`**: Scenarios table (24 entries) and personas table (5 entries) with RLS for authenticated read
3. **`create_sessions_and_transcripts`**: Sessions, session_transcripts, session_analytics tables with user-scoped RLS and service_role bypass
4. **`create_progress_and_achievements`**: User progress (auto-created with profile), achievements, user_achievements tables
5. **`fix_function_search_paths`**: Fixed security warnings by setting `search_path = public` on trigger functions

All 11 tables have RLS enabled. Indexes on user_id, session_id, created_at.

### 1E. Dashboard Shell
- Created `src/app/(dashboard)/layout.tsx` — Sidebar + top bar + content area, responsive
- Created `src/components/dashboard/sidebar.tsx` — Nav: Home, Practice, History, Analytics, Settings with active state
- Created `src/components/dashboard/top-bar.tsx` — User avatar, page title, theme toggle, mobile menu

### 1F. Seed Data
- 5 personas: Sarah Chen (skeptical VP Eng), Marcus Thompson (analytical CFO), Rachel Kim (friendly Head Ops), David Park (aggressive CEO), Lisa Patel (indecisive Dir Product)
- 24 scenarios: 6 call types (discovery, demo, negotiation, cold_call, follow_up, closing) x 4 difficulties (easy, medium, hard, expert) with realistic briefings and objectives
- 20 achievements across 5 categories: sessions (4), scores (4), streaks (4), exploration (3), mastery (5)

---

## Phase 2: Dashboard Pages

### 2A. Dashboard Home (`/dashboard`)
- Stats grid: total sessions, avg score, current streak, best score
- Recent sessions list with scores and dates
- Quick-start grid: 6 call type cards with icons

### 2B. Practice Library (`/dashboard/practice`)
- Grid of 6 call type cards with descriptions
- Difficulty badges (Easy/Medium/Hard/Expert)
- Links to scenario setup pages

### 2C. Pre-Call Setup (`/dashboard/practice/[scenarioId]`)
- Scenario briefing display (context, company, objectives)
- Persona selector with 5 colored cards
- Start Call button linking to call room

### 2D. Session History (`/dashboard/history`)
- Paginated table of past sessions
- Columns: Date, Scenario, Persona, Score, Duration
- Filter by call type

### 2E. Session Review (`/dashboard/history/[sessionId]`)
- Score card with overall score + letter grade + 4 metric bars
- Transcript viewer with speaker colors and timestamps
- Highlight moments and improvement suggestions

### 2F. Analytics (`/dashboard/analytics`)
- Score trend line chart (recharts)
- Per-call-type bar chart
- Per-metric radar chart
- Activity streak calendar

### 2G. Settings (`/dashboard/settings`)
- Profile editing (name, avatar)
- Password change
- Theme preference toggle
- Delete account with confirmation dialog

### 2H. API Routes (10 routes)
- `GET /api/scenarios` — List/filter scenarios
- `GET /api/scenarios/[id]` — Scenario detail
- `GET /api/personas` — List personas
- `GET /api/sessions` — Paginated user sessions with joins
- `GET /api/sessions/[id]` — Session detail with transcripts + analytics
- `GET /api/analytics/overview` — User progress + recent sessions + achievements
- `GET /api/analytics/trends` — Score trends over time
- `PATCH /api/settings/profile` — Update profile fields
- `POST /api/voice/create-room` — Create session + call Pipecat backend
- `POST /api/voice/end-session` — End session + compute duration

---

## Phase 3: Voice Pipeline

### 3A. Pipecat Backend Service (`pipecat-service/`)
- FastAPI entry point with CORS middleware
- API key-protected endpoints: `POST /sessions/start`, `POST /sessions/{id}/end`, `GET /health`
- LiveKit service: room creation, token generation, pipeline lifecycle management
- Supabase service: scenario/persona fetching, transcript saving, analytics storage
- Analysis service: post-call scoring via OpenRouter (Claude 3.5 Sonnet)
- Pipeline architecture: Deepgram STT -> OpenRouter LLM -> Cartesia TTS (placeholder)
- Transcript collector with 30-second periodic flush
- System prompt builder: dynamic per scenario + persona + difficulty
- Analysis prompt builder: structured JSON output for 4-metric scoring
- Dockerfile for deployment

### 3B. Call Room UI (`/dashboard/practice/[scenarioId]/call`)
- LiveKit React integration for WebRTC connection
- Voice visualization with waveform CSS animations
- Call controls: mute/unmute, end call
- Timer counting up from 0:00
- Connection status indicator

---

## Phase 4: Post-Call Analysis
- Analysis service sends transcript to Claude 3.5 Sonnet via OpenRouter
- Scores 4 metrics (0-100): Objection Handling, Active Listening, Closing Technique, Rapport Building
- Generates: overall score, letter grade (A+ to F), highlight moments, improvement suggestions, summary
- Results stored in `session_analytics` table

---

## Phase 5: Progress Tracking + Achievements
- Created `src/lib/progress.ts` with:
  - `updateUserProgress()` — Updates session count, averages, streaks, per-type/persona stats
  - `calculateStreak()` — Consecutive day detection (same day = no change, next day = increment, gap = reset)
  - `evaluateCriteria()` — Achievement criteria evaluation engine
  - `checkAchievements()` — Scans all unearned achievements and awards matches
- Created `src/lib/database.types.ts` — Full TypeScript types generated from Supabase schema

---

## Testing

### Unit Tests (71 tests, 10 files)
- `src/lib/supabase/__tests__/client.test.ts` — Client factory creation
- `src/middleware.test.ts` — Route protection logic (7 tests)
- `src/app/(auth)/__tests__/auth-actions.test.ts` — Server actions (7 tests)
- `src/lib/__tests__/auth.test.ts` — Auth helper functions (8 tests)
- `src/contexts/__tests__/auth-context.test.tsx` — Auth context provider (5 tests)
- `src/app/api/__tests__/scenarios.test.ts` — Scenarios API (3 tests)
- `src/app/api/__tests__/sessions.test.ts` — Sessions API (5 tests)
- `src/app/api/__tests__/voice.test.ts` — Voice API (10 tests)
- `src/app/api/__tests__/analytics.test.ts` — Analytics API (3 tests)
- `src/lib/__tests__/progress.test.ts` — Progress tracking + achievements (20 tests)

### E2E Tests (2 files)
- `e2e/auth.spec.ts` — Auth flow (redirect, login page render, navigation)
- `e2e/dashboard.spec.ts` — Dashboard protection (all routes redirect when unauthenticated)

---

## Files Created/Modified Summary

| Category | Files Created | Files Modified |
|----------|--------------|----------------|
| ShadCN | 16 components | `globals.css`, `components.json` |
| Auth | 7 files | `providers.tsx`, `auth-context.tsx` |
| Dashboard | 11 pages + 2 components | — |
| API Routes | 10 route files | — |
| Pipecat Service | 21 Python files | — |
| Logic | 2 files (progress, types) | — |
| Tests | 12 test files + 4 config files | `package.json` |
| Config | 3 files (.env examples, middleware) | — |
| **Total** | **~85 files** | **~6 files** |
