# Zapier Integration — Status & Resume Notes

**Status as of 2026-04-27:** Backend complete and verified working end-to-end.
UI hidden from end users until the integration is approved for public release
on Zapier.

## What's working (don't touch — production code)

- All API endpoints live at `https://meetnotes-ochre.vercel.app`:
  - `GET /api/zapier/auth` — verifies Bearer API key, returns user id + email
  - `POST /api/zapier/subscribe` — registers a webhook for `meeting.completed`
  - `DELETE /api/zapier/unsubscribe/[id]` — removes a subscription
  - `GET /api/zapier/meetings` — returns 10 most recent completed meetings
- API key auth in `apps/web/src/lib/api-auth.ts` (SHA-256 hashed, `briva_sk_*` prefix)
- Webhook fan-out in `apps/web/src/lib/webhooks.ts`, fired via `next/server`'s
  `after()` from both `/api/transcribe` (upload path) and
  `/api/meetings/finalise-live` (live recording path)
- Supabase tables: `api_keys`, `webhook_subscriptions` (migration `013_api_keys_and_zapier.sql`)
- Middleware exemption: `/api/zapier/*` is in `publicPaths` so the route's own
  Bearer auth runs (cookies aren't present for external Zapier calls)
- Zapier app registered in private mode at developers.zapier.com — Briva v1.0.0
  with the `new_meeting` REST Hook trigger configured

## What's hidden from UI

- `apps/web/src/components/api-keys-card.tsx` — file kept, not imported in
  Settings. Re-enable by uncommenting two lines in
  `apps/web/src/app/(dashboard)/settings/page.tsx` (search "ApiKeysCard").

## What's NOT done — resume here

### Pre-launch validation issues (per Zapier's review form)

1. **Trigger sample data** — sample data field accepts JSON but rejects nested
   objects. Resolved approach: use the flat single-line JSON I drafted in chat;
   make sure the Zapier Sample Data textarea has clean ASCII (paste via Notepad
   to strip smart quotes). Source data shape: `apps/web/src/lib/zapier-payload.ts`.
2. **Description must start with "Briva is a"** — drafted, paste into Zapier
   Publishing form.
3. **Logo > 256px** — use `apps/desktop/src-tauri/app-icon.png` (1024×1024).
4. **3+ users with live Zaps** — currently 1 (founder). Need 2 more real users
   with live Zaps before Zapier accepts public submission. Ask beta testers.
5. **No users match domain** — Zapier wants the team contact email under the
   product's domain (e.g. `you@briva.app`). Not blocking; mention in Notes.

### Test account

Zapier requires a test account at `integration-testing@zapier.com`. Hit signup
rate limit during creation. To set up cleanly: Supabase Dashboard → Authentication
→ Add user → tick **Auto Confirm User**. Then log in as that user, generate an
API key, paste it in the Zapier Notes field of the Publishing form.

### Submission form values (drafted, ready to paste)

See chat history. Key answers: country = Hong Kong; primary color = `#10B981`;
homepage = `https://meetnotes-ochre.vercel.app`; privacy/terms URLs already on
the live site; primary contact = `sattarikram81@gmail.com`.

## How to resume

1. Re-enable the UI: uncomment the `ApiKeysCard` import + render in
   `apps/web/src/app/(dashboard)/settings/page.tsx`.
2. Solve the 3+ users blocker (find 2 beta users to make Zaps).
3. Create the `integration-testing@zapier.com` user via Supabase Auth admin.
4. Fill in the Zapier Publishing form using the drafted values.
5. Click **Submit for Review** in the developer portal. Wait 1–2 weeks.

## Existing live test Zap

There's still a live Zap on the founder's account (`sattarikram81@gmail.com`)
that emails meeting summaries via Gmail. Webhook fan-out is live in production,
so this will continue to fire on every meeting. To stop it without removing
backend code, just turn the Zap off at https://zapier.com/app/zaps.
