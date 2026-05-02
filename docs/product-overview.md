# Briva — Product Overview

*Last updated: 2026-05-03*

AI meeting notes for individuals and teams. Records or uploads any meeting, transcribes in 30+ languages, generates structured summaries, and lets you ask questions about the content — both live and after the fact. Web app + Windows desktop, with team workspaces baked in.

Live at **https://meetbriva.com**.

---

## Market

### The space

The "AI meeting notes" market is led by **Otter.ai** (consumer + SMB, ~$100M ARR, US-centric), with adjacent products from **Fireflies.ai**, **tldv**, **Fathom**, **Granola**, and meeting features inside **Notion AI** and **Microsoft Copilot**. Underlying STT is mostly Deepgram, AssemblyAI, or in-house. Underlying LLM is mostly OpenAI or Anthropic.

### Where Briva differentiates

| | Otter / Fireflies / etc. | Briva |
|---|---|---|
| Bilingual transcription with code-switching | Weak (English-first, mid-sentence switches drop) | First-class. Deepgram Nova-2 + multilingual prompt routing |
| Hong Kong / APAC focus | Underserved | Original target market |
| Live AI Q&A during the meeting | Otter has it (Otter AI Chat) | We have it (per-meeting Q&A panel) |
| Cross-meeting AI search | Otter Business+ tier | Not yet — biggest gap and biggest moat opportunity |
| Auto-join Zoom / Meet / Teams bot | Otter, Fireflies, tldv | Not yet — second-biggest gap |
| Native desktop system audio capture | tldv has it; most don't | Yes (Tauri 2 + WASAPI loopback on Windows) |
| Team workspaces with roles + invites | Yes | Yes (shipped 2026-05) |
| Per-seat billing | Yes (Otter Business $30/seat) | Yes (Team $15/seat) |
| Code signing / enterprise distribution | Yes | Not yet — currently SmartScreen-warned |

### Honest weaknesses

- **No auto-join bot.** Anyone selling to a sales team will buy the competitor that joins their calls automatically. Highest-priority gap.
- **No CRM integrations.** Otter Business pushes to Salesforce / HubSpot. We have Zapier (private) but no native CRM.
- **No mobile app.** Field sales / 1:1 walks demand a phone capture mode.
- **No cross-meeting search or chat.** Once a user has 50+ meetings on Otter, they're sticky.
- **MSI is unsigned during beta.** SmartScreen warns first-time installers; ~$10/mo Azure Trusted Signing fixes this.

---

## What's actually built

### Capture
- **File upload** — MP3, WAV, M4A, MP4, WebM up to 450 MB. Resumable (TUS) so big files don't restart on flaky network.
- **Live recording** in browser — streaming Deepgram, AI chat panel as the meeting unfolds.
- **Live recording on desktop (Windows)** — captures system audio via WASAPI loopback; works for any Zoom / Meet / Teams call without a browser plugin.
- **Chrome extension** — record from Meet / Zoom / Teams tabs.

### Transcription
- **Deepgram Nova-2** with auto-detection across 30+ languages including English, Cantonese, Mandarin, Japanese, Korean, Spanish, French.
- **Code-switching** — mid-sentence language switches stay coherent.
- **Speaker diarisation** — labels detected automatically; renaming gated to Pro+.

### AI summary (Claude Sonnet 4.6)
- Overview + structured summary in 18 languages.
- Action items with assignee detection.
- Topics, key decisions, sentiment.
- Editable inline.
- Per-meeting Q&A chat against the full transcript.

### Sharing & export
- Public share-link with optional password.
- PDF (in-browser via React-PDF).
- Email recap to attendees (Pro+).
- Copy as Markdown.

### Team workspaces (shipped 2026-05)
- Personal workspace auto-created on signup.
- Invite members by email; roles: owner / admin / member.
- Shared meeting library — every member sees every meeting.
- Workspace switcher in the navbar.
- Per-seat Team plan; Stripe quantity auto-syncs on invite/remove.

### Integrations
- **Google Calendar** — auto-link recordings to the matching event ±15 min (Pro+).
- **Stripe** — subscriptions with monthly/annual toggle, billing portal, webhook-driven tier sync.
- **Resend** — confirmation emails, recap emails, invite emails.
- **Zapier** — webhook fan-out on `meeting.completed`, REST Hook trigger registered (in private mode pending review).

### Auth & infrastructure
- Supabase auth with email-OTP confirmation (corporate-scanner-proof).
- Google OAuth login.
- Tauri 2 desktop with auto-updater wired to public `briva-releases` GitHub repo.
- Vercel deployment from `main`.

---

## Pricing

| | Basic | Pro | Team | Enterprise |
|---|---|---|---|---|
| Price | Free | $19/mo or $190/yr | $15/seat/mo or $150/seat/yr | Custom |
| Minutes | 100/mo | 3,000/mo | 6,000/seat/mo | Custom |
| Per-meeting cap | 60 min | 3 hr | 4 hr | Unlimited |
| Email recap | — | ✓ | ✓ | ✓ |
| Calendar auto-link | — | ✓ | ✓ | ✓ |
| Speaker rename | — | ✓ | ✓ | ✓ |
| Shared workspace library | ✓ | ✓ | ✓ | ✓ |
| Workspace admin controls | ✓ | ✓ | ✓ | ✓ |
| SSO | — | — | — | ✓ |

---

## What's next

In priority order:

1. **Cross-meeting AI chat** — RAG over a workspace's full meeting history with transcript citations. ~1–2 weeks. Biggest moat.
2. **Auto-join bot for Zoom / Meet / Teams** — calendar-driven OtterPilot equivalent. ~2–3 weeks. Unlocks B2B sales.
3. **Auto-email recap** to attendees, with a per-meeting toggle. Half-day feature, big perceived value.
4. **Mobile capture** (iOS first) — record-and-upload, no live for v1.
5. **Persistent speaker voiceprints** across meetings.
6. **Code signing** (Azure Trusted Signing) so the MSI installer doesn't trigger SmartScreen.
7. **CRM integrations** — Salesforce + HubSpot push for action items / call notes.
8. **Public Zapier app** — currently private; needs 3+ users with live Zaps for review submission.
