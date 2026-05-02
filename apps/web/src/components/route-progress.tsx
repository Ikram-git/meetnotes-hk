'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Slim top-of-page progress bar that animates whenever the user navigates
 * between routes. Gives instant feedback before server components stream
 * back. Drops the bar when the new pathname commits.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const prevKeyRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (prevKeyRef.current === null) {
      prevKeyRef.current = key;
      return;
    }
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    setProgress(15);
    timersRef.current.push(setTimeout(() => setProgress(45), 80));
    timersRef.current.push(setTimeout(() => setProgress(75), 240));
    timersRef.current.push(setTimeout(() => setProgress(95), 600));
    timersRef.current.push(
      setTimeout(() => {
        setProgress(100);
        timersRef.current.push(setTimeout(() => setProgress(null), 200));
      }, 900),
    );

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [pathname, searchParams]);

  if (progress === null) return null;

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress < 100 ? 1 : 0 }}
      />
    </div>
  );
}
