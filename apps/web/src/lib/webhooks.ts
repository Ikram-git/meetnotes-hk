import { createClient as createAdminClient } from '@supabase/supabase-js';
import { buildZapierPayload } from '@/app/api/zapier/meetings/route';

/**
 * Fan out a "meeting.completed" event to every webhook subscription for
 * the given user. Fire-and-forget — failures are logged, not propagated
 * (Zap webhooks are best-effort).
 */
export async function fanOutMeetingCompleted(userId: string, meetingId: string): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: subs } = await admin
    .from('webhook_subscriptions')
    .select('id, target_url')
    .eq('user_id', userId)
    .eq('event_type', 'meeting.completed');
  if (!subs || subs.length === 0) return;

  const { data: meeting } = await admin
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();
  if (!meeting) return;
  const { data: summary } = await admin
    .from('summaries')
    .select('*')
    .eq('meeting_id', meetingId)
    .single();

  const payload = buildZapierPayload(meeting, summary || undefined);

  for (const sub of subs) {
    try {
      const res = await fetch(sub.target_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      // Zapier responds 410 Gone when a Zap is disabled — remove those subs.
      if (res.status === 410) {
        await admin.from('webhook_subscriptions').delete().eq('id', sub.id);
        console.log(`[webhooks] removed stale subscription ${sub.id}`);
      }
    } catch (err) {
      console.warn(
        `[webhooks] delivery failed for ${sub.target_url}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
