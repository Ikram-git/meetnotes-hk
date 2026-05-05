import type { SupabaseClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { buildOAuthClientFromTokens } from '@/lib/google/client';
import { buildEmailHtml, buildEmailText } from '@/lib/export/email';
import { getGates } from '@/lib/billing/gates';

/**
 * If the meeting owner has opted in to auto-email recap AND the meeting
 * was auto-linked to a Google Calendar event AND the meeting is on a
 * tier that includes the email-recap feature, send the recap to every
 * attendee on the calendar invite.
 *
 * Best-effort: catches every error path and just logs. Idempotent via
 * meetings.auto_recap_sent_at — second invocations short-circuit.
 */
export async function sendAutoRecapIfEnabled(
  admin: SupabaseClient,
  meetingId: string,
): Promise<{ sent: number } | { skipped: string }> {
  try {
    if (!process.env.RESEND_API_KEY) return { skipped: 'no_resend_key' };

    const { data: meeting } = await admin
      .from('meetings')
      .select(
        'id, user_id, title, created_at, audio_duration_seconds, google_event_id, auto_recap_sent_at',
      )
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting) return { skipped: 'meeting_not_found' };

    if (meeting.auto_recap_sent_at) return { skipped: 'already_sent' };
    if (!meeting.google_event_id) return { skipped: 'no_calendar_event' };
    if ((meeting.audio_duration_seconds || 0) < 120) {
      return { skipped: 'too_short' };
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, auto_email_recap, email, full_name')
      .eq('id', meeting.user_id)
      .maybeSingle();
    if (!profile?.auto_email_recap) return { skipped: 'opted_out' };
    if (!getGates(profile.subscription_tier).emailRecap) {
      return { skipped: 'tier_gate' };
    }

    const { data: integration } = await admin
      .from('google_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', meeting.user_id)
      .maybeSingle();
    if (!integration?.access_token) return { skipped: 'google_not_connected' };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetbriva.com';
    const client = buildOAuthClientFromTokens(
      `${appUrl}/api/google/auth/callback`,
      integration.access_token,
      integration.refresh_token,
    );
    const calendar = google.calendar({ version: 'v3', auth: client });
    let attendeeEmails: string[] = [];
    try {
      const { data: event } = await calendar.events.get({
        calendarId: 'primary',
        eventId: meeting.google_event_id,
      });
      attendeeEmails = (event.attendees ?? [])
        .map((a) => a.email)
        .filter((e): e is string => !!e && e.includes('@'))
        .filter((e) => e.toLowerCase() !== profile.email.toLowerCase());
    } catch (err) {
      console.warn(
        '[auto-recap] calendar event fetch failed:',
        err instanceof Error ? err.message : err,
      );
      return { skipped: 'event_fetch_failed' };
    }

    if (attendeeEmails.length === 0) return { skipped: 'no_attendees' };

    const { data: summary } = await admin
      .from('summaries')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!summary) return { skipped: 'no_summary' };

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
      console.warn('[auto-recap] resend failed:', error.message);
      return { skipped: 'resend_failed' };
    }

    await admin
      .from('meetings')
      .update({
        auto_recap_sent_at: new Date().toISOString(),
        auto_recap_recipient_count: attendeeEmails.length,
      })
      .eq('id', meetingId);

    await admin.from('exports').insert({
      meeting_id: meetingId,
      user_id: meeting.user_id,
      export_type: 'email',
      status: 'completed',
      metadata: { auto: true, recipients: attendeeEmails },
    });

    console.log(`[auto-recap] sent ${attendeeEmails.length} emails for meeting ${meetingId}`);
    return { sent: attendeeEmails.length };
  } catch (err) {
    console.warn(
      '[auto-recap] failed:',
      err instanceof Error ? err.message : err,
    );
    return { skipped: 'unexpected_error' };
  }
}
