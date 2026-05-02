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
    .from('meetings').select('id').eq('id', meetingId).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const body = await req.json();

  const { data: existing } = await supabase
    .from('summaries').select('id')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!existing) return NextResponse.json({ error: 'No summary to edit' }, { status: 404 });

  const { error } = await supabase
    .from('summaries')
    .update({
      overview: body.overview ?? null,
      overview_zh: body.overview_zh ?? null,
      summary_text: body.summary_text,
      summary_text_zh: body.summary_text_zh,
      key_points: body.key_points ?? [],
      action_items: body.action_items,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return updated summary
  const { data: updated } = await supabase
    .from('summaries').select('*').eq('id', existing.id).single();

  return NextResponse.json(updated);
}
