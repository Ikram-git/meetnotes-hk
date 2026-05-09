import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getGates, tierUpgradeMessage } from '@/lib/billing/gates';
import { NextRequest, NextResponse } from 'next/server';

const MAX_RECIPIENTS = 50;
const MAX_BODY = 20_000;
const MAX_SUBJECT = 250;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyToHtml(body: string) {
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, email, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!getGates(profile?.subscription_tier).emailRecap) {
    return NextResponse.json(
      { error: tierUpgradeMessage('Sending follow-up emails', 'pro') },
      { status: 402 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = Array.isArray(body?.to) ? body.to : [];
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body?.body === 'string' ? body.body : '';

  const cleanedTo: string[] = Array.from(
    new Set(
      (to as unknown[])
        .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter((e): e is string => EMAIL_RE.test(e)),
    ),
  );
  if (cleanedTo.length === 0) {
    return NextResponse.json({ error: 'At least one valid recipient email is required' }, { status: 400 });
  }
  if (cleanedTo.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json({ error: 'Subject is too long' }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: 'Email body is required' }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: 'Email body is too long' }, { status: 400 });
  }

  // Membership check via admin
  const a = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id, title')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  const { data: member } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Email sending is not configured on this server.' },
      { status: 500 },
    );
  }

  const senderName = profile?.full_name || 'Briva';
  const replyTo = profile?.email || undefined;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;font-size:15px;">${bodyToHtml(text)}<hr style="border:none;border-top:1px solid #eee;margin:28px 0 14px;"><p style="margin:0;font-size:12px;color:#888;">Sent via <a href="https://meetbriva.com" style="color:#10b981;text-decoration:none;">Briva</a></p></body></html>`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `${senderName} via Briva <noreply@meetbriva.com>`,
      replyTo,
      to: cleanedTo,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email' },
      { status: 500 },
    );
  }

  await a.from('exports').insert({
    meeting_id: meetingId,
    user_id: user.id,
    export_type: 'email',
    status: 'completed',
    metadata: { recipients: cleanedTo, manual: true },
  });

  return NextResponse.json({ sent: cleanedTo.length });
}
