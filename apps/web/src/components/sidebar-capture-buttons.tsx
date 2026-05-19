'use client';

import Link from 'next/link';
import { useLiveRecording } from './live-recording-provider';
import { useAudioRecording } from './audio-recording-provider';

function clock(secs: number): string {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Live / Record entries for the dashboard sidebar. They read the global
 * recording providers, so on every page they reflect whether a capture is
 * running — with a pulsing dot and live timer — not just static links.
 */
export function SidebarCaptureButtons() {
  const live = useLiveRecording();
  const audio = useAudioRecording();

  const liveActive =
    live.status === 'connecting' || live.status === 'live' || live.status === 'stopping';
  const recActive = audio.recState === 'recording' || audio.recState === 'finalizing';

  return (
    <div className="space-y-0.5">
      <Link
        href="/record-live"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          liveActive
            ? 'bg-red-500/15 text-red-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        {liveActive ? (
          <span className="w-4 h-4 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v4m0-4a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
        <span className="flex-1">{liveActive ? 'Live meeting' : 'Live transcription'}</span>
        {liveActive && (
          <span className="text-xs tabular-nums">
            {live.status === 'connecting' ? '•••' : clock(live.elapsed)}
          </span>
        )}
      </Link>

      <Link
        href={recActive ? '/upload' : '/upload?record=1'}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          recActive
            ? 'bg-red-500/15 text-red-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        {recActive ? (
          <span className="w-4 h-4 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </span>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="6" />
          </svg>
        )}
        <span className="flex-1">{recActive ? 'Recording' : 'Record audio'}</span>
        {recActive && (
          <span className="text-xs tabular-nums">
            {audio.recState === 'finalizing' ? '•••' : clock(audio.elapsed)}
          </span>
        )}
      </Link>
    </div>
  );
}
