import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'normal' | 'high';
  assignee_user_id: string;
  workspace_id: string;
  meeting_id: string | null;
}

/**
 * Daily reminder cron:
 *   - Finds open tasks (status != 'done') with a due_date that is
 *     today or in the past, where last_reminder_sent_at is either
 *     null or older than 24h.
 *   - Groups by assignee, sends one digest email per person.
 *   - Stamps last_reminder_sent_at so we don't double-send.
 *
 * Auth: requires either Vercel cron header (x-vercel-cron) or a
 * matching CRON_SECRET in the Authorization header. This keeps
 * randos on the internet from flooding people's inboxes.
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') !== null;
  const auth = req.headers.get('authorization');
  const expectedAuth = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  const isAuthorized = isVercelCron || (expectedAuth && auth === expectedAuth);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: 'no_resend_key' });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const today = new Date().toISOString().slice(0, 10);
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Pull every candidate task in one query. Even if the workspace
  // has thousands of tasks, the WHERE clauses (open + due in past +
  // assignee + not recently reminded) cut this down hard.
  const { data: tasks, error } = await admin
    .from('tasks')
    .select('id, title, due_date, priority, assignee_user_id, workspace_id, meeting_id')
    .neq('status', 'done')
    .not('assignee_user_id', 'is', null)
    .not('due_date', 'is', null)
    .lte('due_date', today)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${dayAgoIso}`);

  if (error) {
    console.error('[cron/task-reminders] query failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, candidates: 0 });
  }

  const candidateTasks = tasks as TaskRow[];

  // Group by assignee
  const byAssignee = new Map<string, TaskRow[]>();
  for (const t of candidateTasks) {
    const arr = byAssignee.get(t.assignee_user_id) ?? [];
    arr.push(t);
    byAssignee.set(t.assignee_user_id, arr);
  }

  // Resolve assignee profiles
  const assigneeIds = Array.from(byAssignee.keys());
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', assigneeIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  // Resolve workspace names
  const workspaceIds = Array.from(new Set(candidateTasks.map((t) => t.workspace_id)));
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, name')
    .in('id', workspaceIds);
  const workspaceById = new Map((workspaces ?? []).map((w) => [w.id as string, w.name as string]));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetbriva.com';
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sentCount = 0;
  let failed = 0;
  const sentTaskIds: string[] = [];

  for (const [assigneeId, list] of byAssignee) {
    const profile = profileById.get(assigneeId);
    if (!profile?.email) continue;

    const overdue = list.filter((t) => t.due_date < today);
    const dueToday = list.filter((t) => t.due_date === today);

    const renderRows = (items: TaskRow[]) =>
      items
        .map((t) => {
          const wsName = workspaceById.get(t.workspace_id) || 'Workspace';
          const dueLabel = t.due_date === today
            ? 'Due today'
            : `Overdue — was due ${t.due_date}`;
          const priorityBadge = t.priority === 'high'
            ? '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:11px;padding:2px 8px;border-radius:9999px;margin-left:8px;">High</span>'
            : '';
          return `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;"><div style="font-weight:600;color:#111;">${escapeHtml(t.title)}${priorityBadge}</div><div style="font-size:12px;color:#888;margin-top:2px;">${dueLabel} · ${escapeHtml(wsName)}</div></td></tr>`;
        })
        .join('');

    const sections: string[] = [];
    if (overdue.length > 0) {
      sections.push(`<h3 style="font-size:14px;color:#b91c1c;margin:24px 0 8px;">Overdue (${overdue.length})</h3><table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">${renderRows(overdue)}</table>`);
    }
    if (dueToday.length > 0) {
      sections.push(`<h3 style="font-size:14px;color:#111;margin:24px 0 8px;">Due today (${dueToday.length})</h3><table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">${renderRows(dueToday)}</table>`);
    }

    const greeting = profile.full_name
      ? `Hi ${(profile.full_name as string).split(/\s+/)[0]},`
      : 'Hi,';
    const subject = overdue.length > 0
      ? `${overdue.length + dueToday.length} task${list.length === 1 ? '' : 's'} need your attention`
      : `${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due today`;

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;font-size:15px;background:#fff;">
<p style="margin:0 0 12px;">${greeting}</p>
<p style="margin:0 0 8px;">Here's what's on your plate today:</p>
${sections.join('')}
<p style="margin:28px 0 12px;"><a href="${appUrl}/tasks" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px;">View all tasks →</a></p>
<p style="margin:0;font-size:12px;color:#888;">You're receiving this because you're assigned to open tasks in Briva. Manage notifications in <a href="${appUrl}/settings" style="color:#10b981;">Settings</a>.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa;"><strong style="color:#10b981;">Briva</strong> &mdash; <em style="color:#10b981;">Hear Beyond Words.</em></p>
</body></html>`;

    const text = [
      greeting,
      '',
      "Here's what's on your plate today:",
      ...(overdue.length
        ? ['', `OVERDUE (${overdue.length}):`, ...overdue.map((t) => `  - ${t.title} (was due ${t.due_date})`)]
        : []),
      ...(dueToday.length
        ? ['', `DUE TODAY (${dueToday.length}):`, ...dueToday.map((t) => `  - ${t.title}`)]
        : []),
      '',
      `View all tasks: ${appUrl}/tasks`,
    ].join('\n');

    try {
      const { error: sendError } = await resend.emails.send({
        from: 'Briva <noreply@meetbriva.com>',
        to: profile.email as string,
        subject,
        html,
        text,
      });
      if (sendError) throw new Error(sendError.message);
      sentCount += 1;
      for (const t of list) sentTaskIds.push(t.id);
    } catch (err) {
      failed += 1;
      console.warn(
        `[cron/task-reminders] failed for ${profile.email}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (sentTaskIds.length > 0) {
    await admin
      .from('tasks')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .in('id', sentTaskIds);
  }

  return NextResponse.json({
    sent: sentCount,
    failed,
    candidates: candidateTasks.length,
    assignees: byAssignee.size,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
