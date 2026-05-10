# Briva — Product Overview

*Last updated: 2026-05-10*

> *Hear Beyond Words.*

The AI workspace for meetings — for individuals and teams. Records or uploads any meeting, transcribes in 30+ languages with code-switching, generates structured summaries, and lets users ask questions across every meeting their team has run. Web app + Windows desktop, with team workspaces, a shared task board, and shareable artefacts baked in.

Live at **https://meetbriva.com**.

---

## 1. Market research

### The space

The "AI meeting notes" market is in a land grab phase. TAM is roughly any knowledge worker on Zoom / Meet / Teams — Gartner pegs it at ~150M paid seats globally, with sub-10% penetration of dedicated note-takers today. The category leader is **Otter.ai** (~$100M ARR, US-centric, freemium). Other notable players:

| Competitor | Positioning | Pricing | Notable strengths | Weaknesses we exploit |
|---|---|---|---|---|
| **Otter.ai** | SMB / individual default | Free / $20 / $30+ seat | OtterPilot auto-joins calls, cross-meeting chat, mature mobile | English-first, weak on Cantonese / code-switching |
| **Fireflies.ai** | Sales-team focused | $18 / $29 / $39 seat | CRM push (Salesforce, HubSpot), conversation intelligence | Same English bias, opaque transcription quality |
| **tldv** | "Free meeting recorder" angle | Free / $20 seat | Free unlimited, native Zoom recorder | Thin summaries, no language depth |
| **Fathom** | "Notion for sales calls" | Free / $24 seat | Free tier is generous, US sales niche | Not multilingual, no team library |
| **Granola** | Mac-only, in-meeting notepad | Free / $14 seat | Beautiful UX, Mac-native, no bot | Mac-only, no team workspaces, paid early |
| **Microsoft Copilot** | Bundled into Teams | Bundled with M365 | Distribution | Locked to Teams meetings only |
| **Notion AI** | Bundled with Notion | $10/seat add-on | Distribution to existing customers | Not real-time, summary-only |

### Where Briva differentiates

| | Most competitors | Briva |
|---|---|---|
| Bilingual transcription with code-switching | Weak | First-class via Deepgram Nova-2 + multilingual LLM routing |
| Hong Kong / APAC focus | Underserved (US-first) | Original target market |
| Live AI Q&A during the meeting | Otter only | Yes, per-meeting Q&A panel |
| **Cross-meeting AI search** (RAG over team's library) | Otter only | **Shipped — Voyage embeddings + pgvector + Claude RAG** |
| Native desktop system audio capture | tldv has it | Yes (Tauri 2 + WASAPI loopback on Windows) |
| Team workspaces with roles + invites | Yes (Otter, Fireflies) | Yes |
| Action items → assignable tasks with reminders | No / weak | **Shipped — Kanban + daily email digest** |
| Auto-recap fan-out to attendees | Otter (manual) | **Shipped — auto, opt-in per user** |
| AI-drafted follow-up email | No | **Shipped — Claude-streamed, editable, sent via Resend** |
| Per-seat billing with auto-quantity | Yes | Yes ($15/seat — half Otter's price) |

### Honest gaps vs. competitors

- **No auto-join bot.** Highest-priority gap. Anyone selling to a sales team buys whichever product joins their calls automatically.
- **No CRM integrations.** Otter and Fireflies push to Salesforce / HubSpot. We have Zapier (private app pending public review).
- **No mobile app.** Field sales / 1:1 walks demand a phone capture mode. Otter has both iOS and Android.
- **macOS desktop not yet shipped.** Windows MSI is live; Mac DMG path is on the roadmap.
- **MSI is unsigned during beta.** SmartScreen warns first-time installers; Azure Trusted Signing (~$10/mo) fixes it.

---

## 2. Business model

### Revenue

Three SaaS tiers with monthly / annual billing, plus a contact-sales tier:

| Plan | Monthly | Annual (effective/mo) | Minutes pool | Per-meeting cap | Workspace |
|---|---|---|---|---|---|
| **Basic** (free) | $0 | — | **300/mo** per workspace | 60 min | up to 2 members |
| **Pro** (individual) | $19 | $190 ($16) | 3,000/mo | 3 hr | up to 5 members |
| **Team** (per-seat) | $15/seat | $150/seat ($12.50) | 6,000/seat/mo | 4 hr | unlimited |
| **Enterprise** | Custom | Custom | Custom | Unlimited | unlimited + SSO + audit logs |

**Per-seat mechanics on Team:** Stripe checkout passes `quantity = workspace member count`. When a workspace owner invites or removes a member, the app calls `stripe.subscriptions.update()` to adjust quantity with proration — adding a 5th seat to a 4-seat plan generates a prorated charge automatically; removing one credits back.

### Pricing positioning

Roughly **half Otter's per-seat price** ($15 vs $30 Business) and similar to Fireflies / Fathom. The trade-off is conscious: we want to win the Asian SMB segment where price sensitivity is higher, while feature gap with Otter narrows. We also bundle workspaces into Pro at no extra cost (Otter only allows team libraries on Business+).

The **300-minute free tier** (up from 100) is a deliberate land-grab move — generous enough that an individual can use Briva for a full month without ever touching their card, which seeds organic word-of-mouth in target accounts.

### Unit economics (rough)

Per minute of audio processed end-to-end:

| Cost | Per-minute |
|---|---|
| Deepgram Nova-2 transcription | ~$0.0044 |
| Claude Sonnet 4.6 summarisation (1-time, ~10–30K tokens) | ~$0.005 |
| Voyage embeddings (cross-meeting RAG indexing, free tier covers heavy use) | ~$0 |
| Supabase storage + bandwidth | ~$0.001 |
| Vercel function-time | ~$0.0005 |
| **Estimated total** | **~$0.011 per minute** |

At Pro pricing ($19 for 3,000 minutes), our COGS is ~$33 — meaning **a heavy Pro user is unprofitable on usage alone**. The economics work because most Pro users use 200–600 min/month (industry average for Otter), giving us 70–80% gross margin on typical use. Heavy users effectively cap the loss at ~$14/month.

Team plan at $15/seat/$6,000 has the same dynamic. Enterprise is contract-based and priced to absorb worst case.

### Go-to-market

**Phase 1 (now): Hong Kong & APAC bilingual professionals.** PLG via free tier + share-link viral loop (every public share link is an ad). Wedge: bilingual EN+Cantonese is genuinely better than Otter for HK users.

**Phase 2: APAC SMB sales teams.** Once auto-join bot ships, position to APAC sales teams at half Otter's price. Product Hunt + LinkedIn organic.

**Phase 3: Global English markets.** Once feature parity is closer, paid acquisition (Google Ads on "otter.ai alternative" / "fireflies alternative") and content marketing (SEO on "AI meeting notes for X").

### Key metrics to track

- **Activation** — % of signups that complete one meeting (Otter benchmark: ~40%).
- **Free → Paid conversion** — % of activated free users that upgrade in 90 days (Otter: ~3–5%).
- **Per-seat expansion** — average seats per Team workspace 30 days after first paid invite.
- **Churn** — monthly logo churn on Pro and Team.
- **Minutes per active user** — drives COGS and signals stickiness.
- **Cross-meeting AI usage** — questions per active workspace per week. Strong leading indicator of stickiness.
- **Tasks completed per workspace** — proxy for the "follow-through" promise.

---

## 3. Features (what's actually built)

### Capture
- File upload — MP3 / WAV / M4A / MP4 / WebM up to 450 MB, resumable (TUS) so big files survive flaky network.
- Live recording in browser — streaming Deepgram, AI chat panel mid-meeting.
- Live recording on Windows desktop — Tauri 2 app captures system audio via WASAPI loopback, no browser plugin needed.
- Chrome extension — record from Meet / Zoom / Teams tabs.

### Transcription
- Deepgram Nova-2 with auto-detection across **30+ languages**.
- Code-switching — mid-sentence language switches stay coherent.
- Speaker diarisation + AI speaker auto-naming from context.
- **Workspace-shared custom vocabulary** — proper nouns / jargon piped into Deepgram as keyword boosts. Shared by every member of the workspace.

### AI summary (Claude Sonnet 4.6)
- Overview + structured summary in 30+ languages.
- Action items with assignee detection.
- Topics, key decisions, key quotes, sentiment.
- Inline editing on every section.
- Three styles: concise / detailed / bullet.

### BRIVA AI
- **Per-meeting Q&A** — chat over the full transcript of one meeting.
- **Cross-meeting Q&A** — RAG across every meeting in the workspace, Voyage embeddings + pgvector + Claude. Streaming responses with timestamped citations.
- Available in-meeting (live) and post-meeting.

### Tasks
- Auto-promoted from AI-extracted action items.
- Manual task creation with assignee, due date, priority.
- Workspace Kanban (todo / in-progress / done) with inline-editable titles.
- Auto-matched assignees from speaker labels → workspace members.
- **Daily reminder email digest** at 09:00 HKT (Vercel cron) for overdue + due-today tasks.
- Sidebar overdue badge + red wash on overdue cards.

### Team workspaces
- Personal workspace auto-created on signup.
- Invite members by email; roles: owner / admin / member.
- Shared meeting library — every member sees every meeting.
- Per-seat Team plan with Stripe quantity auto-sync.
- Comments thread on every meeting page.
- Workspace switcher in sidebar.

### Sharing & export
- Public share link with optional password.
- PDF export (React-PDF).
- **Auto-email recap** to every calendar attendee — opt-in per user, sends only once per meeting.
- **AI-drafted follow-up email** in the Share dropdown — Claude-streamed, editable, sends via Resend.
- Copy as Markdown.

### Integrations
- Google Calendar auto-link recordings to events ±15 min (Pro+); auto-recap fans out to all attendees.
- Stripe subscriptions, billing portal, webhook-driven tier sync.
- Resend for confirmation, recap, invite, and demo-request emails.
- Zapier webhook fan-out on `meeting.completed` (private app pending public review).

### Auth & infrastructure
- Supabase auth with **email-OTP** confirmation (corporate-scanner-proof, no PKCE links).
- Google OAuth login.
- Tauri 2 desktop with auto-updater pinned to public `briva-releases` GitHub repo.
- Vercel deployment from `main`, custom domain `meetbriva.com` with Resend SMTP.
- **Light theme as default** with no-flash inline script + emerald-gradient body.

### Marketing surface
- Public **pricing page** (no login required) with auth-aware CTAs.
- **Animated demo reel** auto-plays on landing + `/demo` (6 scenes, ~30s loop).
- **Book-a-demo flow** — modal lead form, posts to `sales@meetbriva.com` via Resend.
- "Hear Beyond Words." slogan stitched into every brand surface (nav, auth, footer, transactional emails, SEO).

---

## 4. Roadmap (priority order)

1. **Auto-join bot for Zoom / Meet / Teams** — calendar-driven OtterPilot equivalent. ~2–3 weeks. Unlocks B2B sales segment.
2. **Confirmation email to demo requesters** — half-day; reduces "did you get it?" follow-ups.
3. **macOS desktop app** — DMG build of the Tauri app, mirroring Windows feature set.
4. **Mobile capture (iOS first)** — record-and-upload for v1, no live.
5. **Persistent speaker voiceprints** across meetings — improves diarisation over time.
6. **Code signing** (Azure Trusted Signing) so the MSI installer doesn't trigger SmartScreen on first launch.
7. **CRM integrations** — Salesforce + HubSpot native push for action items and call notes.
8. **Public Zapier app** — currently in private mode; needs 3+ users with live Zaps for review submission.
9. **In-app notification centre** — task reminders, comments, mentions surfaced inside the dashboard rather than email-only.
