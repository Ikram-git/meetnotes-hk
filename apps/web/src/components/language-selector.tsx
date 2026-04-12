'use client';

import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES, BILINGUAL_OPTION, getLanguageByCode } from '@/lib/i18n/languages';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  /** Optional label shown before the flag, e.g. "Language:" */
  label?: string;
  /** Visual size */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

const ALL_OPTIONS = [BILINGUAL_OPTION, ...SUPPORTED_LANGUAGES];

export function LanguageSelector({
  value,
  onChange,
  label,
  size = 'sm',
  disabled,
  className = '',
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = getLanguageByCode(value) || BILINGUAL_OPTION;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const triggerClasses =
    size === 'md'
      ? 'px-3.5 py-2.5 text-sm'
      : 'px-3 py-1.5 text-xs';

  const isFullWidth = className.includes('w-full');

  return (
    <div ref={wrapperRef} className={`relative ${isFullWidth ? 'block w-full' : 'inline-block'} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 ${isFullWidth ? 'w-full justify-between' : ''} ${triggerClasses} font-medium text-gray-300 bg-white/5 border border-emerald-900/30 rounded-lg hover:bg-white/10 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {label && <span className="text-gray-500 mr-1">{label}</span>}
          <span className="text-base leading-none flex-shrink-0">{current.flag}</span>
          <span className="truncate">{current.nativeName}</span>
        </span>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-[#111916] border border-emerald-900/30 rounded-xl shadow-xl z-50 py-1 animate-fade-in"
        >
          {ALL_OPTIONS.map((lang, idx) => {
            const isSelected = lang.code === value;
            const isBilingual = lang.code === 'both';
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                } ${isBilingual && idx === 0 ? 'border-b border-emerald-900/20 mb-1 pb-2.5' : ''}`}
              >
                <span className="text-lg leading-none flex-shrink-0">{lang.flag}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{lang.nativeName}</span>
                  {'name' in lang && lang.nativeName !== lang.name && (
                    <span className="block truncate text-xs text-gray-500">{lang.name}</span>
                  )}
                </span>
                {isSelected && (
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
