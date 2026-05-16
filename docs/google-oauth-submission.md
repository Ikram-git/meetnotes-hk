# Google OAuth — Verification Submission Pack

Copy-paste reference for getting `meetbriva.com` through Google's OAuth
verification. Open Google Cloud Console → **Google Auth Platform**
alongside this doc and work top-to-bottom.

---

## 1. Branding tab

| Field | Value |
|---|---|
| **App name** | `Briva` |
| **User support email** | `sattarikram81@gmail.com` (until `support@meetbriva.com` is forwarding) |
| **App logo** | Upload your 120×120 emerald-`B` square PNG |
| **Application home page** | `https://meetbriva.com` |
| **Application privacy policy link** | `https://meetbriva.com/privacy` |
| **Application terms of service link** | `https://meetbriva.com/terms` |
| **Authorized domains** | `meetbriva.com` |
| **Developer contact information** | `sattarikram81@gmail.com` |

> Authorized domains will only accept `meetbriva.com` after you've verified
> the domain in Google Search Console. Do that first if it's not done.

---

## 2. Data access tab — confirm scopes

These three, **and nothing else**:

```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/calendar.events.readonly
openid
```

If any others appear (drive, profile, contacts, etc.) — **remove them**.
Extra scopes slow review and risk rejection.

---

## 3. Audience tab — publishing

Leave at **Testing** until:
- Branding is fully filled in
- Video is recorded and uploaded
- All justifications below are ready to paste

Then click **Publish app** → Google will prompt for the verification
submission. Fill in section 4 below.

---

## 4. Verification submission form

### "What does your app do?" (one paragraph)

```
Briva is an AI meeting-notes workspace for individuals and teams.
Users record or upload meeting audio, and Briva transcribes it in 30+
languages, generates a structured summary with action items, and lets
the team ask questions across every meeting they've run.

The Google Calendar integration is optional: when connected, Briva
auto-links each recording to the matching calendar event (±15 min)
and reads the attendee list so the AI-generated recap email can be
delivered to participants on the invite. Briva never modifies,
creates, or deletes events.
```

### Scope justifications (one per scope)

> Paste exactly into the per-scope justification field.

**`https://www.googleapis.com/auth/calendar.events.readonly`**

```
Briva reads the user's upcoming Google Calendar events to (a)
automatically link recorded meetings to the right calendar event by
matching the recording timestamp against event times (±15 minutes),
and (b) read the attendee list on the matched event so the AI-
generated meeting recap email can be sent to the participants who
were on the invite.

Briva never modifies, creates, or deletes calendar events. Read-only
is the only Calendar scope requested. Event data is fetched on demand
when a recording finishes processing; we persist only a single event
ID reference plus the event title and start time on the meeting
record so we can display the linked event to the user. Raw event
payloads are not retained.

We chose calendar.events.readonly over the broader calendar.readonly
because Briva only needs event-level data, not calendar metadata,
ACLs, or settings.
```

**`https://www.googleapis.com/auth/userinfo.email`**

```
Used solely to display which Google account is currently connected in
the user's Briva settings panel, so they can confirm the right
account is linked and detect when they reconnect after revoking
access. Not used for marketing, sharing, analytics, or any purpose
beyond UI display.
```

**`openid`**

```
Standard OpenID Connect scope used by Google's OAuth 2.0 flow to
confirm the user's identity during the consent handshake. No
additional user data is requested through this scope.
```

### Demo video link

Paste the unlisted YouTube URL of the recording (see section 5).

### "How will users access this scope?"

```
A user signs in to Briva and navigates to Settings, where a
"Google Calendar" integration card offers a Connect button. Clicking
Connect initiates Google's OAuth 2.0 authorization flow, where the
user reviews the requested scopes on Google's consent screen and
approves. After approval, they're returned to Briva and the
integration is active.

Users can revoke access at any time from the same Settings page
(Disconnect button) or from their Google account security settings.
```

### "Where are sensitive scopes used in your app?"

```
The calendar.events.readonly scope is used in two places:

1. /api/google/calendar/events — fetches the user's upcoming events
   to display them in the dashboard sidebar.

2. /lib/email/auto-recap.ts — when a meeting completes processing,
   if it was auto-linked to a Calendar event, we fetch the event's
   attendees to send the AI-generated recap email to the participants
   on the invite.

Both calls are server-side; the Google API key never reaches the
browser. The OAuth tokens are stored encrypted at rest in our
Supabase Postgres database with row-level security limiting access
to the row's owner.
```

---

## 5. Demo video

### Recording

Use Loom (easiest), QuickTime, or OBS. **60–90 seconds.** Screen-only is
fine; voiceover optional.

**Open these tabs before you hit record:**
- `https://meetbriva.com` (homepage)
- `https://meetbriva.com/login` (logged out)
- A meeting page that has an attached calendar event (or any meeting)

### Script (read aloud, ~75 seconds)

> **(0:00 — homepage)** "This is Briva — an AI meeting-notes workspace
> that records, transcribes, summarises meetings, and emails recaps
> automatically. We're at meetbriva.com."
>
> **(0:08 — click Log in, sign in)** "I'll sign in to my account."
>
> **(0:18 — Settings page)** "I'll go to Settings, where I can connect
> Google Calendar. Briva uses Calendar read-only for two things:
> auto-linking recordings to the meeting they came from, and reading the
> attendee list so the AI recap email goes to the right people."
>
> **(0:35 — click Connect on the Google Calendar card)** "I'm sent to
> Google's standard OAuth consent screen."
>
> **(0:42 — Google consent screen visible — HOLD 4 SECONDS)** "Briva
> requests three scopes: my basic email, calendar events read-only, and
> OpenID. We never modify, create, or delete events."
>
> **(0:52 — click Allow)** "I approve, and I'm bounced back to Briva.
> The integration is now connected."
>
> **(1:00 — open a meeting with a linked calendar event)** "Here's a
> meeting where Briva auto-linked the recording to the calendar event.
> The recap email goes to the attendees on that invite."
>
> **(1:18)** "That's the full Google Calendar integration in Briva.
> Thanks for reviewing."

Stop recording.

### Upload

YouTube → upload → **Visibility: Unlisted**. Copy the URL.

### Frames the reviewer MUST see

| Frame | Where in your recording |
|---|---|
| Briva product live at `meetbriva.com` (URL bar visible) | 0:00 → 1:30, the whole time |
| Briva's app name + logo + scopes on the Google consent screen | 0:42, hold 4+ seconds |
| Connected state confirming integration is active | ~0:55 |

If you can't see all three clearly, re-record before submitting.

---

## 6. Submit

1. Audience tab → **Publish app** → confirm
2. Google opens the verification form → paste section 4 answers
3. Add the video URL from section 5
4. Submit

You'll get an automated confirmation email within minutes.

---

## 7. While you wait (2–4 weeks)

Verification status is shown on the **Policy compliance** tab. Two things
to keep an eye on:

1. **Email from `google-developer-trust@google.com`** — they ask follow-up
   questions inline. **Respond within 24 hours.** Slow replies = back of
   the queue.
2. **Status: Needs response** — same thing, surfaced in the UI.

### Should you flip to In production *now*, before verification?

**Yes** — recommended.

- Pros: real users can sign up; refresh tokens become permanent (vs 7-day
  expiry in Testing mode); 100-user cap is removed.
- Cons: users see *"Google hasn't verified this app"* warning →
  *Advanced → Go to Briva (unsafe)* to proceed. Most early users push
  through it; some don't.

Flip the switch immediately after submitting. The warning disappears the
moment Google approves.

---

## 8. Production housekeeping (not required for submission)

- **Quota**: default is ~10k OAuth flows/day per project. Only a problem
  at scale; ignore for now.
- **Client secret rotation**: do it annually.
- **`prompt=consent`** — currently always sent. After verification clears,
  consider dropping it on returning users to reduce re-consent friction
  (`apps/web/src/app/api/google/auth/start/route.ts:33`).

---

## TL;DR launch path

1. Branding tab — fill (section 1) · **10 min**
2. Authorized domains — add `meetbriva.com` · **1 min** *(needs Search Console domain verification first)*
3. Data access — confirm scopes (section 2) · **2 min**
4. Record + upload demo video (section 5) · **30 min**
5. Audience → Publish app → fill verification form (section 4) · **15 min**
6. Flip to In production publishing → live to all users with warning · **instant**
7. Verification approval → warning disappears · **2–4 weeks**

Total active time: ~1 hour.
