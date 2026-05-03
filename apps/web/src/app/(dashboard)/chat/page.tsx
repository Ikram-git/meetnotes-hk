import { Suspense } from 'react';
import { ChatLayout } from './chat-layout';

export const metadata = { title: 'Briva AI' };

export default function ChatPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">B</span>
          Briva AI
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Ask questions across every meeting in this workspace. Briva searches your transcripts and answers with citations.
        </p>
      </div>
      <Suspense fallback={<div className="h-[calc(100vh-220px)] min-h-[500px]" />}>
        <ChatLayout />
      </Suspense>
    </div>
  );
}
