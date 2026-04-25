import { createClient } from '@/lib/supabase/server';
import { fanOutMeetingCompleted } from '@/lib/webhooks';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Manually fires the meeting.completed webhook fan-out for a meeting the
 * caller owns. Diagnostic only — useful when debugging Zapier integrations.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  await fanOutMeetingCompleted(user.id, id);
  return NextResponse.json({ ok: true, meetingId: id });
}
