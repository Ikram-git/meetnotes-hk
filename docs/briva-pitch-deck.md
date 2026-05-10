<!--
Briva pitch deck (Marp-compatible markdown).

To render:
  npx @marp-team/marp-cli docs/briva-pitch-deck.md --pdf
  npx @marp-team/marp-cli docs/briva-pitch-deck.md --pptx
  npx @marp-team/marp-cli docs/briva-pitch-deck.md --html

Or open in VS Code with the "Marp for VS Code" extension and use the
preview pane. PDFs render in the project's emerald palette.
-->
---
marp: true
theme: default
paginate: true
size: 16:9
backgroundColor: #fbfdfc
color: #111827
style: |
  section {
    font-family: 'Helvetica Neue', 'Inter', Arial, sans-serif;
    padding: 64px 80px;
    background-image:
      radial-gradient(at 0% 0%, rgba(16,185,129,0.10) 0%, transparent 45%),
      radial-gradient(at 100% 100%, rgba(20,184,166,0.06) 0%, transparent 55%);
  }
  section.lead {
    text-align: center;
    justify-content: center;
  }
  section.dark {
    background: #061814;
    color: #f3f4f6;
  }
  section.dark h1, section.dark h2, section.dark h3 { color: #6ee7b7; }
  h1 { color: #047857; font-size: 50px; line-height: 1.1; margin-bottom: 12px; }
  h2 { color: #047857; font-size: 38px; line-height: 1.15; margin-bottom: 20px; }
  h3 { color: #065f46; font-size: 22px; }
  strong { color: #047857; }
  em { color: #10b981; font-style: italic; }
  blockquote { border-left: 4px solid #10b981; padding: 4px 16px; color: #4b5563; }
  table { font-size: 18px; border-collapse: collapse; }
  th { background: #ecfdf5; color: #047857; text-align: left; padding: 8px 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  ul { font-size: 22px; line-height: 1.5; }
  .slogan { font-style: italic; color: #10b981; font-size: 28px; }
  .muted { color: #6b7280; font-size: 18px; }
  .pill {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 9999px;
    background: #d1fae5;
    color: #047857;
    font-size: 16px;
    font-weight: 600;
  }
  footer { font-size: 14px; color: #6b7280; }
header: 'Briva · Hear Beyond Words.'
footer: 'meetbriva.com'
---

<!-- _class: lead dark -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Briva

<p class="slogan">Hear Beyond Words.</p>

## The AI workspace for meetings.

<p class="muted">May 2026 · meetbriva.com</p>

---

<!-- _class: lead -->

## Meetings produce decisions.
## Decisions produce action.

# That action gets lost between calls.

---

## The status quo

- Notes scattered across Notion, Slack threads, individual heads.
- Knowledge trapped inside individual recordings — unsearchable, untagged, unshared.
- Follow-ups depend on whoever was most diligent that day.
- Existing tools are **English-first** and **summary-only** — they stop at the recap.

<p class="muted">~150M paid Zoom/Meet/Teams seats globally. Sub-10% have a dedicated note-taker. The land grab is wide open.</p>

---

# Briva captures every meeting and ships the action.

<p class="slogan">Hear Beyond Words.</p>

- **Live capture** — record live or upload, 30+ languages, code-switching baked in.
- **Structured summary** — overview, decisions, action items, sentiment.
- **Ask anything** — across one meeting or every meeting your team has run.
- **Tasks ship themselves** — action items auto-assigned to the right teammate, with daily reminders.
- **Auto-recap** — emailed to every attendee on the calendar invite.

---

## What's shipped

<p class="pill">Web · Windows desktop · Chrome extension</p>

| Capability | Status |
|---|---|
| Live transcription (Deepgram Nova-2, 30+ languages) | ✅ shipped |
| Structured AI summary (Claude Sonnet 4.6) | ✅ shipped |
| Per-meeting & cross-meeting AI Q&A (BRIVA AI) | ✅ shipped |
| Workspace-shared task board with daily reminders | ✅ shipped |
| Auto-recap to attendees + AI-drafted follow-up email | ✅ shipped |
| Team workspaces, comments, custom vocabulary | ✅ shipped |
| PDF export · password-protected share links | ✅ shipped |
| Stripe per-seat billing | ✅ shipped |

---

## Demo

<p class="muted">Live auto-playing reel at <strong>meetbriva.com/demo</strong> — 6 scenes, ~30 seconds:</p>

1. Live capture with multilingual badges
2. AI summary with action items appearing
3. *"What did Lisa commit to?"* — BRIVA AI streaming an answer with citations
4. Team comments + a task getting checked off
5. Auto-recap email + share link export
6. CTA

---

## Market & landscape

<p class="pill">Land grab phase</p>

| Competitor | Strength | Weakness Briva exploits |
|---|---|---|
| **Otter.ai** ($100M ARR) | OtterPilot, mature mobile | English-first, weak on Cantonese / code-switching |
| **Fireflies.ai** | CRM push, sales focus | Same English bias, opaque transcript quality |
| **tldv** | Free unlimited, native Zoom | Thin summaries, no language depth |
| **Fathom** | Generous free tier | Not multilingual, no team library |
| **Granola** | Beautiful Mac UX | Mac-only, no team workspaces |
| **Microsoft Copilot** | M365 distribution | Locked to Teams meetings only |

---

## Where we win

| | Most | Briva |
|---|---|---|
| Bilingual EN + Cantonese, code-switching | Weak | **First-class** |
| HK / APAC focus | US-first | **Original target market** |
| Live AI Q&A *during* the meeting | Otter only | ✅ |
| Cross-meeting AI search | Otter only | ✅ Voyage + pgvector + Claude RAG |
| Action items → assignable tasks + reminders | Weak | ✅ Workspace Kanban + daily digest |
| Auto-recap to attendees | Manual | ✅ Opt-in per user, fully automated |
| AI-drafted follow-up email | No | ✅ Streaming, editable, one-click send |
| Per-seat price | Otter $30 | **$15** — half the price |

---

## Business model

### Three SaaS tiers + Enterprise contracts

| Plan | Monthly | Annual / mo | Minutes | Per-meeting cap | Workspace |
|---|---|---|---|---|---|
| **Basic** | Free | — | 300/mo | 60 min | up to 2 |
| **Pro** | $19 | $16 | 3,000/mo | 3 hr | up to 5 |
| **Team** | $15/seat | $12.50 | 6,000/seat/mo | 4 hr | unlimited |
| **Enterprise** | Custom | Custom | Custom | Unlimited | + SSO + audit logs |

<p class="muted">Per-seat billing on Team auto-syncs with Stripe quantity when members are added or removed — proration handled by Stripe.</p>

---

## Unit economics

### Per minute of audio processed

| Cost line | Per minute |
|---|---|
| Deepgram Nova-2 transcription | $0.0044 |
| Claude Sonnet 4.6 summarisation | $0.005 |
| Voyage embeddings (RAG) | ~$0 (free tier covers heavy use) |
| Supabase storage + bandwidth | $0.001 |
| Vercel function-time | $0.0005 |
| **Total** | **~$0.011 / min** |

<p class="muted">Pro at $19 / 3,000 min: <strong>worst-case COGS $33</strong> — but typical usage is 200–600 min/mo (industry benchmark), giving 70–80% gross margin on real users.</p>

---

## Pricing rationale

### Half Otter's per-seat price. Generous free tier.

- **$15/seat Team** vs. Otter's $30 Business — direct undercut for cost-sensitive APAC SMB.
- **300-min free tier** lets an individual use Briva for a whole month without a credit card. Seeds organic word-of-mouth in target accounts.
- **Workspaces bundled into Pro** — Otter only gives team libraries on Business+.
- **Annual saves ~17%** — a soft retention lock the same shape as Notion / Linear / Vercel.

---

## Go-to-market

### Phase 1 — *now*
**HK & APAC bilingual professionals.** PLG via free tier + share-link viral loop (every public share link is a passive ad). Wedge: bilingual EN + Cantonese is genuinely better than Otter for HK users.

### Phase 2
**APAC SMB sales teams** once auto-join bot ships. Position at half Otter's price. Product Hunt + LinkedIn organic.

### Phase 3
**Global English markets.** Paid acquisition on *"otter.ai alternative"* / *"fireflies alternative"* + content SEO on *"AI meeting notes for X"*.

---

## Metrics to watch

- **Activation** — % of signups completing one meeting (Otter ≈ 40%).
- **Free → Paid conversion** — % of activated users upgrading in 90 days (Otter ≈ 3–5%).
- **Per-seat expansion** — avg seats per Team workspace 30 days after first paid invite.
- **Cross-meeting AI usage** — questions per active workspace per week. Strong leading indicator of stickiness.
- **Tasks completed per workspace** — proxy for the "follow-through" promise.
- **Minutes per active user** — drives COGS and signals stickiness.
- **Logo churn on Pro and Team** — monthly.

---

## Roadmap

### Next 90 days

1. **Auto-join bot** for Zoom / Meet / Teams — calendar-driven, OtterPilot equivalent. *Unlocks B2B sales.*
2. **macOS desktop app** — DMG build mirroring the Windows feature set.
3. **Code signing** (Azure Trusted Signing) so the MSI installer stops triggering SmartScreen.

### After
4. Mobile capture (iOS first) — record-and-upload for v1, no live.
5. Persistent speaker voiceprints across meetings.
6. CRM integrations — Salesforce + HubSpot native push.
7. Public Zapier app.
8. In-app notification centre.

---

## Honest gaps

- **No auto-join bot yet** — highest priority. Sales teams buy whichever product joins their calls.
- **No CRM integrations** — Otter and Fireflies push to Salesforce / HubSpot. We have private Zapier.
- **No mobile app** — field sales / 1:1 walks need a phone capture mode.
- **No macOS desktop yet** — Windows MSI is shipped; Mac DMG on roadmap.

<p class="muted">Each gap is scoped and on the roadmap. None is foundational — the platform is built to absorb them.</p>

---

<!-- _class: lead dark -->
<!-- _paginate: false -->

# Briva
<p class="slogan">Hear Beyond Words.</p>

## meetbriva.com

<p class="muted">Try free · 300 minutes/month · No credit card</p>
<p class="muted">Book a demo: sattarikram81@gmail.com</p>
