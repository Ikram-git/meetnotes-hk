import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { formatTime } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Briva's per-meeting AI assistant. The user has just asked you a question about a single meeting they had. You have access to the meeting's full transcript and the AI-generated summary.

Rules:
- Answer using ONLY the transcript and summary provided. If the answer isn't in there, say so plainly.
- Quote verbatim with double quotes when citing what someone said.
- Keep answers concise: a tight paragraph or short bullets. No "Based on the transcript..." preamble.
- Reply in the same language the user asked in. Mixed-language answers are fine if the user mixes.
- When referencing something specific, mention the speaker label and a rough timestamp (e.g. "around 12:34").`;

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  // Membership check via meetings.workspace_id
  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: members } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!members) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: chats } = await a
    .from('meeting_chats')
    .select('id, role, content, turn_index, created_at')
    .eq('meeting_id', meetingId)
    .order('turn_index', { ascending: true });

  return NextResponse.json({ messages: chats ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { question?: string; history?: ChatTurn[] };
  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

  const history = (body.history ?? []).slice(-10);

  const a = admin();

  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id, title, created_at')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: members } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!members) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [{ data: segments }, { data: summary }] = await Promise.all([
    a
      .from('transcript_segments')
      .select('speaker_label, start_time_ms, text')
      .eq('meeting_id', meetingId)
      .order('segment_index', { ascending: true }),
    a
      .from('summaries')
      .select('overview, summary_text, key_points, action_items, topics')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const transcriptText = (segments ?? [])
    .map((s) => `[${formatTime(s.start_time_ms as number)}] ${s.speaker_label || 'Speaker'}: ${s.text}`)
    .join('\n');

  const summaryBlock = summary
    ? buildSummaryBlock(summary as any)
    : 'No AI summary is available yet.';

  const userPrompt = `Meeting: ${meeting.title || 'Untitled meeting'}\n\n<SUMMARY>\n${summaryBlock}\n</SUMMARY>\n\n<TRANSCRIPT>\n${transcriptText || '(empty)'}\n</TRANSCRIPT>\n\nQuestion: ${question}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  let answer = '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.content } as Anthropic.MessageParam)),
        { role: 'user' as const, content: userPrompt },
      ],
    });
    answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI call failed' },
      { status: 500 },
    );
  }

  // Persist both turns to meeting_chats so workspace members see the
  // shared Q&A history.
  const { count } = await a
    .from('meeting_chats')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_id', meetingId);
  const startIndex = count ?? 0;
  await a.from('meeting_chats').insert([
    { meeting_id: meetingId, role: 'user', content: question, turn_index: startIndex },
    { meeting_id: meetingId, role: 'assistant', content: answer, turn_index: startIndex + 1 },
  ]);

  return NextResponse.json({ answer });
}

function buildSummaryBlock(s: {
  overview?: string | null;
  summary_text?: string | null;
  key_points?: Array<{ text?: string }> | null;
  action_items?: Array<{ text?: string; assignee?: string | null }> | null;
  topics?: Array<{ name?: string }> | null;
}): string {
  const lines: string[] = [];
  if (s.overview) lines.push(`Overview: ${s.overview}`);
  if (s.summary_text) lines.push(`Summary:\n${s.summary_text}`);
  const kps = (s.key_points ?? []).map((k) => k?.text).filter(Boolean) as string[];
  if (kps.length) lines.push(`Key points:\n- ${kps.join('\n- ')}`);
  const ais = (s.action_items ?? [])
    .map((a) => (a?.text ? `${a.text}${a.assignee ? ` (${a.assignee})` : ''}` : null))
    .filter(Boolean) as string[];
  if (ais.length) lines.push(`Action items:\n- ${ais.join('\n- ')}`);
  const ts = (s.topics ?? []).map((t) => t?.name).filter(Boolean) as string[];
  if (ts.length) lines.push(`Topics: ${ts.join(', ')}`);
  return lines.join('\n\n');
}
