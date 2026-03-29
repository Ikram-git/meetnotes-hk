import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: meeting } = await supabase
    .from('meetings').select('id').eq('id', meetingId).eq('user_id', user.id).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { updates } = await req.json();
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  // Update each segment
  for (const { id, text } of updates) {
    const { error } = await supabase
      .from('transcript_segments')
      .update({ text })
      .eq('id', id)
      .eq('meeting_id', meetingId);

    if (error) {
      return NextResponse.json({ error: `Failed to update segment ${id}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, updated: updates.length });
}
