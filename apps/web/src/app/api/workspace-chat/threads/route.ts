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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ threads: [] });
  }

  const { data: threads } = await admin()
    .from('workspace_chat_threads')
    .select('id, title, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ threads: threads ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { title?: string };

  const { data: thread, error } = await admin()
    .from('workspace_chat_threads')
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      title: body.title || null,
    })
    .select('id, title, created_at, updated_at')
    .single();

  if (error || !thread) {
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
  return NextResponse.json({ thread });
}
