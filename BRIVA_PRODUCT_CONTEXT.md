# Briva — Product Context

Briva is an AI meeting-notes SaaS for Hong Kong professionals. Tagline: **"Hear Beyond Words."**
Live at **meetbriva.com**. Desktop apps for Windows and Mac.

---

## Tech stack

| Layer | What |
|---|---|
| Frontend | Next.js 15 App Router, Tailwind CSS, TypeScript |
| Backend | Next.js API routes (serverless) |
| Database | Supabase (Postgres + Auth + Storage) |
| AI — transcription | Deepgram Nova-2 (30+ languages, code-switching, speaker ID) |
| AI — summaries / chat | Anthropic Claude (claude-opus-4-7 / claude-sonnet-4-6) |
| AI — semantic search | Voyage embeddings + pgvector |
| Desktop | Tauri 2 + Rust (Windows WASAPI loopback, Mac BlackHole/mic fallback) |
| Payments | Stripe |
| Email | Resend |
| Deployment | Vercel (auto-deploy from `main`) |
| Monorepo | Turborepo + pnpm workspaces |

---

## Plans

| Plan | Price | Minutes/month | Per-meeting cap |
|---|---|---|---|
| Basic | Free | 300 min | 60 min |
| Pro | $19/mo or $190/yr | 3,000 min | 3 hrs |
| Team | $15/seat/mo or $150/yr | 6,000 min/seat | 4 hrs |
| Enterprise | Contact | Custom | Custom |

---

## Core features

### 1 — Upload & transcribe
- User uploads an audio/video file (or the desktop app uploads a recorded file)
- Deepgram transcribes with speaker diarisation
- Claude generates a structured summary: agenda, key decisions, action items, next steps
- Result stored in the meetings library

### 2 — Desktop recording (Windows & Mac)
- Rust + cpal captures system audio (WASAPI loopback on Windows; BlackHole on Mac)
- User presses Record in the desktop app → audio captured as WAV
- On Stop → file uploaded → transcribed + summarised automatically
- State persists across page navigation via a React Context provider in the layout

### 3 — Live transcription (beta)
- Starts a Deepgram WebSocket stream in real time
- Transcription appears word-by-word as the meeting happens
- After the meeting, user clicks "Stop & save" → summary generated from the live transcript
- State persists across page navigation; floating pill appears on other pages
- Mutual exclusion with desktop recording (can't run both at once)

### 4 — Per-meeting AI chat
- Each meeting has an AI chat panel
- Ask questions about that specific meeting ("What did John say about the budget?")
- Context is the full transcript + summary

### 5 — Cross-meeting AI chat (`/chat`)
- Ask questions across ALL meetings in the workspace
- Powered by Voyage embeddings stored in pgvector
- Retrieves relevant meeting chunks → Claude answers with citations
- Threads saved per workspace for history

### 6 — Tasks
- Action items extracted from meetings automatically
- Task list in dashboard, assignable to workspace members
- Overdue count shown in sidebar badge
- Reminder emails via cron

### 7 — Workspaces (multi-tenant)
- Each user belongs to one or more workspaces
- Meetings, tasks, vocabulary, and settings scoped to workspace
- Invite team members by email (Resend); roles: owner / admin / member
- Switch workspace from the dashboard nav

### 8 — Integrations
- **Google Calendar** — auto-link calendar events to meetings
- **Outlook Calendar** — same for Microsoft
- **Zapier** — trigger zaps on new meeting; send meeting data to any app
- **API keys** — developers can pull meeting data programmatically

### 9 — Export & sharing
- **PDF export** — full transcript + summary as a formatted PDF
- **Share link** — public read-only link with optional password protection
- **Email recap** — send summary + action items to meeting attendees (Pro+)
- **Clipboard** — copy formatted summary in one click

### 10 — Custom vocabulary
- Workspace-level custom terms (company names, product names, acronyms)
- Injected into the transcription prompt to improve accuracy

### 11 — Audio retention
- Workspace setting: keep audio forever, delete after processing, delete after 7 days, or delete after 30 days
- Per-meeting override via `audio_delete_at` field
- Daily cron sweeps expired audio and deletes from Supabase Storage

### 12 — Comments
- Inline comments on meeting transcripts

### 13 — Meeting speakers
- Rename auto-detected speakers ("Speaker 0" → "John") per meeting
- Persisted to the `meeting_speakers` table

---

## Auth

- Email + 8-digit OTP (no magic links — corporate email scanners invalidate them)
- Google OAuth
- Supabase Auth under the hood
- Session cookie for web; Tauri capability allowlist for desktop

---

## Desktop app specifics

- Tauri 2, loads `https://meetbriva.com` in a WebView
- System tray: close button minimises to tray; Quit from tray to fully exit
- Windows: WASAPI loopback captures whatever is playing through speakers
- Mac: looks for BlackHole/Loopback virtual device; falls back to mic
- Mac build produced by GitHub Actions (universal Intel + Apple Silicon .dmg)
- Currently unsigned (users see Gatekeeper warning on Mac first launch)
- Auto-updater wired (Tauri updater plugin, public key stored in tauri.conf.json)

---

## Known limitations / in-progress

- Live transcription no-transcript bug on Windows (Rust WASAPI → Deepgram WS pipeline) — not yet fixed
- Mac app unsigned → Gatekeeper warning + mic re-prompts on each launch (fix: Apple Developer cert $99/yr)
- Google OAuth not yet verified (limited to test users)
- Stripe in test mode (live mode not yet switched on)

---

## File structure (key paths)

```
apps/
  web/                        Next.js app (deployed to Vercel)
    src/
      app/
        (dashboard)/          All authenticated pages
          meetings/           Meeting library + individual meeting view
          upload/             Record system audio + upload files
          record-live/        Live transcription
          chat/               Cross-meeting AI chat
          tasks/              Task list
          settings/           Billing, team, workspace settings
        api/                  All API routes
      components/
        live-recording-provider.tsx   Live capture state (layout-level)
        audio-recording-provider.tsx  Recording state (layout-level)
        sidebar-capture-buttons.tsx   State-aware Record/Live sidebar buttons
      lib/
        tauri.ts              All Tauri IPC helpers
        billing/plans.ts      Plan definitions
  desktop/                    Tauri desktop app
    src-tauri/
      src/lib.rs              All Rust: audio capture, Deepgram WS, IPC commands
      tauri.conf.json         App config, updater, bundle settings
      capabilities/default.json  IPC permissions + remote URL allowlist
supabase/
  migrations/                 All DB migrations (001–027)
.github/
  workflows/
    desktop-mac.yml           GitHub Actions Mac build (universal .dmg)
```

---

## Environment variables (web)

Key ones — full list in `.env.local` / Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEEPGRAM_API_KEY
ANTHROPIC_API_KEY
VOYAGE_API_KEY
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
```
