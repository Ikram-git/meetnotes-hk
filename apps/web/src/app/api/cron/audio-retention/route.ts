import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Daily sweep that enforces each workspace's audio retention policy:
 *   - 'keep'                       — no-op
 *   - 'delete_after_processing'    — delete audio for any completed
 *                                    meeting whose audio_storage_path
 *                                    is still set
 *   - 'delete_after_7_days'        — delete audio older than 7 days
 *   - 'delete_after_30_days'       — delete audio older than 30 days
 *
 * Transcript, summary, and tasks are preserved in every case — only
 * the raw audio file is removed.
 */

interface MeetingRow {
  id: string;
  workspace_id: string;
  status: string;
  created_at: string;
  audio_storage_path: string | null;
  audio_deleted_at: string | null;
}

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') !== null;
  const auth = req.headers.get('authorization');
  const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  const isAuthorized = isVercelCron || (expectedAuth && auth === expectedAuth);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Pull every non-'keep' workspace + the meetings in them. Even at
  // 10k meetings per workspace this is cheap because we only care
  // about ones still holding audio.
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, audio_retention')
    .neq('audio_retention', 'keep');

  if (!workspaces || workspaces.length === 0) {
    return NextResponse.json({ swept: 0, deleted: 0 });
  }

  const now = Date.now();
  let totalDeleted = 0;
  let totalSwept = 0;
  let totalErrors = 0;

  for (const ws of workspaces) {
    const policy = ws.audio_retention as
      | 'delete_after_processing'
      | 'delete_after_7_days'
      | 'delete_after_30_days';

    const { data: meetings } = await admin
      .from('meetings')
      .select('id, workspace_id, status, created_at, audio_storage_path, audio_deleted_at')
      .eq('workspace_id', ws.id)
      .is('audio_deleted_at', null)
      .not('audio_storage_path', 'is', null);

    if (!meetings || meetings.length === 0) continue;

    const candidates = (meetings as MeetingRow[]).filter((m) => {
      if (!m.audio_storage_path) return false;
      if (policy === 'delete_after_processing') {
        return m.status === 'completed';
      }
      const ageMs = now - new Date(m.created_at).getTime();
      const minAgeMs = policy === 'delete_after_7_days' ? 7 * 86400_000 : 30 * 86400_000;
      return ageMs >= minAgeMs;
    });

    totalSwept += candidates.length;

    for (const m of candidates) {
      try {
        const { error: rmError } = await admin.storage
          .from('meeting-audio')
          .remove([m.audio_storage_path!]);
        if (rmError && !rmError.message?.toLowerCase().includes('not found')) {
          throw new Error(rmError.message);
        }
        await admin
          .from('meetings')
          .update({
            audio_storage_path: null,
            audio_deleted_at: new Date().toISOString(),
          })
          .eq('id', m.id);
        totalDeleted += 1;
      } catch (err) {
        totalErrors += 1;
        console.warn(
          `[cron/audio-retention] delete failed for meeting ${m.id.slice(0, 8)}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return NextResponse.json({
    workspaces: workspaces.length,
    swept: totalSwept,
    deleted: totalDeleted,
    errors: totalErrors,
  });
}
