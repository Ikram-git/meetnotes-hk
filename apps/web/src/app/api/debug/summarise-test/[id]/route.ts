import { createClient } from '@/lib/supabase/server';
import { summariseMeeting } from '@/lib/ai/summarise';
import { formatTime } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Diagnostic endpoint — manually run summarisation for a specific meeting
 * and return the full result or the exact error. Requires auth.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: segments } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('segment_index', { ascending: true });

  if (!segments?.length) {
    return NextResponse.json({
      error: 'No transcript segments',
      meetingStatus: meeting.status,
      meetingErrorMessage: meeting.error_message,
    });
  }

  const transcriptText = segments
    .map(
      (s) =>
        `[${formatTime(s.start_time_ms)}] ${s.speaker_label || 'Unknown'}: ${s.text}`,
    )
    .join('\n');

  console.log(
    `[DebugSummarise] meeting=${meetingId} status=${meeting.status} segments=${segments.length} chars=${transcriptText.length}`,
  );

  try {
    const result = await summariseMeeting(transcriptText, {
      language: 'en',
      style: 'concise',
    });
    console.log(`[DebugSummarise] SUCCESS ${result.processing_time_ms}ms`);
    return NextResponse.json({
      status: 'success',
      meetingStatus: meeting.status,
      transcriptChars: transcriptText.length,
      segmentCount: segments.length,
      processing_time_ms: result.processing_time_ms,
      usage: result.usage,
      overview: result.overview,
      topics: result.topics,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error(`[DebugSummarise] FAILED:`, msg, stack);
    return NextResponse.json({
      status: 'error',
      meetingStatus: meeting.status,
      transcriptChars: transcriptText.length,
      segmentCount: segments.length,
      error: msg,
      stack,
    });
  }
}
