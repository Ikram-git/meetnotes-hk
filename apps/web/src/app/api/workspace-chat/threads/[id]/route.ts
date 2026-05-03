import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function authOwner(threadId: string, userId: string) {
  const { data: thread } = await admin()
    .from('workspace_chat_threads')
    .select('id, user_id, title, created_at, updated_at')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread || thread.user_id !== userId) return null;
  return thread;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await authOwner(id, user.id);
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: messages } = await admin()
    .from('workspace_chat_messages')
    .select('id, role, content, citations, turn_index, created_at')
    .eq('thread_id', id)
    .order('turn_index', { ascending: true });

  return NextResponse.json({ thread, messages: messages ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await authOwner(id, user.id);
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { title } = (await req.json()) as { title?: string };
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const { error } = await admin()
    .from('workspace_chat_threads')
    .update({ title: title.trim() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await authOwner(id, user.id);
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await admin().from('workspace_chat_threads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
