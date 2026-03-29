'use client';

import { useState, useEffect, useRef } from 'react';

interface SpeakerNamingModalProps {
  open: boolean;
  speakerLabel: string;
  currentName: string;
  onSave: (label: string, name: string) => void;
  onClose: () => void;
}

export function SpeakerNamingModal({ open, speakerLabel, currentName, onSave, onClose }: SpeakerNamingModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, currentName]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onSave(speakerLabel, trimmed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#111916] border border-emerald-900/30 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Rename Speaker</h3>
        <p className="text-sm text-gray-500 mb-4">
          Change the display name for <span className="text-emerald-400">{speakerLabel}</span>
        </p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Enter name..."
          className="w-full bg-white/5 border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
