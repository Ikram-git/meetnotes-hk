import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-demand deletion of the raw audio file for a single meeting.
 * Transcript, summary, tasks, and comments are preserved.
 *
 * Authorisation: workspace membership is enforced by RLS when we look
 * up the meeting via the cookie-bound client. The admin client is
 * only used for the storage / update side-effects after that check
 * passes.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS scopes this to meetings in the caller's workspace.
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, audio_storage_path, audio_deleted_at')
    .eq('id', meetingId)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }
  if (!meeting.audio_storage_path) {
    return NextResponse.json({ ok: true, alreadyDeleted: true });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: rmError } = await admin.storage
    .from('meeting-audio')
    .remove([meeting.audio_storage_path]);
  if (rmError && !rmError.message?.toLowerCase().includes('not found')) {
    return NextResponse.json({ error: rmError.message }, { status: 500 });
  }

  await admin
    .from('meetings')
    .update({
      audio_storage_path: null,
      audio_deleted_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  return NextResponse.json({ ok: true });
}
