import { authenticateApiKey } from '@/lib/api-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns a list of the user's recent completed meetings, joined with their
 * summary. Used as both (1) a "sample data" source for Zapier's Zap editor
 * and (2) the polling fallback if REST Hooks fail.
 */
export async function GET(req: NextRequest) {
  const userId = await authenticateApiKey(req);
  if (!userId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: meetings } = await admin
    .from('meetings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!meetings || meetings.length === 0) return NextResponse.json([]);

  const ids = meetings.map((m) => m.id);
  const { data: summaries } = await admin
    .from('summaries')
    .select('*')
    .in('meeting_id', ids);

  const sumMap = new Map((summaries || []).map((s) => [s.meeting_id, s]));
  const payload = meetings.map((m) => buildZapierPayload(m, sumMap.get(m.id)));
  return NextResponse.json(payload);
}

function buildZapierPayload(m: Record<string, unknown>, s: Record<string, unknown> | undefined) {
  return {
    id: m.id as string,
    title: (m.title as string) || 'Untitled Meeting',
    created_at: m.created_at as string,
    duration_seconds: (m.audio_duration_seconds as number) || 0,
    source: m.source as string,
    google_event_id: (m.google_event_id as string) || null,
    google_event_summary: (m.google_event_summary as string) || null,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meetnotes-ochre.vercel.app'}/meetings/${m.id}`,
    summary: s ? {
      overview: (s.overview as string) || null,
      summary_text: (s.summary_text as string) || null,
      key_points: (s.key_points as unknown[]) || [],
      action_items: (s.action_items as unknown[]) || [],
      topics: (s.topics as unknown[]) || [],
      sentiment: (s.sentiment as string) || null,
    } : null,
  };
}

export { buildZapierPayload };
