'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Slim top-of-page progress bar that animates whenever the user navigates
 * between routes OR clicks a link. Click-driven start gives instant
 * feedback on slow devices where React rendering itself adds latency.
 *
 * Lifecycle:
 *  1. User clicks an internal link (or submits a form) → we start the bar
 *     immediately on the click event, before React even mounts the new page.
 *  2. Pathname changes → we ramp it up to 95%.
 *  3. Once the new page is committed, we finish it to 100% and fade.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const prevKeyRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inFlightRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const finish = () => {
    clearTimers();
    setProgress(100);
    inFlightRef.current = false;
    timersRef.current.push(setTimeout(() => setProgress(null), 220));
  };

  const start = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    clearTimers();
    setProgress(10);
    timersRef.current.push(setTimeout(() => setProgress(35), 80));
    timersRef.current.push(setTimeout(() => setProgress(60), 280));
    timersRef.current.push(setTimeout(() => setProgress(80), 700));
    timersRef.current.push(setTimeout(() => setProgress(92), 1500));
    // Safety net — if the navigation never resolves (e.g. hash anchor on
    // same page), force the bar to finish so it doesn't sit forever.
    timersRef.current.push(setTimeout(() => finish(), 6000));
  };

  // Pathname change → finish the bar (or kick it off if the click handler
  // didn't fire, e.g. router.push from code).
  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (prevKeyRef.current === null) {
      prevKeyRef.current = key;
      return;
    }
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    if (!inFlightRef.current) start();
    // Give the new page one paint to render skeletons before we finish.
    timersRef.current.push(setTimeout(() => finish(), 80));
  }, [pathname, searchParams]);

  // Catch clicks on internal links so the bar starts before any work happens.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const link = target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        // External — only treat as in-app if it's our own origin
        try {
          const url = new URL(href);
          if (url.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      // Same URL? Don't show a bar.
      const currentKey = `${pathname}?${searchParams.toString()}`;
      const targetUrl = new URL(href, window.location.origin);
      const targetKey = `${targetUrl.pathname}?${targetUrl.searchParams.toString()}`;
      if (targetKey === currentKey) return;

      start();
    };

    const onSubmit = () => {
      // Form submissions usually trigger a server action / navigation.
      start();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [pathname, searchParams]);

  if (progress === null) return null;

  return (
    <>
      <div className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 shadow-[0_0_10px_rgba(16,185,129,0.7)] transition-all duration-200 ease-out"
          style={{
            width: `${progress}%`,
            opacity: progress < 100 ? 1 : 0,
          }}
        />
      </div>
      {/* Show wait cursor only while a navigation is genuinely in flight */}
      {progress < 100 && progress > 5 && (
        <style>{`html, body { cursor: progress !important; }`}</style>
      )}
    </>
  );
}
