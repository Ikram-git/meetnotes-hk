import { ChatClient } from './chat-client';

export const metadata = { title: 'AI Chat — Briva' };

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">AI Chat</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Ask questions across every meeting in this workspace. Briva searches your transcripts and answers with citations.
        </p>
      </div>
      <ChatClient />
    </div>
  );
}
