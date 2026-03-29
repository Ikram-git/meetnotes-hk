import { createClient } from '@/lib/supabase/server';
import { buildEmailHtml, buildEmailText } from '@/lib/export/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, senderName } = await req.json();
  if (!to || !Array.isArray(to) || to.length === 0) {
    return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 });
  }

  const { data: meeting } = await supabase
    .from('meetings').select('*').eq('id', meetingId).eq('user_id', user.id).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const { data: summary } = await supabase
    .from('summaries').select('*').eq('meeting_id', meetingId)
    .order('created_at', { ascending: false }).limit(1).single();
  if (!summary) return NextResponse.json({ error: 'No summary available' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const emailOpts = {
    to,
    meeting,
    summary,
    senderName: senderName || 'MeetNotes HK',
    appUrl,
  };

  // Use Resend if available, otherwise return the email content for the client
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: `${emailOpts.senderName} via MeetNotes <notes@meetnotes.hk>`,
        to,
        subject: `Meeting Notes: ${meeting.title || 'Untitled Meeting'}`,
        html: buildEmailHtml(emailOpts),
        text: buildEmailText(emailOpts),
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send email' }, { status: 500 });
    }
  } else {
    // No Resend key — return content so client can use mailto fallback
    return NextResponse.json({
      fallback: true,
      subject: `Meeting Notes: ${meeting.title || 'Untitled Meeting'}`,
      body: buildEmailText(emailOpts),
    });
  }

  await supabase.from('exports').insert({
    meeting_id: meetingId, user_id: user.id,
    export_type: 'email', status: 'completed',
    metadata: { recipients: to },
  });

  return NextResponse.json({ success: true });
}
