import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MeetNotes - AI Meeting Notes for Professionals',
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
    <html lang="en">
      <body className={inter.className}><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
