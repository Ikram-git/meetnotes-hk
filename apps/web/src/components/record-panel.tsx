'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isTauri } from '@/lib/tauri';
import { useUpload } from './upload-provider';

export function RecordPanel() {
  const [desktop, setDesktop] = useState(false);
  const upload = useUpload();

  useEffect(() => setDesktop(isTauri()), []);

  return (
    <div className="bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-900/20">
        <h3 className="text-sm font-semibold text-white">Record a live meeting</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Capture system audio + transcribe in real time.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {desktop ? (
          <>
            <Link
              href="/record-live"
              className="flex items-center justify-center gap-2 w-full bg-purple-500 hover:bg-purple-400 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Start live transcription
            </Link>
            <Link
              href="/upload?record=1"
              className="flex items-center justify-center gap-2 w-full bg-red-500 hover:bg-red-400 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Record system audio
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/record-live"
              className="flex items-center justify-center gap-2 w-full bg-purple-500 hover:bg-purple-400 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Start live transcription
            </Link>
            <button
              onClick={upload.open}
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-lg text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload audio file
            </button>
            <p className="text-[11px] text-gray-600 text-center pt-1">
              Want to capture system audio?{' '}
              <Link
                href="/"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Get the desktop app →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
