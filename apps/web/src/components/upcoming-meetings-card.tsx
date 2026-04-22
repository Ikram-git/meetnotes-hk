'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isTauri } from '@/lib/tauri';

interface CalEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  hangoutLink: string | null;
  conferenceLink: string | null;
  attendees: { email?: string; name?: string }[];
}

function formatWhen(start: string | null): string {
  if (!start) return '';
  const d = new Date(start);
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffMin < 0 && diffMin > -120) return `Started ${Math.abs(diffMin)}m ago · ${time}`;
  if (diffMin >= 0 && diffMin <= 60) return `In ${diffMin}m · ${time}`;
  return time;
}

export function UpcomingMeetingsCard() {
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => setDesktop(isTauri()), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/google/calendar/events');
        const data = await res.json();
        if (cancelled) return;
        setConnected(!!data.connected);
        setEvents(data.events || []);
      } catch {
        if (!cancelled) {
          setConnected(false);
          setEvents([]);
        }
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (connected === null) return null;
  if (connected === false) {
    return (
      <div className="mb-6 bg-[#111916] border border-emerald-900/30 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Connect Google Calendar</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              See your upcoming meetings here and auto-link recordings to the right event.
            </p>
          </div>
          <Link
            href="/settings"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex-shrink-0"
          >
            Connect in Settings →
          </Link>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="mb-6 bg-[#111916] border border-emerald-900/30 rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white">No upcoming meetings</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Nothing on your calendar in the next 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-emerald-900/20 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Upcoming meetings
        </h3>
        <span className="text-[10px] text-gray-600">Next 24h</span>
      </div>
      <ul className="divide-y divide-emerald-900/20">
        {events.slice(0, 5).map((ev) => {
          const link = ev.hangoutLink || ev.conferenceLink;
          return (
            <li key={ev.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{ev.summary}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatWhen(ev.start)}
                  {ev.attendees.length > 0 && ` · ${ev.attendees.length} attendee${ev.attendees.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Join
                  </a>
                )}
                {desktop && (
                  <Link
                    href="/record-live"
                    className="text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Record
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
