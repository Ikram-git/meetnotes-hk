import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET speaker mappings for a meeting
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mappings } = await supabase
    .from('speaker_mappings')
    .select('*')
    .eq('meeting_id', meetingId);

  return NextResponse.json(mappings || []);
}

// PUT (upsert) a speaker mapping
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { speakerLabel, speakerName } = await req.json();

  if (!speakerLabel || !speakerName) {
    return NextResponse.json(
      { error: 'speakerLabel and speakerName required' },
      { status: 400 }
    );
  }

  // Verify user owns the meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('speaker_mappings')
    .upsert(
      {
        meeting_id: meetingId,
        speaker_label: speakerLabel,
        speaker_name: speakerName,
      },
      { onConflict: 'meeting_id,speaker_label' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
