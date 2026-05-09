import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const font = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Briva — AI meeting notes with live transcription & team workspaces',
  description:
    'Record meetings live or upload audio, get AI summaries and action items, ask questions about any meeting, and share a workspace with your team. 30+ languages with code-switching.',
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
      </body>
    </html>
  );
}
