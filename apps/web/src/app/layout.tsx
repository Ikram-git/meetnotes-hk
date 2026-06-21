import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const font = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Briva — Hear Beyond Words. The AI workspace for meetings.',
  description:
    'Hear Beyond Words. Briva captures, summarises, and ships the action items from every meeting your team runs — across 30+ languages, with cross-meeting AI search and shared task workflows.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script runs before hydration to avoid a dark→light flash.
  // Light is the new default; users who explicitly toggled to dark
  // get their preference from localStorage.
  const noFlashScript = `(function(){try{var s=localStorage.getItem('briva-theme');var t=s==='dark'?'dark':'light';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('light');}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className={font.className}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
