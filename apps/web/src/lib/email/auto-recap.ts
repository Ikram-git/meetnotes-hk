import type { SupabaseClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { buildOAuthClientFromTokens } from '@/lib/google/client';
import { buildEmailHtml, buildEmailText } from '@/lib/export/email';
import { getGates } from '@/lib/billing/gates';

/**
 * Send the meeting recap to workspace teammates + calendar attendees if
 * the meeting owner has opted in. Records every skip reason on the
 * meeting row (auto_recap_skip_reason) so you can SELECT it from the
 * DB instead of digging through Vercel function logs.
 */
export async function sendAutoRecapIfEnabled(
  admin: SupabaseClient,
  meetingId: string,
): Promise<{ sent: number } | { skipped: string }> {
  const log = (msg: string, extra?: Record<string, unknown>) =>
    console.log(`[auto-recap] ${meetingId.slice(0, 8)}: ${msg}`, extra ?? '');

  const recordSkip = async (reason: string, detail?: string) => {
    log(`skipped: ${reason}`, detail ? { detail } : undefined);
    try {
      await admin
        .from('meetings')
        .update({ auto_recap_skip_reason: detail ? `${reason}: ${detail}` : reason })
        .eq('id', meetingId);
    } catch {
      // Ignore — the log is enough.
    }
    return { skipped: reason };
  };

  try {
    log('start');
    if (!process.env.RESEND_API_KEY) {
      return await recordSkip('no_resend_key');
    }

    const { data: meeting } = await admin
      .from('meetings')
      .select(
        'id, user_id, workspace_id, title, created_at, audio_duration_seconds, google_event_id, auto_recap_sent_at',
      )
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting) return await recordSkip('meeting_not_found');

    log('loaded meeting', {
      workspace_id: meeting.workspace_id,
      duration: meeting.audio_duration_seconds,
      has_event: !!meeting.google_event_id,
      already_sent: !!meeting.auto_recap_sent_at,
    });

    if (meeting.auto_recap_sent_at) return await recordSkip('already_sent');
    if ((meeting.audio_duration_seconds || 0) < 120) {
      return await recordSkip('too_short', `${meeting.audio_duration_seconds}s`);
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, auto_email_recap, email, full_name')
      .eq('id', meeting.user_id)
      .maybeSingle();
    log('loaded profile', {
      tier: profile?.subscription_tier,
      auto_email_recap: profile?.auto_email_recap,
      email: profile?.email,
    });
    if (!profile) return await recordSkip('profile_not_found');
    if (!profile.auto_email_recap) {
      return await recordSkip('opted_out', `tier=${profile.subscription_tier}, email=${profile.email}`);
    }
    if (!getGates(profile.subscription_tier).emailRecap) {
      return await recordSkip('tier_gate', `tier=${profile.subscription_tier}`);
    }

    const ownerEmail = profile.email.toLowerCase();
    const recipients = new Set<string>();

    if (meeting.workspace_id) {
      const { data: memberRows } = await admin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', meeting.workspace_id);
      const otherIds = (memberRows ?? [])
        .map((m) => m.user_id)
        .filter((id) => id !== meeting.user_id);
      if (otherIds.length > 0) {
        const { data: memberProfiles } = await admin
          .from('profiles')
          .select('email')
          .in('id', otherIds);
        for (const p of memberProfiles ?? []) {
          const e = (p.email as string | null)?.toLowerCase();
          if (e && e !== ownerEmail) recipients.add(e);
        }
      }
    }

    if (meeting.google_event_id) {
      const { data: integration } = await admin
        .from('google_integrations')
        .select('access_token, refresh_token')
        .eq('user_id', meeting.user_id)
        .maybeSingle();
      if (integration?.access_token) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetbriva.com';
          const client = buildOAuthClientFromTokens(
            `${appUrl}/api/google/auth/callback`,
            integration.access_token,
            integration.refresh_token,
          );
          const calendar = google.calendar({ version: 'v3', auth: client });
          const { data: event } = await calendar.events.get({
            calendarId: 'primary',
            eventId: meeting.google_event_id,
          });
          for (const att of event.attendees ?? []) {
            const e = att.email?.toLowerCase();
            if (e && e.includes('@') && e !== ownerEmail) recipients.add(e);
          }
        } catch (err) {
          console.warn(
            '[auto-recap] calendar event fetch failed:',
            err instanceof Error ? err.message : err,
          );
        }
      }
    }

    log('resolved recipients', { count: recipients.size, emails: Array.from(recipients) });
    if (recipients.size === 0) {
      // Re-run a quick count so the skip reason shows what we saw.
      const memberCountResult = meeting.workspace_id
        ? await admin
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', meeting.workspace_id)
        : { count: 0 };
      const ws = meeting.workspace_id ?? 'none';
      const ownerEmailDisplay = ownerEmail;
      return await recordSkip(
        'no_recipients',
        `ws=${ws.slice(0, 8)}, total_members=${memberCountResult.count ?? 0}, uploader=${meeting.user_id?.slice(0, 8)}, owner_email=${ownerEmailDisplay}`,
      );
    }
    const attendeeEmails = Array.from(recipients);

    const { data: summary } = await admin
      .from('summaries')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!summary) return await recordSkip('no_summary');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetbriva.com';
    const opts = {
      to: attendeeEmails,
      meeting,
      summary,
      senderName: profile.full_name || 'Briva',
      appUrl,
    };

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Briva <noreply@meetbriva.com>',
      replyTo: profile.email,
      to: attendeeEmails,
      subject: `Recap: ${meeting.title || 'Untitled meeting'}`,
      html: buildEmailHtml(opts),
      text: buildEmailText(opts),
    });
    if (error) {
      return await recordSkip('resend_failed', error.message);
    }

    await admin
      .from('meetings')
      .update({
        auto_recap_sent_at: new Date().toISOString(),
        auto_recap_recipient_count: attendeeEmails.length,
        auto_recap_skip_reason: null,
      })
      .eq('id', meetingId);

    await admin.from('exports').insert({
      meeting_id: meetingId,
      user_id: meeting.user_id,
      export_type: 'email',
      status: 'completed',
      metadata: { auto: true, recipients: attendeeEmails },
    });

    log(`SENT ${attendeeEmails.length} emails`, { to: attendeeEmails });
    return { sent: attendeeEmails.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await admin
        .from('meetings')
        .update({ auto_recap_skip_reason: `unexpected_error: ${msg}` })
        .eq('id', meetingId);
    } catch {
      // Ignore.
    }
    console.error(`[auto-recap] ${meetingId.slice(0, 8)}: unexpected error:`, msg);
    return { skipped: 'unexpected_error' };
  }
}
