import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getUserRole, isAdminOrOwner } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function loadTask(id: string) {
  return admin().from('tasks').select('*').eq('id', id).maybeSingle();
}

async function canMutate(task: any, userId: string): Promise<boolean> {
  if (!task) return false;
  if (task.assignee_user_id === userId) return true;
  if (task.created_by === userId) return true;
  const role = await getUserRole(admin(), userId, task.workspace_id);
  return isAdminOrOwner(role);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task } = await loadTask(id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await canMutate(task, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    description?: string | null;
    assignee_user_id?: string | null;
    assignee_label?: string | null;
    due_date?: string | null;
    priority?: 'low' | 'normal' | 'high';
    status?: 'todo' | 'in_progress' | 'done';
  };

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim().slice(0, 500);
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.assignee_user_id !== undefined) {
    update.assignee_user_id = body.assignee_user_id || null;
    // Clear the fallback label when a real assignee is set.
    if (body.assignee_user_id) update.assignee_label = null;
  }
  if (body.assignee_label !== undefined) update.assignee_label = body.assignee_label?.trim() || null;
  if (body.due_date !== undefined) update.due_date = body.due_date || null;
  if (body.priority) update.priority = body.priority;
  if (body.status) {
    update.status = body.status;
    update.completed_at = body.status === 'done' ? new Date().toISOString() : null;
    update.completed_by = body.status === 'done' ? user.id : null;
  }

  const { data, error } = await admin()
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: task } = await loadTask(id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete: creator or workspace admin
  const role = await getUserRole(admin(), user.id, task.workspace_id);
  if (task.created_by !== user.id && !isAdminOrOwner(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin().from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
