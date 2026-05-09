'use client';

import { useState } from 'react';
import { BookDemoDialog } from './book-demo-dialog';

interface BookDemoButtonProps {
  variant?: 'primary' | 'ghost' | 'link';
  size?: 'sm' | 'md';
  className?: string;
  children?: React.ReactNode;
}

const VARIANTS: Record<NonNullable<BookDemoButtonProps['variant']>, string> = {
  primary:
    'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25',
  ghost:
    'text-gray-300 hover:bg-white/5 border border-gray-800 hover:border-emerald-500/40',
  link:
    'text-gray-400 hover:text-white',
};

const SIZES: Record<NonNullable<BookDemoButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-xs sm:text-sm',
  md: 'px-5 py-3 text-sm',
};

export function BookDemoButton({
  variant = 'ghost',
  size = 'sm',
  className = '',
  children = 'Book a demo',
}: BookDemoButtonProps) {
  const [open, setOpen] = useState(false);
  const isLink = variant === 'link';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${
          isLink
            ? `font-medium transition ${VARIANTS[variant]}`
            : `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]}`
        } ${className}`}
      >
        {children}
      </button>
      <BookDemoDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
