interface EmailExportOptions {
  to: string[];
  meeting: { id: string; title?: string; meeting_date?: string; created_at: string };
  summary: {
    summary_text: string;
    summary_text_zh?: string;
    action_items?: Array<{ text: string; assignee?: string; due_date?: string }>;
    key_decisions?: Array<{ text: string }>;
  };
  senderName: string;
  appUrl: string;
}

export function buildEmailHtml(options: EmailExportOptions): string {
  const { meeting, summary, appUrl } = options;
  const date = new Date(meeting.meeting_date || meeting.created_at).toLocaleDateString('en-HK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const actionItemsHtml = summary.action_items?.length
    ? `<h3 style="color:#1a1a1a;margin:24px 0 8px;">Action Items</h3>
       <ul style="padding-left:20px;color:#333;">
         ${summary.action_items.map(item =>
           `<li style="margin-bottom:6px;"><strong>${item.assignee || 'Unassigned'}:</strong> ${item.text}${item.due_date ? ` <em>(by ${item.due_date})</em>` : ''}</li>`
         ).join('')}
       </ul>`
    : '';

  const decisionsHtml = summary.key_decisions?.length
    ? `<h3 style="color:#1a1a1a;margin:24px 0 8px;">Key Decisions</h3>
       <ul style="padding-left:20px;color:#333;">
         ${summary.key_decisions.map(d => `<li style="margin-bottom:6px;">${d.text}</li>`).join('')}
       </ul>`
    : '';

  const zhHtml = summary.summary_text_zh
    ? `<p style="color:#666;margin-top:16px;padding-top:16px;border-top:1px solid #eee;">${summary.summary_text_zh}</p>`
    : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#1a1a1a;margin:0 0 4px;">${meeting.title || 'Meeting Notes'}</h2>
        <p style="color:#666;margin:0;font-size:14px;">${date}</p>
      </div>

      <h3 style="color:#1a1a1a;margin:0 0 8px;">Summary</h3>
      <p style="color:#333;line-height:1.6;">${summary.summary_text}</p>
      ${zhHtml}
      ${actionItemsHtml}
      ${decisionsHtml}

      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
      <p style="color:#999;font-size:12px;text-align:center;">
        Sent via <a href="${appUrl}" style="color:#10b981;text-decoration:none;">MeetNotes</a>
        &nbsp;&middot;&nbsp;
        <a href="${appUrl}/meetings/${meeting.id}" style="color:#10b981;text-decoration:none;">View full meeting</a>
      </p>
    </div>
  `;
}

export function buildEmailText(options: EmailExportOptions): string {
  const { meeting, summary, appUrl } = options;
  const date = new Date(meeting.meeting_date || meeting.created_at).toLocaleDateString('en-HK');
  const lines: string[] = [
    `# ${meeting.title || 'Meeting Notes'}`,
    date,
    '',
    '## Summary',
    summary.summary_text,
  ];

  if (summary.summary_text_zh) {
    lines.push('', summary.summary_text_zh);
  }

  if (summary.action_items?.length) {
    lines.push('', '## Action Items');
    for (const item of summary.action_items) {
      lines.push(`- [ ] ${item.text}${item.assignee ? ` (@${item.assignee})` : ''}${item.due_date ? ` (by ${item.due_date})` : ''}`);
    }
  }

  if (summary.key_decisions?.length) {
    lines.push('', '## Key Decisions');
    for (const d of summary.key_decisions) {
      lines.push(`- ${d.text}`);
    }
  }

  lines.push('', '---', `View full meeting: ${appUrl}/meetings/${meeting.id}`);
  return lines.join('\n');
}
