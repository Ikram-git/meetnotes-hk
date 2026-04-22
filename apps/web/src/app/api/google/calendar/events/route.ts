import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { buildOAuthClientFromTokens, getRedirectUri } from '@/lib/google/client';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the user's upcoming Google Calendar events. Refreshes the access
 * token on the fly via google-auth-library and persists it back to the DB
 * if it rotated.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!integration) {
    return NextResponse.json({ connected: false, events: [] });
  }

  try {
    const redirectUri = getRedirectUri(req);
    const client = buildOAuthClientFromTokens(
      redirectUri,
      integration.access_token,
      integration.refresh_token,
    );

    // google-auth-library will refresh the token automatically when needed.
    // Listen for rotations and persist.
    let rotated: { access_token?: string; expiry_date?: number } | null = null;
    client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        rotated = { access_token: tokens.access_token, expiry_date: tokens.expiry_date ?? undefined };
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: client });
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: list } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: in24h.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 25,
    });

    if (rotated) {
      // Use service role because the user's row might have been modified by
      // the oauth library mid-request; we want an unconditional write.
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        const r = rotated as { access_token?: string; expiry_date?: number };
        await admin
          .from('google_integrations')
          .update({
            access_token: r.access_token,
            expires_at: r.expiry_date
              ? new Date(r.expiry_date).toISOString()
              : new Date(Date.now() + 55 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
    }

    const events = (list.items || []).map((e) => ({
      id: e.id,
      summary: e.summary || '(no title)',
      description: e.description || null,
      start: e.start?.dateTime || e.start?.date || null,
      end: e.end?.dateTime || e.end?.date || null,
      hangoutLink: e.hangoutLink || null,
      conferenceLink: e.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri || null,
      attendees: (e.attendees || []).map((a) => ({ email: a.email, name: a.displayName })),
    }));

    return NextResponse.json({ connected: true, email: integration.email, events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GoogleCalendar] fetch failed:', msg);
    return NextResponse.json({ connected: true, error: msg, events: [] }, { status: 500 });
  }
}
