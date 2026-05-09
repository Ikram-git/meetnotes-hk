import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You draft polite, concise follow-up emails to send to meeting attendees.

Rules:
- Greeting + 1-2 sentence summary of what was discussed.
- Bullet list of agreed-upon action items (with assignee names if provided).
- Sign-off as the sender (use their first name from "Sender:").
- Tone: professional but conversational. ~150–250 words total.
- No subject line in the body — that's separate.
- No preamble like "Here's the draft:". Start directly with the greeting.`;

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id, title, created_at')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  // Membership check
  const { data: member } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [{ data: profile }, { data: summary }] = await Promise.all([
    a.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    a
      .from('summaries')
      .select('overview, summary_text, key_points, action_items, topics')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!summary) {
    return NextResponse.json(
      { error: 'No summary available yet — wait for the meeting to finish processing.' },
      { status: 400 },
    );
  }

  const senderName = profile?.full_name || profile?.email?.split('@')[0] || 'the meeting host';
  const senderFirstName = senderName.split(/\s+/)[0];

  // Suggest recipients: workspace teammates (excluding sender) + calendar attendees if available.
  const ownerEmail = profile?.email?.toLowerCase() ?? '';
  const recipients = new Set<string>();
  if (meeting.workspace_id) {
    const { data: memberRows } = await a
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', meeting.workspace_id);
    const otherIds = (memberRows ?? [])
      .map((m) => m.user_id)
      .filter((id) => id !== user.id);
    if (otherIds.length > 0) {
      const { data: memberProfiles } = await a
        .from('profiles')
        .select('email')
        .in('id', otherIds);
      for (const p of memberProfiles ?? []) {
        const e = (p.email as string | null)?.toLowerCase();
        if (e && e !== ownerEmail) recipients.add(e);
      }
    }
  }
  const suggestedRecipients = Array.from(recipients);

  const lines: string[] = [];
  if (summary.overview) lines.push(`Overview: ${summary.overview}`);
  if (summary.summary_text) lines.push(`Summary:\n${summary.summary_text}`);
  const kps = ((summary.key_points as Array<{ text?: string }>) ?? [])
    .map((k) => k?.text)
    .filter(Boolean) as string[];
  if (kps.length) lines.push(`Key points:\n- ${kps.join('\n- ')}`);
  const ais = ((summary.action_items as Array<{ text?: string; assignee?: string | null }>) ?? [])
    .map((it) => (it?.text ? `${it.text}${it.assignee ? ` (${it.assignee})` : ''}` : null))
    .filter(Boolean) as string[];
  if (ais.length) lines.push(`Action items:\n- ${ais.join('\n- ')}`);
  const ts = ((summary.topics as Array<{ name?: string }>) ?? [])
    .map((t) => t?.name)
    .filter(Boolean) as string[];
  if (ts.length) lines.push(`Topics: ${ts.join(', ')}`);

  const userPrompt = `Meeting title: ${meeting.title || 'Untitled meeting'}
Sender: ${senderName} (first name "${senderFirstName}")

<MEETING>
${lines.join('\n\n')}
</MEETING>

Draft the follow-up email body now.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const subject = `Recap: ${meeting.title || 'our meeting'}`;
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ subject, recipients: suggestedRecipients }) + '\n',
          ),
        );

        const claudeStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            '\n\n[error: ' + (err instanceof Error ? err.message : 'AI call failed') + ']',
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
