import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const font = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Briva - AI Meeting Notes for Professionals',
  description:
    'AI-powered meeting notes with multilingual transcription and smart summaries',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
