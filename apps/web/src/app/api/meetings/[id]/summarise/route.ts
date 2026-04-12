import { createClient } from '@/lib/supabase/server';
import { summariseMeeting } from '@/lib/ai/summarise';
import { formatTime } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

// Claude Sonnet summarisation of a full meeting transcript typically takes
// 15-25s. Vercel functions default to 10s — give this one up to 60s
// (works on both Hobby and Pro plans).
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: summary } = await supabase
    .from('summaries')
    .select('*')
    .eq('meeting_id', meetingId)
    .single();

  const { data: meeting } = await supabase
    .from('meetings')
    .select('status, title, error_message')
    .eq('id', meetingId)
    .single();

  return NextResponse.json({ summary, meeting });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
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

  // Get transcript segments
  const { data: segments } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('segment_index', { ascending: true });

  if (!segments?.length) {
    return NextResponse.json(
      { error: 'No transcript found' },
      { status: 404 }
    );
  }

  // Language from request body overrides profile preference
  const body = await req.json().catch(() => ({}));
  const requestedLanguage = body.language as 'en' | 'zh-Hant' | 'both' | undefined;

  // Get user preferences (fallback only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language, preferred_summary_style')
    .eq('id', user.id)
    .single();

  // Build transcript text
  const transcriptText = segments
    .map(
      (s) =>
        `[${formatTime(s.start_time_ms)}] ${s.speaker_label || 'Unknown'}: ${s.text}`
    )
    .join('\n');

  await supabase
    .from('meetings')
    .update({ status: 'summarising' })
    .eq('id', meetingId);

  try {
    const result = await summariseMeeting(transcriptText, {
      language:
        requestedLanguage ||
        (profile?.preferred_language as 'en' | 'zh-Hant' | 'both') ||
        'en',
      style:
        (profile?.preferred_summary_style as 'concise' | 'detailed' | 'bullet') ||
        'concise',
    });

    // Delete old summary if regenerating, then insert fresh
    await supabase.from('summaries').delete().eq('meeting_id', meetingId);

    await supabase.from('summaries').insert({
      meeting_id: meetingId,
      summary_text: result.summary,
      summary_text_zh: result.summary_zh,
      key_decisions: result.key_decisions,
      action_items: result.action_items,
      key_quotes: result.key_quotes,
      topics: result.topics,
      sentiment: result.sentiment,
      model_used: 'claude-sonnet-4-6',
      prompt_version: 'v1.0',
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      processing_time_ms: result.processing_time_ms,
    });

    // Auto-generate title from topics
    const title =
      result.topics.length > 0
        ? result.topics
            .map((t) => t.name)
            .slice(0, 3)
            .join(', ')
        : 'Untitled Meeting';

    await supabase
      .from('meetings')
      .update({ status: 'completed', title, error_message: null })
      .eq('id', meetingId);

    return NextResponse.json({ status: 'completed' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Summarisation error:', errorMsg, error);

    await supabase
      .from('meetings')
      .update({
        status: 'error',
        error_message: `Summary failed: ${errorMsg}`,
      })
      .eq('id', meetingId);

    return NextResponse.json(
      { error: `Summarisation failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
