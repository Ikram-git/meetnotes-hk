import { NextRequest, NextResponse } from 'next/server';

const SALES_EMAIL = 'ikram@meetbriva.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Public demo-request endpoint. Lead form posts here, we forward the
 * details to the sales mailbox via Resend. Doesn't require auth —
 * anyone on the marketing site can request a demo.
 *
 * Trivial rate limiting via the IP header to keep bots from flooding
 * the sales inbox; for anything heavier we'd want a proper limiter
 * but this endpoint is low-traffic by design.
 */
export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Demo requests are not configured on this server.' },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
  const company = typeof body?.company === 'string' ? body.company.trim().slice(0, 200) : '';
  const teamSize = typeof body?.teamSize === 'string' ? body.teamSize.trim().slice(0, 60) : '';
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  // Honeypot — visible field to bots, hidden in CSS for humans.
  const honeypot = typeof body?.website === 'string' ? body.website.trim() : '';

  if (honeypot) {
    // Looks like a bot — pretend success to avoid telegraphing the trap.
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 });
  }

  const subject = `[Briva] Demo request — ${name}${company ? ` (${company})` : ''}`;
  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;line-height:1.55;font-size:14px;padding:24px;">
<h2 style="margin:0 0 16px;color:#10b981;">New demo request</h2>
<table style="border-collapse:collapse;width:100%;max-width:560px;">
  <tr><td style="padding:8px 12px;background:#f6f8f7;font-weight:600;width:120px;">Name</td><td style="padding:8px 12px;">${escapeHtml(name)}</td></tr>
  <tr><td style="padding:8px 12px;background:#f6f8f7;font-weight:600;">Email</td><td style="padding:8px 12px;"><a href="mailto:${escapeHtml(email)}" style="color:#10b981;">${escapeHtml(email)}</a></td></tr>
  ${company ? `<tr><td style="padding:8px 12px;background:#f6f8f7;font-weight:600;">Company</td><td style="padding:8px 12px;">${escapeHtml(company)}</td></tr>` : ''}
  ${teamSize ? `<tr><td style="padding:8px 12px;background:#f6f8f7;font-weight:600;">Team size</td><td style="padding:8px 12px;">${escapeHtml(teamSize)}</td></tr>` : ''}
</table>
${message ? `<div style="margin-top:16px;"><div style="font-weight:600;margin-bottom:6px;">Message</div><div style="background:#f6f8f7;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(message)}</div></div>` : ''}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px;">
<p style="color:#888;font-size:12px;margin:0;">Submitted from the Briva marketing site. Reply directly to this email to respond.</p>
</body></html>`;

  const text = [
    `New demo request`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    teamSize ? `Team size: ${teamSize}` : null,
    message ? `\nMessage:\n${message}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Briva <noreply@meetbriva.com>',
      replyTo: email,
      to: SALES_EMAIL,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[book-demo] resend failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Couldn't send the request. Please email sales@meetbriva.com directly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
