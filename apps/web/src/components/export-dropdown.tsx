'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from './toast';

interface ExportDropdownProps {
  meetingId: string;
  disabled?: boolean;
}

export function ExportDropdown({ meetingId, disabled }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = async (type: string) => {
    if (type === 'share' || type === 'share-password') {
      const password = type === 'share-password'
        ? prompt('Set a password for this share link:')
        : null;
      if (type === 'share-password' && !password) return;

      setExporting('share');
      setOpen(false);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create link');
        await navigator.clipboard.writeText(data.shareUrl);
        toast(password ? 'Password-protected link copied!' : 'Share link copied to clipboard!');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to create share link', 'error');
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
            const pdfRes = await fetch(`/api/meetings/${meetingId}/export/pdf`);
            const html = await pdfRes.text();
            pdfWindow.document.write(html);
            pdfWindow.document.close();
          }
          toast('PDF opened in new tab');
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
          toast('Meeting notes copied to clipboard!');
          break;
        }
      }
    } catch (err) {
      toast('Export failed. Please try again.', 'error');
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    { type: 'share', label: 'Copy Share Link', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )},
    { type: 'share-password', label: 'Share with Password', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { type: 'clipboard', label: 'Copy as Text', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
    )},
    { type: 'pdf', label: 'Download PDF', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
  ];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || !!exporting}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-emerald-900/30 rounded-lg hover:bg-white/10 hover:text-emerald-400 transition disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="hidden sm:inline">{exporting ? 'Sharing...' : 'Share'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)}>
          {/* Mobile: bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#111916] rounded-t-2xl border-t border-emerald-900/30 p-2 pb-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
            {exportOptions.map(({ type, label, icon }) => (
              <button key={type} onClick={() => handleExport(type)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition">
                <span className="text-gray-500">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="hidden sm:block absolute right-0 mt-2 w-48 bg-[#111916] rounded-xl shadow-xl border border-emerald-900/30 py-1 z-50">
          {exportOptions.map(({ type, label, icon }) => (
            <button key={type} onClick={() => handleExport(type)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition">
              <span className="text-gray-500">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
