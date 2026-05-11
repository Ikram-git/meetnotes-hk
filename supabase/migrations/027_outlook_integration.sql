-- ============================================================
-- Outlook / Microsoft 365 Calendar integration
-- ============================================================
-- Mirrors google_integrations: one row per user with the
-- OAuth tokens needed to read their calendar via Microsoft Graph.
-- Adds outlook_event_id columns to meetings so the auto-recap +
-- live-finalisation flow can link recordings to Outlook events the
-- same way they link to Google ones.

CREATE TABLE IF NOT EXISTS public.outlook_integrations (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ms_oid         text,              -- Microsoft object ID (stable user identifier)
  email          text,
  access_token   text NOT NULL,
  refresh_token  text NOT NULL,
  expires_at     timestamptz NOT NULL,
  scopes         text[],
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outlook_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own outlook integration"
  ON public.outlook_integrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own outlook integration"
  ON public.outlook_integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own outlook integration"
  ON public.outlook_integrations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own outlook integration"
  ON public.outlook_integrations FOR DELETE
  USING (user_id = auth.uid());

-- Allow linking a meeting to a specific Outlook calendar event.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS outlook_event_id text,
  ADD COLUMN IF NOT EXISTS outlook_event_summary text,
  ADD COLUMN IF NOT EXISTS outlook_event_start timestamptz;

CREATE INDEX IF NOT EXISTS meetings_outlook_event_id_idx
  ON public.meetings (outlook_event_id) WHERE outlook_event_id IS NOT NULL;
