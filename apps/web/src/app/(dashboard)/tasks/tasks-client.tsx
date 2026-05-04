'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { confirmDialog } from '@/components/confirm-dialog';

type Status = 'todo' | 'in_progress' | 'done';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  workspace_id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  assignee_label: string | null;
  due_date: string | null;
  status: Status;
  priority: 'low' | 'normal' | 'high';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee: Profile | null;
  meeting: { id: string; title: string | null; created_at: string } | null;
}

const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done'];
const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export function TasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'me'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = scope === 'me' ? '/api/tasks?scope=me' : '/api/tasks';
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setCurrentUserId(data.currentUserId ?? null);

      // Pull member list for the assignee dropdown (one call, cached for the
      // life of the page).
      if (members.length === 0) {
        // Fetch active workspace's members. We piggyback the workspaces list
        // and then ask for the active workspace's members via /api/workspaces.
        try {
          const wsRes = await fetch('/api/workspaces');
          const wsData = await wsRes.json();
          const active =
            wsData.workspaces?.find((w: any) =>
              document.cookie.includes(`briva_workspace_id=${w.id}`),
            ) ?? wsData.workspaces?.[0];
          if (active) {
            const mRes = await fetch(`/api/workspaces/${active.id}`);
            const mData = await mRes.json();
            setMembers(
              (mData.members ?? [])
                .map((m: any) => m.user)
                .filter(Boolean) as Profile[],
            );
          }
        } catch {
          // Non-fatal — assignee dropdown just lacks options
        }
      }
    } finally {
      setLoading(false);
    }
  }, [scope, members.length]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const buckets: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) buckets[t.status].push(t);
    return buckets;
  }, [tasks]);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks((ts) =>
        ts.map((t) =>
          t.id === id
            ? {
                ...t,
                ...task,
                assignee: patch.assignee_user_id
                  ? members.find((m) => m.id === patch.assignee_user_id) ?? null
                  : patch.assignee_user_id === null
                    ? null
                    : t.assignee,
              }
            : t,
        ),
      );
    }
  };

  const deleteTask = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Delete task',
      message: 'This task will be permanently removed.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setTasks((ts) => ts.filter((t) => t.id !== id));
  };

  const counts = {
    todo: grouped.todo.length,
    in_progress: grouped.in_progress.length,
    done: grouped.done.length,
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Action items pulled from your meetings, plus anything else your team is working on.
          </p>
        </div>

        <div className="flex items-center bg-white/5 border border-emerald-900/30 rounded-lg p-1">
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              scope === 'all' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All tasks
          </button>
          <button
            onClick={() => setScope('me')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              scope === 'me' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            My tasks
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#111916] border border-emerald-900/30 rounded-xl p-3 space-y-2">
              <div className="skeleton-shimmer h-4 w-24 rounded" />
              {[0, 1].map((j) => (
                <div key={j} className="skeleton-shimmer h-16 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-10 text-center">
          <p className="text-sm text-white">No tasks yet.</p>
          <p className="text-xs text-gray-500 mt-1">
            New action items from your meetings will land here automatically.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="bg-[#0d1311] border border-emerald-900/30 rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between px-1 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {STATUS_LABELS[s]}
                </h2>
                <span className="text-[11px] text-gray-600">{counts[s]}</span>
              </div>
              <div className="space-y-2">
                {grouped[s].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    currentUserId={currentUserId}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                  />
                ))}
                {grouped[s].length === 0 && (
                  <p className="text-[11px] text-gray-600 text-center py-4">No tasks.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  members,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  task: Task;
  members: Profile[];
  currentUserId: string | null;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const overdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date(new Date().toDateString());

  return (
    <div className="bg-[#111916] border border-emerald-900/30 rounded-lg p-3 group">
      <div className="flex items-start gap-2">
        <button
          onClick={() =>
            onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
          }
          className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition ${
            task.status === 'done'
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-700 hover:border-emerald-500'
          }`}
          aria-label="Toggle complete"
        >
          {task.status === 'done' && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${
              task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'
            }`}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
            {/* Assignee */}
            <AssigneeSelect
              task={task}
              members={members}
              onChange={(uid) => onUpdate(task.id, { assignee_user_id: uid })}
            />
            {/* Status */}
            <StatusSelect
              status={task.status}
              onChange={(s) => onUpdate(task.id, { status: s })}
            />
            {/* Due date */}
            {task.due_date && (
              <span className={`px-1.5 py-0.5 rounded ${
                overdue
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'bg-white/5 text-gray-400 border border-emerald-900/30'
              }`}>
                {formatDue(task.due_date)}
              </span>
            )}
            {/* Source meeting */}
            {task.meeting && (
              <Link
                href={`/meetings/${task.meeting.id}`}
                className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-emerald-900/30 hover:text-emerald-400 hover:border-emerald-500/50 transition truncate max-w-[160px]"
                title={task.meeting.title || 'Meeting'}
              >
                📓 {task.meeting.title || 'Meeting'}
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition"
          aria-label="Delete task"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AssigneeSelect({
  task,
  members,
  onChange,
}: {
  task: Task;
  members: Profile[];
  onChange: (uid: string | null) => void;
}) {
  return (
    <select
      value={task.assignee_user_id ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-white/5 border border-emerald-900/30 rounded px-1.5 py-0.5 text-[11px] text-gray-300 max-w-[140px]"
    >
      <option value="" className="bg-[#111916]">
        {task.assignee_label ? `· ${task.assignee_label}` : 'Unassigned'}
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id} className="bg-[#111916]">
          {m.full_name || m.email}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({
  status,
  onChange,
}: {
  status: Status;
  onChange: (s: Status) => void;
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as Status)}
      className="bg-white/5 border border-emerald-900/30 rounded px-1.5 py-0.5 text-[11px] text-gray-300"
    >
      <option value="todo" className="bg-[#111916]">To do</option>
      <option value="in_progress" className="bg-[#111916]">In progress</option>
      <option value="done" className="bg-[#111916]">Done</option>
    </select>
  );
}

function formatDue(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date(new Date().toDateString());
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0 && diffDays > -7) return `${-diffDays}d ago`;
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays}d`;
  return d.toLocaleDateString();
}
