'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatClient } from './chat-client';
import { ThreadList, type ThreadSummary } from './thread-list';

export function ChatLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get('t');

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace-chat/threads');
      const data = await res.json();
      setThreads(data.threads ?? []);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const selectThread = (id: string | null) => {
    if (id) {
      router.push(`/chat?t=${id}`);
    } else {
      router.push('/chat');
    }
  };

  const onThreadCreated = (id: string) => {
    // The chat just got persisted under a new thread id. Push the URL
    // and refresh the sidebar so the new thread appears.
    router.push(`/chat?t=${id}`);
    loadThreads();
  };

  const onThreadDeleted = (id: string) => {
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (threadId === id) router.push('/chat');
  };

  const onThreadRenamed = (id: string, title: string) => {
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      <ThreadList
        threads={threads}
        loading={threadsLoading}
        activeThreadId={threadId}
        onSelect={selectThread}
        onNew={() => selectThread(null)}
        onDelete={onThreadDeleted}
        onRename={onThreadRenamed}
      />
      <ChatClient
        key={threadId ?? 'new'}
        threadId={threadId}
        onThreadCreated={onThreadCreated}
        onActivity={loadThreads}
      />
    </div>
  );
}
