import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { channelId } = await req.json();
  if (!channelId) return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });

  // Get Slack integration
  const { data: integration } = await supabase.from('integrations')
    .select('access_token').eq('user_id', user.id).eq('provider', 'slack').single();
  if (!integration) return NextResponse.json({ error: 'Slack not connected' }, { status: 400 });

  // Get meeting + summary
  const { data: meeting } = await supabase.from('meetings').select('*')
    .eq('id', meetingId).eq('user_id', user.id).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: summary } = await supabase.from('summaries').select('*')
    .eq('meeting_id', meetingId).order('created_at', { ascending: false }).limit(1).single();
  if (!summary) return NextResponse.json({ error: 'No summary' }, { status: 404 });

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionItems = (summary.action_items || [])
      .map((a: any) => `• ${a.text}${a.assignee ? ` → ${a.assignee}` : ''}`).join('\n');
    const decisions = (summary.key_decisions || [])
      .map((d: any) => `• ${d.text}`).join('\n');

    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: `📝 ${meeting.title || 'Meeting Notes'}` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Summary*\n${summary.summary_text}` } },
    ];

    if (actionItems) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Action Items*\n${actionItems}` } });
    }
    if (decisions) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Key Decisions*\n${decisions}` } });
    }
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<${appUrl}/meetings/${meetingId}|View full meeting notes>` },
    } as any);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${integration.access_token}`,
      },
      body: JSON.stringify({ channel: channelId, blocks }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Slack API error');

    await supabase.from('exports').insert({
      meeting_id: meetingId, user_id: user.id,
      export_type: 'slack', status: 'completed',
      metadata: { channel: channelId, ts: data.ts },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Slack export failed' },
      { status: 500 }
    );
  }
}
