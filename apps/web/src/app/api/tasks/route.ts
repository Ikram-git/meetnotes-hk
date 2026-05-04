import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ tasks: [] });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope'); // 'me' | null
  const status = url.searchParams.get('status'); // 'todo' | 'in_progress' | 'done' | null
  const meetingId = url.searchParams.get('meetingId');

  const a = admin();
  let query = a
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (scope === 'me') query = query.eq('assignee_user_id', user.id);
  if (status) query = query.eq('status', status);
  if (meetingId) query = query.eq('meeting_id', meetingId);

  const { data: tasks } = await query;

  // Hydrate assignee profiles + meeting titles in one go.
  const userIds = Array.from(
    new Set((tasks ?? []).map((t) => t.assignee_user_id).filter(Boolean) as string[]),
  );
  const meetingIds = Array.from(
    new Set((tasks ?? []).map((t) => t.meeting_id).filter(Boolean) as string[]),
  );

  const [{ data: profiles }, { data: meetings }] = await Promise.all([
    userIds.length
      ? a.from('profiles').select('id, email, full_name, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    meetingIds.length
      ? a.from('meetings').select('id, title, created_at').in('id', meetingIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const meetingMap = new Map((meetings ?? []).map((m: any) => [m.id, m]));

  const hydrated = (tasks ?? []).map((t) => ({
    ...t,
    assignee: t.assignee_user_id ? profileMap.get(t.assignee_user_id) ?? null : null,
    meeting: t.meeting_id ? meetingMap.get(t.meeting_id) ?? null : null,
  }));

  return NextResponse.json({
    tasks: hydrated,
    currentUserId: user.id,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    assignee_user_id?: string | null;
    due_date?: string | null;
    priority?: 'low' | 'normal' | 'high';
    meeting_id?: string | null;
  };

  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const a = admin();
  const { data, error } = await a
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      meeting_id: body.meeting_id ?? null,
      title: body.title.trim().slice(0, 500),
      description: body.description?.trim() || null,
      assignee_user_id: body.assignee_user_id ?? null,
      due_date: body.due_date || null,
      priority: body.priority ?? 'normal',
      status: 'todo',
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
  return NextResponse.json({ task: data });
}
