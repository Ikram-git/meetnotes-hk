import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { summariseMeeting } from '@/lib/ai/summarise';
import { formatTime } from '@/lib/utils';
import { findNearbyCalendarEvent } from '@/lib/google/events';
import { fanOutMeetingCompleted } from '@/lib/webhooks';
import { indexMeetingForChat } from '@/lib/ai/index-meeting';
import { identifyAndSaveSpeakers } from '@/lib/ai/identify-speakers';
import { promoteActionItemsToTasks } from '@/lib/tasks/promote';
import { sendAutoRecapIfEnabled } from '@/lib/email/auto-recap';
import { getGates } from '@/lib/billing/gates';
import { NextRequest, NextResponse, after } from 'next/server';

export const maxDuration = 300;

interface LiveLine {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string | null;
}

interface LiveChatMessage {
  role: 'user' | 'assistant';
  content: string;
  transcriptLengthAtAsk?: number;
}

/**
 * Finalise a live-captured meeting: create meeting row, insert transcript
 * segments from the frontend-captured Deepgram stream (no re-transcription),
 * run summarisation inline, return the meeting id.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lines: LiveLine[] = Array.isArray(body.lines) ? body.lines : [];
  const chatMessages: LiveChatMessage[] = Array.isArray(body.chat) ? body.chat : [];
  const durationSeconds: number = typeof body.durationSeconds === 'number' ? body.durationSeconds : 0;
  const detectedLanguages: string[] = Array.isArray(body.detectedLanguages)
    ? body.detectedLanguages
    : ['en'];

  if (lines.length === 0) {
    return NextResponse.json({ error: 'No transcript lines to save' }, { status: 400 });
  }

  // Per-meeting duration cap.
  const { data: tierProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  const gates = getGates(tierProfile?.subscription_tier);
  if (gates.perMeetingMinutes !== null && durationSeconds > gates.perMeetingMinutes * 60) {
    return NextResponse.json(
      {
        error: `Your plan caps meetings at ${gates.perMeetingMinutes} minutes. Upgrade in Settings → Billing to record longer meetings.`,
      },
      { status: 402 },
    );
  }

  // Try to auto-link to a calendar event happening around now (±15 min).
  // Non-fatal if the user hasn't connected Google or nothing matches.
  const origin = new URL(req.url).origin;
  const explicitEventId: string | null =
    typeof body.googleEventId === 'string' ? body.googleEventId : null;
  const nearbyEvent = explicitEventId
    ? null
    : await findNearbyCalendarEvent(supabase, user.id, origin);
  const googleEventId = explicitEventId || nearbyEvent?.id || null;
  const googleEventSummary = nearbyEvent?.summary || null;
  const googleEventStart = nearbyEvent?.start || null;

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      source: 'upload',
      status: 'summarising',
      audio_storage_path: `live/${crypto.randomUUID()}.none`,
      audio_format: 'none',
      audio_size_bytes: 0,
      audio_duration_seconds: Math.round(durationSeconds),
      stt_provider: 'deepgram-stream',
      detected_languages: detectedLanguages,
      google_event_id: googleEventId,
      google_event_summary: googleEventSummary,
      google_event_start: googleEventStart,
    })
    .select()
    .single();

  if (meetingError || !meeting) {
    console.error('[FinaliseLive] failed to create meeting', meetingError);
    return NextResponse.json(
      { error: meetingError?.message || 'Failed to create meeting' },
      { status: 500 },
    );
  }

  const segments = lines.map((l, i) => ({
    meeting_id: meeting.id,
    segment_index: i,
    speaker_label: l.speaker || 'Speaker 0',
    start_time_ms: Math.round(l.startMs),
    end_time_ms: Math.round(l.endMs),
    text: l.text,
    language: detectedLanguages[0] || 'en',
    confidence: 0.9,
  }));

  const { error: segError } = await supabase.from('transcript_segments').insert(segments);
  if (segError) {
    console.error('[FinaliseLive] failed to insert segments', segError);
    await supabase
      .from('meetings')
      .update({ status: 'error', error_message: `Failed to save transcript: ${segError.message}` })
      .eq('id', meeting.id);
    return NextResponse.json({ error: segError.message }, { status: 500 });
  }

  console.log(`[FinaliseLive] saved ${segments.length} segments for meeting ${meeting.id}`);

  if (chatMessages.length > 0) {
    const chatRows = chatMessages.map((m, i) => ({
      meeting_id: meeting.id,
      role: m.role,
      content: m.content,
      turn_index: i,
      transcript_length_at_ask: m.transcriptLengthAtAsk ?? null,
    }));
    const { error: chatError } = await supabase.from('meeting_chats').insert(chatRows);
    if (chatError) {
      console.warn(`[FinaliseLive] chat persist failed: ${chatError.message}`);
    } else {
      console.log(`[FinaliseLive] saved ${chatRows.length} chat messages`);
    }
  }

  // Workspace pool first (shared across team), profile counter mirrored
  // for UI / admin visibility. Rounds up — any partial minute counts.
  const minutesUsed = Math.ceil(durationSeconds / 60);
  if (minutesUsed > 0) {
    const { error: wsMeterError } = await supabase.rpc('increment_workspace_minutes', {
      ws_id: workspaceId,
      minutes: minutesUsed,
    });
    if (wsMeterError) {
      console.warn(`[FinaliseLive] workspace meter increment failed: ${wsMeterError.message}`);
    }
    const { error: meterError } = await supabase.rpc('increment_minutes_used', {
      user_id: user.id,
      minutes: minutesUsed,
    });
    if (meterError) {
      console.warn(`[FinaliseLive] profile meter increment failed: ${meterError.message}`);
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language, preferred_summary_style')
    .eq('id', user.id)
    .single();

  const transcriptText = segments
    .map((s) => `[${formatTime(s.start_time_ms)}] ${s.speaker_label}: ${s.text}`)
    .join('\n');

  const summaryLanguage = profile?.preferred_language || 'en';
  const summaryStyle =
    (profile?.preferred_summary_style as 'concise' | 'detailed' | 'bullet') || 'concise';

  try {
    const result = await summariseMeeting(transcriptText, {
      language: summaryLanguage,
      style: summaryStyle,
    });

    await supabase.from('summaries').insert({
      meeting_id: meeting.id,
      overview: result.overview,
      overview_zh: result.overview_zh,
      summary_text: result.summary,
      summary_text_zh: result.summary_zh,
      key_points: result.key_points || [],
      key_decisions: [],
      action_items: result.action_items,
      key_quotes: result.key_quotes,
      topics: result.topics,
      sentiment: result.sentiment,
      model_used: 'claude-sonnet-4-6',
      prompt_version: 'v2.0',
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      processing_time_ms: result.processing_time_ms,
    });

    const title = googleEventSummary
      || (result.topics.length > 0
        ? result.topics.map((t) => t.name).slice(0, 3).join(', ')
        : 'Live Meeting');

    await supabase
      .from('meetings')
      .update({ status: 'completed', title, error_message: null })
      .eq('id', meeting.id);

    console.log(`[FinaliseLive] completed ${meeting.id}: "${title}"`);
    // Fan-out runs after the response is sent — keeps the function alive long
    // enough to deliver the webhook without blocking the user-facing request.
    after(async () => {
      try {
        await fanOutMeetingCompleted(user.id, meeting.id);
      } catch (e) {
        console.warn('[FinaliseLive] webhook fan-out failed:', e instanceof Error ? e.message : e);
      }
      await indexMeetingForChat(supabase, meeting.id);
      await identifyAndSaveSpeakers(supabase, meeting.id);
      await promoteActionItemsToTasks(supabase, meeting.id);
      await sendAutoRecapIfEnabled(supabase, meeting.id);
    });
    return NextResponse.json({ meetingId: meeting.id, status: 'completed', title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[FinaliseLive] summarise failed', msg);
    await supabase
      .from('meetings')
      .update({ status: 'error', error_message: `Summary failed: ${msg}` })
      .eq('id', meeting.id);
    return NextResponse.json({ meetingId: meeting.id, status: 'error', error: msg });
  }
}
