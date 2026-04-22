import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOAuthClientFromTokens } from './client';
import { google } from 'googleapis';

/**
 * Find a single calendar event overlapping `at` within +/- windowMin minutes.
 * Uses the caller's stored tokens; rotates + persists on refresh.
 * Returns null if the user isn't connected or no event matches.
 */
export async function findNearbyCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  origin: string,
  at: Date = new Date(),
  windowMin: number = 15,
): Promise<{
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: string[];
} | null> {
  const { data: integration } = await supabase
    .from('google_integrations')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!integration) return null;

  try {
    const redirectUri = `${origin}/api/google/auth/callback`;
    const client = buildOAuthClientFromTokens(
      redirectUri,
      integration.access_token,
      integration.refresh_token,
    );
    let rotated: { access_token?: string; expiry_date?: number } | null = null;
    client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        rotated = {
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date ?? undefined,
        };
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: client });
    const min = new Date(at.getTime() - windowMin * 60 * 1000).toISOString();
    const max = new Date(at.getTime() + windowMin * 60 * 1000).toISOString();
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: min,
      timeMax: max,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    if (rotated) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
        );
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
          .eq('user_id', userId);
      }
    }

    // Pick the event whose start is closest to `at`.
    const items = (data.items || []).filter((e) => e.start && (e.start.dateTime || e.start.date));
    if (items.length === 0) return null;
    items.sort((a, b) => {
      const aStart = new Date(a.start!.dateTime || a.start!.date!).getTime();
      const bStart = new Date(b.start!.dateTime || b.start!.date!).getTime();
      return Math.abs(aStart - at.getTime()) - Math.abs(bStart - at.getTime());
    });
    const best = items[0];
    return {
      id: best.id!,
      summary: best.summary || '(no title)',
      start: best.start!.dateTime || best.start!.date!,
      end: best.end?.dateTime || best.end?.date || best.start!.dateTime || best.start!.date!,
      attendees: (best.attendees || []).map((a) => a.email!).filter(Boolean),
    };
  } catch (err) {
    console.warn('[findNearbyCalendarEvent]', err instanceof Error ? err.message : err);
    return null;
  }
}
