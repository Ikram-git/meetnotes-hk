interface EmailExportOptions {
  to: string[];
  meeting: { id: string; title?: string; meeting_date?: string; created_at: string };
  summary: {
    overview?: string | null;
    overview_zh?: string | null;
    summary_text: string;
    summary_text_zh?: string;
    key_points?: Array<{ text: string; text_zh?: string }>;
    action_items?: Array<{ text: string; assignee?: string; due_date?: string }>;
  };
  senderName: string;
  appUrl: string;
}

export function buildEmailHtml(options: EmailExportOptions): string {
  const { meeting, summary, appUrl } = options;
  const date = new Date(meeting.meeting_date || meeting.created_at).toLocaleDateString('en-HK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const tldrHtml = summary.overview
    ? `<h3 style="color:#1a1a1a;margin:0 0 8px;">TL;DR</h3>
       <p style="color:#333;line-height:1.6;font-size:15px;">${summary.overview}</p>
       ${summary.overview_zh ? `<p style="color:#666;line-height:1.6;margin-top:4px;">${summary.overview_zh}</p>` : ''}`
    : '';

  const keyPointsHtml = summary.key_points?.length
    ? `<h3 style="color:#1a1a1a;margin:24px 0 8px;">Key Points</h3>
       <ul style="padding-left:20px;color:#333;">
         ${summary.key_points.map(p => `<li style="margin-bottom:6px;">${p.text}</li>`).join('')}
       </ul>`
    : '';

  const actionItemsHtml = summary.action_items?.length
    ? `<h3 style="color:#1a1a1a;margin:24px 0 8px;">Action Items</h3>
       <ul style="padding-left:20px;color:#333;">
         ${summary.action_items.map(item =>
           `<li style="margin-bottom:6px;"><strong>${item.assignee || 'Unassigned'}:</strong> ${item.text}${item.due_date ? ` <em>(by ${item.due_date})</em>` : ''}</li>`
         ).join('')}
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

      ${tldrHtml}

      <h3 style="color:#1a1a1a;margin:${tldrHtml ? '24px' : '0'} 0 8px;">Summary</h3>
      <p style="color:#333;line-height:1.6;">${summary.summary_text}</p>
      ${zhHtml}
      ${keyPointsHtml}
      ${actionItemsHtml}

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
  ];

  if (summary.overview) {
    lines.push('', '## TL;DR', summary.overview);
    if (summary.overview_zh) lines.push(summary.overview_zh);
  }

  lines.push('', '## Summary', summary.summary_text);

  if (summary.summary_text_zh) {
    lines.push('', summary.summary_text_zh);
  }

  if (summary.key_points?.length) {
    lines.push('', '## Key Points');
    for (const p of summary.key_points) {
      lines.push(`- ${p.text}`);
    }
  }

  if (summary.action_items?.length) {
    lines.push('', '## Action Items');
    for (const item of summary.action_items) {
      lines.push(`- [ ] ${item.text}${item.assignee ? ` (@${item.assignee})` : ''}${item.due_date ? ` (by ${item.due_date})` : ''}`);
    }
  }

  lines.push('', '---', `View full meeting: ${appUrl}/meetings/${meeting.id}`);
  return lines.join('\n');
}
