import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Enforce the workspace audio-retention policy immediately after a
 * meeting finishes processing. Currently handles the
 * `delete_after_processing` case — the 7-day and 30-day variants are
 * left for the daily cron at /api/cron/audio-retention.
 *
 * Best-effort: failures are logged but never throw, so they can't
 * fail the user-facing transcribe response.
 */
export async function enforceRetentionOnComplete(meetingId: string): Promise<void> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data: meeting } = await admin
      .from('meetings')
      .select('id, workspace_id, audio_storage_path, audio_deleted_at')
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting?.audio_storage_path || meeting.audio_deleted_at) return;

    const { data: ws } = await admin
      .from('workspaces')
      .select('audio_retention')
      .eq('id', meeting.workspace_id)
      .maybeSingle();
    if (ws?.audio_retention !== 'delete_after_processing') return;

    const { error: rmError } = await admin.storage
      .from('meeting-audio')
      .remove([meeting.audio_storage_path]);
    if (rmError && !rmError.message?.toLowerCase().includes('not found')) {
      throw new Error(rmError.message);
    }

    await admin
      .from('meetings')
      .update({
        audio_storage_path: null,
        audio_deleted_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    console.log(`[retention] audio deleted on completion for ${meetingId.slice(0, 8)}`);
  } catch (err) {
    console.warn(
      `[retention] enforce-on-complete failed for ${meetingId.slice(0, 8)}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
