'use client';

import { useState, useRef, useEffect } from 'react';

interface ExportDropdownProps {
  meetingId: string;
  disabled?: boolean;
}

export function ExportDropdown({ meetingId, disabled }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Check which integrations are connected
  useEffect(() => {
    async function checkIntegrations() {
      try {
        const [notionRes, slackRes] = await Promise.all([
          fetch('/api/integrations/notion').catch(() => null),
          fetch('/api/integrations/slack').catch(() => null),
        ]);
        const connected: string[] = [];
        if (notionRes?.ok) {
          const d = await notionRes.json();
          if (d.connected) connected.push('notion');
        }
        if (slackRes?.ok) {
          const d = await slackRes.json();
          if (d.connected) connected.push('slack');
        }
        setConnectedIntegrations(connected);
      } catch {}
    }
    checkIntegrations();
  }, []);

  const handleExport = async (type: string) => {
    if (type === 'email') {
      const recipients = prompt('Enter recipient email(s), separated by commas:');
      if (!recipients) return;
      setExporting(type);
      setOpen(false);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/export/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipients.split(',').map(e => e.trim()).filter(Boolean) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send');
        if (data.fallback) {
          const mailto = `mailto:${recipients}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
          window.open(mailto);
        } else {
          alert('Email sent successfully!');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to send email');
      } finally {
        setExporting(null);
      }
      return;
    }

    if (type === 'notion') {
      const pageId = prompt('Enter a Notion parent page ID to export into:');
      if (!pageId) return;
      setExporting(type);
      setOpen(false);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/export/notion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentPageId: pageId.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Notion export failed');
        alert('Exported to Notion!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Notion export failed');
      } finally {
        setExporting(null);
      }
      return;
    }

    if (type === 'slack') {
      const channelId = prompt('Enter a Slack channel ID (e.g. C0123456789):');
      if (!channelId) return;
      setExporting(type);
      setOpen(false);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/export/slack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: channelId.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Slack export failed');
        alert('Posted to Slack!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Slack export failed');
      } finally {
        setExporting(null);
      }
      return;
    }

    setExporting(type);
    setOpen(false);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportType: type }),
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();

      switch (type) {
        case 'pdf': {
          const pdfWindow = window.open('', '_blank');
          if (pdfWindow) {
            const pdfRes = await fetch(
              `/api/meetings/${meetingId}/export/pdf`
            );
            const html = await pdfRes.text();
            pdfWindow.document.write(html);
            pdfWindow.document.close();
          }
          break;
        }
        case 'clipboard': {
          const { summary } = data;
          const text = [
            `# ${data.meeting.title || 'Meeting Notes'}`,
            '',
            '## Summary',
            summary.summary_text,
            '',
            '## Action Items',
            ...((summary.action_items as Array<{ text: string; assignee?: string }>) || []).map(
              (item: { text: string; assignee?: string }) =>
                `- [ ] ${item.text}${item.assignee ? ` (@${item.assignee})` : ''}`
            ),
            '',
            '## Key Decisions',
            ...((summary.key_decisions as Array<{ text: string }>) || []).map(
              (d: { text: string }) => `- ${d.text}`
            ),
          ].join('\n');

          await navigator.clipboard.writeText(text);
          alert('Copied to clipboard!');
          break;
        }
      }
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    { type: 'pdf', label: 'Download PDF', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
    { type: 'clipboard', label: 'Copy to Clipboard', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
    )},
    { type: 'email', label: 'Send via Email', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )},
  ];

  // Dynamically add connected integrations
  if (connectedIntegrations.includes('notion')) {
    exportOptions.push({
      type: 'notion', label: 'Export to Notion', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.36c-.466-.373-.98-.653-2.055-.56l-12.77.746c-.467.047-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.84c-.56.047-.747.327-.747.98z"/>
        </svg>
      ),
    });
  }

  if (connectedIntegrations.includes('slack')) {
    exportOptions.push({
      type: 'slack', label: 'Post to Slack', icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
        </svg>
      ),
    });
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || !!exporting}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-emerald-900/30 rounded-lg hover:bg-white/10 hover:text-emerald-400 transition disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {exporting ? 'Exporting...' : 'Export'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-[#111916] rounded-xl shadow-xl border border-emerald-900/30 py-1 z-10">
          {exportOptions.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <span className="text-gray-500">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
