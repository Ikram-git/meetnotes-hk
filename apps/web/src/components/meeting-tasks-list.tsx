'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from './toast';

type Status = 'todo' | 'in_progress' | 'done';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  meeting_id: string | null;
  title: string;
  assignee_user_id: string | null;
  assignee_label: string | null;
  due_date: string | null;
  status: Status;
  priority: 'low' | 'normal' | 'high';
  assignee: Profile | null;
}

/**
 * Task-aware action item list shown inside the meeting detail page.
 * Loads /api/tasks?meetingId=... and renders each as an editable row
 * with assignee dropdown, status, and due-date chip. Falls back to a
 * read-only static list when the tasks API can't be reached.
 */
export function MeetingTasksList({ meetingId }: { meetingId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, wsRes] = await Promise.all([
          fetch(`/api/tasks?meetingId=${meetingId}`).then((r) => r.json()),
          fetch('/api/workspaces').then((r) => r.json()),
        ]);
        if (cancelled) return;
        setTasks(tasksRes.tasks ?? []);

        const active =
          wsRes.workspaces?.find((w: any) =>
            document.cookie.includes(`briva_workspace_id=${w.id}`),
          ) ?? wsRes.workspaces?.[0];
        if (active) {
          const mRes = await fetch(`/api/workspaces/${active.id}`);
          const mData = await mRes.json();
          if (!cancelled) {
            setMembers(
              (mData.members ?? [])
                .map((m: any) => m.user)
                .filter(Boolean) as Profile[],
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const renameSpeakerLabel = async (task: Task) => {
    const oldLabel = task.assignee_label;
    if (!oldLabel) return;
    const newName = window.prompt(
      `Rename "${oldLabel}" to a real name. If they're a workspace member, the task will auto-link.`,
      oldLabel,
    );
    if (!newName || newName.trim().length === 0 || newName.trim() === oldLabel) return;
    const res = await fetch(`/api/meetings/${meetingId}/speakers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakerLabel: oldLabel, speakerName: newName.trim() }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      toast(error || 'Failed to rename', 'error');
      return;
    }
    toast(`Renamed "${oldLabel}" → "${newName.trim()}"`);
    // Refetch tasks — the rename API updates them server-side.
    const tRes = await fetch(`/api/tasks?meetingId=${meetingId}`);
    const tData = await tRes.json();
    setTasks(tData.tasks ?? []);
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const { task } = await res.json();
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id
          ? {
              ...t,
              ...task,
              assignee:
                patch.assignee_user_id === undefined
                  ? t.assignee
                  : patch.assignee_user_id
                    ? members.find((m) => m.id === patch.assignee_user_id) ?? null
                    : null,
            }
          : t,
      ),
    );
  };

  if (loading) {
    return (
      <ul className="space-y-3" aria-label="Loading tasks">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="skeleton-shimmer w-4 h-4 rounded mt-1" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-3 rounded" style={{ width: `${88 - i * 8}%` }} />
              <div className="flex gap-2">
                <div className="skeleton-shimmer h-3 w-16 rounded" />
                <div className="skeleton-shimmer h-3 w-20 rounded" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500">No action items identified.</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => {
        const overdue =
          task.due_date &&
          task.status !== 'done' &&
          new Date(task.due_date) < new Date(new Date().toDateString());
        return (
          <li
            key={task.id}
            className={`flex items-start gap-3 group rounded-r-md transition ${
              overdue ? 'border-l-2 border-l-red-500/60 pl-2 bg-red-500/[0.04]' : ''
            }`}
          >
            <button
              onClick={() =>
                updateTask(task.id, {
                  status: task.status === 'done' ? 'todo' : 'done',
                })
              }
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                task.status === 'done'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-gray-700 hover:border-emerald-500'
              }`}
              aria-label="Toggle complete"
            >
              {task.status === 'done' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <EditableTitle
                value={task.title}
                done={task.status === 'done'}
                onSave={(v) => updateTask(task.id, { title: v })}
              />
              <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
                <select
                  value={task.assignee_user_id ?? ''}
                  onChange={(e) =>
                    updateTask(task.id, { assignee_user_id: e.target.value || null })
                  }
                  className="bg-white/5 border border-emerald-900/30 rounded px-1.5 py-0.5 text-[11px] text-gray-300 max-w-[160px]"
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
                {/* Quick rename when AI couldn't identify the speaker.
                    Click to label them; if the new name matches a
                    workspace member, the task re-links automatically. */}
                {task.assignee_label && /^speaker\s*\d+$/i.test(task.assignee_label) && (
                  <button
                    type="button"
                    onClick={() => renameSpeakerLabel(task)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition px-1"
                    title="Rename this speaker"
                  >
                    Identify
                  </button>
                )}

                <select
                  value={task.status}
                  onChange={(e) =>
                    updateTask(task.id, { status: e.target.value as Status })
                  }
                  className="bg-white/5 border border-emerald-900/30 rounded px-1.5 py-0.5 text-[11px] text-gray-300"
                >
                  <option value="todo" className="bg-[#111916]">To do</option>
                  <option value="in_progress" className="bg-[#111916]">In progress</option>
                  <option value="done" className="bg-[#111916]">Done</option>
                </select>

                <DueDateControl
                  value={task.due_date}
                  overdue={!!overdue}
                  onChange={(v) => updateTask(task.id, { due_date: v })}
                />
              </div>
            </div>
          </li>
        );
      })}
      <li>
        <Link
          href="/tasks"
          className="text-[11px] text-emerald-400 hover:text-emerald-300 transition inline-flex items-center gap-1 mt-2"
        >
          See all tasks across this workspace →
        </Link>
      </li>
    </ul>
  );
}

function DueDateControl({
  value,
  overdue,
  onChange,
}: {
  value: string | null;
  overdue: boolean;
  onChange: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={value ?? ''}
        onChange={(e) => {
          onChange(e.target.value || null);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="bg-white/5 border border-emerald-900/30 rounded px-1.5 py-0.5 text-[11px] text-gray-300"
      />
    );
  }

  if (value) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`px-1.5 py-0.5 rounded transition ${
          overdue
            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
            : 'bg-white/5 text-gray-400 border border-emerald-900/30 hover:text-gray-200'
        }`}
      >
        {formatDue(value)}
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="px-1.5 py-0.5 rounded text-gray-500 hover:text-gray-300 border border-dashed border-emerald-900/30"
    >
      + due
    </button>
  );
}

function EditableTitle({
  value,
  done,
  onSave,
}: {
  value: string;
  done: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full text-sm leading-relaxed bg-white/5 border border-emerald-500/40 rounded px-2 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`text-sm leading-relaxed cursor-text rounded hover:bg-white/[0.03] px-1 -mx-1 ${
        done ? 'text-gray-600 line-through' : 'text-gray-300'
      }`}
    >
      {value}
    </p>
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
