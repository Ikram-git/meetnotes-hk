import { createClient } from '@/lib/supabase/server';
import { generatePdfHtml } from '@/lib/export/pdf';
import { NextRequest, NextResponse } from 'next/server';

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
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fetch meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) {
    return new NextResponse('Meeting not found', { status: 404 });
  }

  // Fetch summary
  const { data: summary } = await supabase
    .from('summaries')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!summary) {
    return new NextResponse('No summary available', { status: 404 });
  }

  // Fetch segments
  const { data: segments } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('segment_index', { ascending: true });

  // Fetch speaker mappings
  const { data: mappings } = await supabase
    .from('speaker_mappings')
    .select('*')
    .eq('meeting_id', meetingId);

  const speakerMap: Record<string, string> = {};
  for (const m of mappings || []) {
    speakerMap[m.speaker_label] = m.speaker_name;
  }

  const html = generatePdfHtml({
    meeting: {
      title: meeting.title,
      created_at: meeting.created_at,
      audio_duration_seconds: meeting.audio_duration_seconds,
    },
    summary: {
      overview: (summary as any).overview,
      overview_zh: (summary as any).overview_zh,
      summary_text: summary.summary_text,
      summary_text_zh: summary.summary_text_zh,
      key_points: ((summary as any).key_points as any[]) || [],
      action_items: (summary.action_items as any[]) || [],
      topics: (summary.topics as any[]) || [],
      sentiment: summary.sentiment,
    },
    segments: (segments || []).map((s) => ({
      speaker_label: s.speaker_label,
      start_time_ms: s.start_time_ms,
      text: s.text,
    })),
    speakerMap,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
