import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnostic: force a stuck meeting into 'error' state so the UI can
 * show the error banner + Regenerate button. Useful for cleanup after
 * the old transcribe behaviour left meetings in a dead 'transcribed'
 * state with zero segments.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, status')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'error',
      error_message: 'No speech detected in audio (recovered from stuck state).',
    })
    .eq('id', meetingId);

  if (error) return NextResponse.json({ error: error.message });
  return NextResponse.json({ ok: true, previousStatus: meeting.status });
}
