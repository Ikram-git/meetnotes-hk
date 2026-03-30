'use client';

import { useState, useCallback } from 'react';

const PLATFORM_GUIDES = [
  {
    key: 'meet',
    name: 'Google Meet',
    steps: [
      'Join your meeting in Google Chrome',
      'Use our Chrome Extension to record directly',
      'Or: Click "..." > "Record meeting" in Meet',
      'After the meeting, find the recording in Google Drive > Meet Recordings',
      'Download and upload the file here',
    ],
    formats: 'MP4',
  },
  {
    key: 'zoom',
    name: 'Zoom',
    steps: [
      'Open Zoom Settings > Recording',
      'Start your meeting and click "Record"',
      'After the meeting, find the file in ~/Documents/Zoom/',
      'Upload the .mp4 or .m4a file here',
    ],
    formats: 'MP4, M4A',
  },
  {
    key: 'teams',
    name: 'Teams',
    steps: [
      'During the meeting, click "..." > "Start recording"',
      'After the meeting, go to OneDrive > Recordings',
      'Download the .mp4 file',
      'Upload it here',
    ],
    formats: 'MP4',
  },
  {
    key: 'other',
    name: 'Other / In-Person',
    steps: [
      'Use your phone\'s voice recorder app during the meeting',
      'Transfer the audio file to your computer',
      'Upload the MP3, WAV, M4A, or WebM file here',
    ],
    formats: 'MP3, WAV, M4A, WebM, MP4',
  },
];

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'video/mp4'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  file: File | null;
  onClear: () => void;
  error?: string | null;
}

export function UploadDropzone({ onFileSelected, file, onClear, error }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const validateAndSet = (f: File) => {
    setLocalError(null);
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setLocalError('Unsupported file type. Please upload MP3, WAV, M4A, or WebM.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setLocalError('File too large. Maximum size is 500MB.');
      return;
    }
    onFileSelected(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSet(e.dataTransfer.files[0]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSet(e.target.files[0]);
  };

  const displayError = error || localError;

  return (
    <div className="space-y-6">
      {/* Platform Guide Tabs */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Where is your recording from?</h3>
        <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1 border border-emerald-900/30">
          {PLATFORM_GUIDES.map((p, i) => (
            <button key={p.key} onClick={() => setActiveGuide(i)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                activeGuide === i
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-emerald-900/20 rounded-lg p-4">
          <ol className="space-y-2">
            {PLATFORM_GUIDES[activeGuide].steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-400">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-gray-600">Supported formats: {PLATFORM_GUIDES[activeGuide].formats}</p>
        </div>
      </div>

      {/* Error */}
      {displayError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{displayError}</div>
      )}

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragActive ? 'border-emerald-500 bg-emerald-500/5 scale-[1.02]'
            : file ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-gray-800 hover:border-gray-700 bg-[#111916]'
        }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => !file && document.getElementById('audio-file-input')?.click()}
      >
        {file ? (
          <div>
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-white">{file.name}</p>
            <p className="mt-1 text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="mt-3 text-sm text-red-400 hover:text-red-300 font-medium">Remove file</button>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Drag & drop your audio file here, or{' '}
              <span className="text-emerald-400 font-semibold">browse</span>
            </p>
            <p className="mt-2 text-xs text-gray-600">Supports MP3, WAV, M4A, MP4, or WebM up to 500MB</p>
          </div>
        )}
        <input id="audio-file-input" type="file" className="hidden" accept=".mp3,.wav,.m4a,.webm,.mp4" onChange={handleFileChange} />
      </div>
    </div>
  );
}
