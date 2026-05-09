import { createClient } from '@/lib/supabase/server';
import { getSTTProvider } from '@/lib/stt';
import { summariseMeeting } from '@/lib/ai/summarise';
import { formatTime } from '@/lib/utils';
import { fanOutMeetingCompleted } from '@/lib/webhooks';
import { indexMeetingForChat } from '@/lib/ai/index-meeting';
import { identifyAndSaveSpeakers } from '@/lib/ai/identify-speakers';
import { promoteActionItemsToTasks } from '@/lib/tasks/promote';
import { sendAutoRecapIfEnabled } from '@/lib/email/auto-recap';
import { getGates } from '@/lib/billing/gates';
import { NextRequest, NextResponse, after } from 'next/server';

// Transcription (5-40s) + summarisation (5-15s) run back-to-back.
export const maxDuration = 300;

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
  console.log(`[Transcribe] received request for meeting ${meetingId}`);

  // Get meeting (RLS scopes to user's workspaces)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
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

    // Pull workspace's custom vocabulary so the transcriber stops mangling
    // names/jargon. Best-effort — if the lookup fails, we transcribe
    // without keyword boosting rather than failing the whole pipeline.
    let vocabularyTerms: string[] = [];
    if (meeting.workspace_id) {
      const { data: vocab } = await supabase
        .from('workspace_vocabulary')
        .select('term')
        .eq('workspace_id', meeting.workspace_id);
      vocabularyTerms = (vocab ?? [])
        .map((v) => v.term as string)
        .filter((t): t is string => !!t);
    }

    // Transcribe
    const provider = getSTTProvider();
    console.log(`[Transcribe] Starting transcription for meeting ${meetingId}`);
    const result = await provider.transcribe(signedUrl.signedUrl, {
      languages: ['en', 'yue-Hant-HK'],
      enableDiarisation: true,
      keywords: vocabularyTerms,
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

    if (segments.length === 0) {
      await supabase
        .from('meetings')
        .update({
          status: 'error',
          stt_provider: provider.name,
          audio_duration_seconds: Math.round(result.durationMs / 1000),
          error_message:
            'No speech detected in audio. The recording may be silent, music-only, or below Deepgram\u2019s transcription threshold. Try recording again with clearer speech.',
        })
        .eq('id', meetingId);
      console.log(`[Transcribe] No speech detected for meeting ${meetingId}, marking as error`);
      return NextResponse.json({
        status: 'error',
        error: 'No speech detected in audio',
      });
    }

    // Per-meeting duration cap (Basic: 60 min, Pro: 180, Team: 240).
    const durationSeconds = Math.round(result.durationMs / 1000);
    const { data: tierProfile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const gates = getGates(tierProfile?.subscription_tier);
    if (gates.perMeetingMinutes !== null && durationSeconds > gates.perMeetingMinutes * 60) {
      const capMins = gates.perMeetingMinutes;
      const fileMins = Math.round(durationSeconds / 60);
      await supabase
        .from('meetings')
        .update({
          status: 'error',
          stt_provider: provider.name,
          audio_duration_seconds: durationSeconds,
          error_message: `This recording is ${fileMins} min \u2014 your plan caps meetings at ${capMins} min. Upgrade in Settings \u2192 Billing to process longer meetings.`,
        })
        .eq('id', meetingId);
      console.log(`[Transcribe] Meeting ${meetingId} (${fileMins} min) over ${capMins}-min cap, rejecting`);
      return NextResponse.json(
        {
          status: 'error',
          error: `Plan caps meetings at ${capMins} minutes`,
        },
        { status: 402 },
      );
    }

    await supabase.from('transcript_segments').insert(segments);

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

    // Workspace-level minute pool: increment the workspace's counter so
    // members share the same monthly bucket.
    const minutesUsed = Math.ceil(result.durationMs / 60000);
    if (minutesUsed > 0) {
      if (meeting.workspace_id) {
        await supabase.rpc('increment_workspace_minutes', {
          ws_id: meeting.workspace_id,
          minutes: minutesUsed,
        });
      }
      // Mirror on profile too — keep per-user counter for UI/admin views.
      await supabase.rpc('increment_minutes_used', {
        user_id: user.id,
        minutes: minutesUsed,
      });
    }

    // Run summarisation directly in this same function call — no HTTP
    // fire-and-forget, no client-side trigger. Same process, reliable.
    console.log(`[Transcribe] Transcription done, starting summarisation for ${meetingId}`);
    await supabase
      .from('meetings')
      .update({ status: 'summarising' })
      .eq('id', meetingId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language, preferred_summary_style')
      .eq('id', user.id)
      .single();

    const transcriptText = segments
      .map((s) => `[${formatTime(s.start_time_ms)}] ${s.speaker_label || 'Unknown'}: ${s.text}`)
      .join('\n');

    const summaryLanguage = profile?.preferred_language || 'en';
    const summaryStyle = (profile?.preferred_summary_style as 'concise' | 'detailed' | 'bullet') || 'concise';
    console.log(`[Summarise] Starting for ${meetingId}: ${segments.length} segments, ${transcriptText.length} chars, lang=${summaryLanguage}`);

    const summaryResult = await summariseMeeting(transcriptText, {
      language: summaryLanguage,
      style: summaryStyle,
    });
    console.log(`[Summarise] Done for ${meetingId}: ${summaryResult.processing_time_ms}ms, ${summaryResult.usage.input_tokens}in/${summaryResult.usage.output_tokens}out`);

    await supabase.from('summaries').delete().eq('meeting_id', meetingId);
    await supabase.from('summaries').insert({
      meeting_id: meetingId,
      overview: summaryResult.overview,
      overview_zh: summaryResult.overview_zh,
      summary_text: summaryResult.summary,
      summary_text_zh: summaryResult.summary_zh,
      key_points: summaryResult.key_points || [],
      key_decisions: [],
      action_items: summaryResult.action_items,
      key_quotes: summaryResult.key_quotes,
      topics: summaryResult.topics,
      sentiment: summaryResult.sentiment,
      model_used: 'claude-sonnet-4-6',
      prompt_version: 'v2.0',
      input_tokens: summaryResult.usage.input_tokens,
      output_tokens: summaryResult.usage.output_tokens,
      processing_time_ms: summaryResult.processing_time_ms,
    });

    const title = summaryResult.topics.length > 0
      ? summaryResult.topics.map((t) => t.name).slice(0, 3).join(', ')
      : 'Untitled Meeting';

    await supabase
      .from('meetings')
      .update({ status: 'completed', title, error_message: null })
      .eq('id', meetingId);

    console.log(`[Summarise] Completed for ${meetingId}: "${title}"`);
    // after() defers the fan-out until after the response is sent. Vercel
    // keeps the function alive for the callback, so the POST to Zapier
    // actually completes — but the client doesn't wait on it.
    after(async () => {
      console.log(`[after-transcribe] starting post-summary chain for ${meetingId}`);
      try {
        await fanOutMeetingCompleted(user.id, meetingId);
      } catch (e) {
        console.warn('[Transcribe] webhook fan-out failed:', e instanceof Error ? e.message : e);
      }
      try {
        await indexMeetingForChat(supabase, meetingId);
      } catch (e) {
        console.warn('[after-transcribe] index failed:', e instanceof Error ? e.message : e);
      }
      try {
        await identifyAndSaveSpeakers(supabase, meetingId);
      } catch (e) {
        console.warn('[after-transcribe] identify failed:', e instanceof Error ? e.message : e);
      }
      try {
        await promoteActionItemsToTasks(supabase, meetingId);
      } catch (e) {
        console.warn('[after-transcribe] promote failed:', e instanceof Error ? e.message : e);
      }
      try {
        await sendAutoRecapIfEnabled(supabase, meetingId);
      } catch (e) {
        console.warn('[after-transcribe] auto-recap failed:', e instanceof Error ? e.message : e);
      }
      console.log(`[after-transcribe] DONE for ${meetingId}`);
    });
    return NextResponse.json({
      status: 'completed',
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
