import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (meeting.share_password && meeting.share_password !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [segmentsResult, summaryResult, mappingsResult] = await Promise.all([
    supabase.from('transcript_segments').select('*').eq('meeting_id', meeting.id).order('segment_index', { ascending: true }),
    supabase.from('summaries').select('*').eq('meeting_id', meeting.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('speaker_mappings').select('speaker_label, speaker_name').eq('meeting_id', meeting.id),
  ]);

  const speakerMap: Record<string, string> = {};
  for (const m of (mappingsResult.data || [])) speakerMap[m.speaker_label] = m.speaker_name;

  // Don't expose the password
  const { share_password, ...safeMeeting } = meeting;

  return NextResponse.json({
    meeting: safeMeeting,
    segments: segmentsResult.data || [],
    summary: summaryResult.data,
    speakerMap,
  });
}
