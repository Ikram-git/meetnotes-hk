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

  const { parentPageId } = await req.json();

  // Get Notion integration
  const { data: integration } = await supabase.from('integrations')
    .select('access_token').eq('user_id', user.id).eq('provider', 'notion').single();
  if (!integration) return NextResponse.json({ error: 'Notion not connected' }, { status: 400 });

  // Get meeting + summary
  const { data: meeting } = await supabase.from('meetings').select('*')
    .eq('id', meetingId).eq('user_id', user.id).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: summary } = await supabase.from('summaries').select('*')
    .eq('meeting_id', meetingId).order('created_at', { ascending: false }).limit(1).single();
  if (!summary) return NextResponse.json({ error: 'No summary' }, { status: 404 });

  try {
    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: integration.access_token });

    const date = new Date(meeting.meeting_date || meeting.created_at).toLocaleDateString('en-HK');
    const children: any[] = [
      { object: 'block', type: 'callout', callout: { icon: { emoji: '📅' as const }, rich_text: [{ text: { content: date } }] } },
      { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Summary' } }] } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: summary.summary_text } }] } },
    ];

    if (summary.summary_text_zh) {
      children.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: summary.summary_text_zh } }] } });
    }

    const actionItems = summary.action_items || [];
    if (actionItems.length > 0) {
      children.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Action Items' } }] } });
      for (const item of actionItems) {
        children.push({
          object: 'block', type: 'to_do',
          to_do: {
            checked: item.status === 'completed',
            rich_text: [{ text: { content: `${item.text}${item.assignee ? ` → ${item.assignee}` : ''}` } }],
          },
        });
      }
    }

    const decisions = summary.key_decisions || [];
    if (decisions.length > 0) {
      children.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: 'Key Decisions' } }] } });
      for (const d of decisions) {
        children.push({
          object: 'block', type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ text: { content: d.text } }] },
        });
      }
    }

    const page = await notion.pages.create({
      parent: { page_id: parentPageId },
      icon: { emoji: '📝' as const },
      properties: { title: { title: [{ text: { content: meeting.title || 'Meeting Notes' } }] } },
      children,
    });

    await supabase.from('exports').insert({
      meeting_id: meetingId, user_id: user.id,
      export_type: 'notion', status: 'completed',
      metadata: { notion_page_id: page.id },
    });

    return NextResponse.json({ success: true, pageId: page.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Notion export failed' },
      { status: 500 }
    );
  }
}
