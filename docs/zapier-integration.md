# Zapier Integration Setup

Step-by-step for registering the Briva Zapier app. Do this once, after
applying migration `013_api_keys_and_zapier.sql` and deploying to Vercel.

## 1. Prerequisites

- Apply the migration:
  - Supabase Dashboard → SQL Editor → paste `supabase/migrations/013_api_keys_and_zapier.sql` → Run.
- Push the latest code to `main`. Vercel will redeploy automatically.
- Verify the production URL responds at `https://meetnotes-ochre.vercel.app`.

## 2. Create the Zapier integration

Go to https://developers.zapier.com/ and sign in. Click **Start a Zapier
Integration**.

- **Name:** Briva
- **Description:** AI meeting notes with bilingual transcription and live Q&A.
- **Intended audience:** Private (until ready to go public)
- **Role:** Choose what fits
- **Category:** Productivity

## 3. Authentication

- **Type:** API Key
- **Label:** Briva API key
- **Help text:** Generate in Briva → Settings → API Keys. The value starts with `briva_sk_`.
- **Key field name:** `apiKey`

In **Auth settings → Test**:
- **URL:** `https://meetnotes-ochre.vercel.app/api/zapier/auth`
- **Method:** GET
- **Headers:** `Authorization: Bearer {{bundle.authData.apiKey}}`
- **Connection Label:** `{{bundle.inputData.email}}` (pulled from the auth response)

## 4. Trigger — "New Meeting Completed" (REST Hook)

- **Key:** `new_meeting`
- **Noun:** Meeting
- **Description:** Fires when a Briva meeting finishes transcribing and summarising.

### Perform Subscribe
- **URL:** `https://meetnotes-ochre.vercel.app/api/zapier/subscribe`
- **Method:** POST
- **Headers:** `Authorization: Bearer {{bundle.authData.apiKey}}`
- **Body:** `{"target_url": "{{bundle.targetUrl}}"}`

### Perform Unsubscribe
- **URL:** `https://meetnotes-ochre.vercel.app/api/zapier/unsubscribe/{{bundle.subscribeData.id}}`
- **Method:** DELETE
- **Headers:** `Authorization: Bearer {{bundle.authData.apiKey}}`

### Perform List (sample data for the Zap editor)
- **URL:** `https://meetnotes-ochre.vercel.app/api/zapier/meetings`
- **Method:** GET
- **Headers:** `Authorization: Bearer {{bundle.authData.apiKey}}`

### Sample output (for Zapier to show users)
Zapier will auto-pull this from the List call. No need to define manually.

## 5. Submit for review

Once you've tested with a Zap in Zapier's invite-only mode:
- Zapier → **Versions** → **Promote to Production**
- Answer their review questions (docs, screenshots, support email).
- Takes ~1-2 weeks.

## 6. Link from Briva

After approval, add a "Connect to Zapier" button on the Settings page:
```tsx
<a href="https://zapier.com/apps/briva/integrations" target="_blank">
  Create Zaps with Briva →
</a>
```

## 7. Notes

- The `briva_sk_...` plaintext is shown ONCE at creation. If a user loses it, they must revoke and re-create.
- Webhook delivery is best-effort — failures are logged but not retried. If a
  Zap is turned off, Zapier returns 410 and we auto-prune the subscription.
- The `/api/zapier/meetings` endpoint returns up to 10 recent completed
  meetings for the authenticated user. Use it both for Zap editor samples
  and as a polling fallback.
