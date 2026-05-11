import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { fetchUpcomingEvents, refreshAccessToken } from '@/lib/outlook/client';
import { NextResponse } from 'next/server';

/**
 * Returns the user's upcoming Outlook calendar events. Refreshes the
 * access token on the fly if it has expired and persists the new one.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('outlook_integrations')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ connected: false, events: [] });
  }

  let accessToken = integration.access_token as string;
  const expiresAt = new Date(integration.expires_at as string).getTime();

  // Refresh if expired or expiring within 5 minutes.
  if (Date.now() >= expiresAt - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(integration.refresh_token as string);
      accessToken = refreshed.access_token;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
        await admin
          .from('outlook_integrations')
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token || integration.refresh_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Outlook] refresh failed:', msg);
      return NextResponse.json(
        { connected: true, email: integration.email, error: 'refresh_failed', events: [] },
        { status: 500 },
      );
    }
  }

  try {
    const items = await fetchUpcomingEvents(accessToken);
    const events = items.map((e) => ({
      id: e.id,
      summary: e.subject || '(no title)',
      start: e.start?.dateTime ? new Date(e.start.dateTime + 'Z').toISOString() : null,
      end: e.end?.dateTime ? new Date(e.end.dateTime + 'Z').toISOString() : null,
      joinUrl: e.onlineMeeting?.joinUrl || null,
      attendees: (e.attendees || [])
        .map((a) => ({
          email: a.emailAddress?.address,
          name: a.emailAddress?.name,
        }))
        .filter((a) => !!a.email),
    }));
    return NextResponse.json({ connected: true, email: integration.email, events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Outlook] events fetch failed:', msg);
    return NextResponse.json({ connected: true, error: msg, events: [] }, { status: 500 });
  }
}
