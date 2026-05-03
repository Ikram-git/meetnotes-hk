import { Suspense } from 'react';
import { ChatLayout } from './chat-layout';

export const metadata = { title: 'AI Chat — Briva' };

export default function ChatPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">AI Chat</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Ask questions across every meeting in this workspace. Briva searches your transcripts and answers with citations.
        </p>
      </div>
      <Suspense fallback={<div className="h-[calc(100vh-220px)] min-h-[500px]" />}>
        <ChatLayout />
      </Suspense>
    </div>
  );
}
