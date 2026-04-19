import { createClient } from '@/lib/supabase/server';
import { getSTTProvider } from '@/lib/stt';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Diagnostic endpoint — re-run transcription for an existing meeting and
 * return raw Deepgram output so we can see what's happening.
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
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: signedUrl } = await supabase.storage
    .from('meeting-audio')
    .createSignedUrl(meeting.audio_storage_path!, 3600);

  if (!signedUrl?.signedUrl) {
    return NextResponse.json({ error: 'Failed to get signed URL', meeting });
  }

  // Fetch audio and report actual byte size
  let audioSize = -1;
  try {
    const headRes = await fetch(signedUrl.signedUrl, { method: 'HEAD' });
    audioSize = Number(headRes.headers.get('content-length') || -1);
  } catch {}

  try {
    const provider = getSTTProvider();
    console.log(`[DebugRetranscribe] meeting=${meetingId} starting with ${provider.name}`);
    const result = await provider.transcribe(signedUrl.signedUrl, {
      languages: ['en', 'yue-Hant-HK'],
      enableDiarisation: true,
    });
    console.log(`[DebugRetranscribe] segments=${result.segments.length} duration=${result.durationMs}ms`);

    const raw: any = result.rawResponse;
    const alt0 = raw?.results?.channels?.[0]?.alternatives?.[0];
    return NextResponse.json({
      status: 'success',
      meetingPath: meeting.audio_storage_path,
      audioSize,
      provider: provider.name,
      durationMs: result.durationMs,
      segmentCount: result.segments.length,
      detectedLanguages: result.detectedLanguages,
      utterancesCount: raw?.results?.utterances?.length ?? 0,
      channelsCount: raw?.results?.channels?.length ?? 0,
      alt0TranscriptLength: alt0?.transcript?.length ?? 0,
      alt0TranscriptPreview: alt0?.transcript?.slice(0, 300) ?? null,
      alt0WordsCount: alt0?.words?.length ?? 0,
      metadataDuration: raw?.metadata?.duration,
      modelInfo: raw?.metadata?.model_info,
      channel0Info: raw?.results?.channels?.[0] ? {
        detected_language: raw.results.channels[0].detected_language,
        language_confidence: raw.results.channels[0].language_confidence,
      } : null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[DebugRetranscribe] FAILED:', msg);
    return NextResponse.json({
      status: 'error',
      audioSize,
      audioPath: meeting.audio_storage_path,
      error: msg,
    });
  }
}
