import { createClient } from '@/lib/supabase/server';
import { getSTTProvider } from '@/lib/stt';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Try cookie auth first (web app), then Bearer token (extension)
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { meetingId } = await req.json();

  // Get meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  // Update status
  await supabase
    .from('meetings')
    .update({ status: 'transcribing' })
    .eq('id', meetingId);

  try {
    // Get signed URL for audio file
    const { data: signedUrl } = await supabase.storage
      .from('meeting-audio')
      .createSignedUrl(meeting.audio_storage_path!, 3600);

    if (!signedUrl?.signedUrl) {
      throw new Error('Failed to get signed URL');
    }

    // Transcribe
    const provider = getSTTProvider();
    console.log(`[Transcribe] Starting transcription for meeting ${meetingId}`);
    const result = await provider.transcribe(signedUrl.signedUrl, {
      languages: ['en', 'yue-Hant-HK'],
      enableDiarisation: true,
    });
    console.log(`[Transcribe] Done: ${result.segments.length} segments, ${result.durationMs}ms duration`);

    // Store segments
    const segments = result.segments.map((seg, i) => ({
      meeting_id: meetingId,
      segment_index: i,
      speaker_label: seg.speakerLabel,
      start_time_ms: seg.startTimeMs,
      end_time_ms: seg.endTimeMs,
      text: seg.text,
      language: seg.language,
      confidence: seg.confidence,
    }));

    if (segments.length > 0) {
      await supabase.from('transcript_segments').insert(segments);
    }

    // Update meeting
    await supabase
      .from('meetings')
      .update({
        status: 'transcribed',
        stt_provider: provider.name,
        detected_languages: result.detectedLanguages,
        audio_duration_seconds: Math.round(result.durationMs / 1000),
      })
      .eq('id', meetingId);

    // Update user's minutes used
    const minutesUsed = Math.ceil(result.durationMs / 60000);
    if (minutesUsed > 0) {
      await supabase.rpc('increment_minutes_used', {
        user_id: user.id,
        minutes: minutesUsed,
      });
    }

    // Auto-trigger summarisation — forward whichever auth the request used
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const triggerHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const cookie = req.headers.get('cookie');
    const authorization = req.headers.get('authorization');
    if (cookie) triggerHeaders['Cookie'] = cookie;
    if (authorization) triggerHeaders['Authorization'] = authorization;
    fetch(`${appUrl}/api/meetings/${meetingId}/summarise`, {
      method: 'POST',
      headers: triggerHeaders,
    }).catch(console.error);

    return NextResponse.json({
      status: 'transcribed',
      segmentCount: segments.length,
    });
  } catch (error) {
    await supabase
      .from('meetings')
      .update({
        status: 'error',
        error_message:
          error instanceof Error ? error.message : 'Transcription failed',
      })
      .eq('id', meetingId);

    console.error(`[Transcribe] Failed for meeting ${meetingId}:`, error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
