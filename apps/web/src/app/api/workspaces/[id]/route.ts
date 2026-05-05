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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const role = await getUserRole(a, user.id, id);
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: workspace } = await a
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: memberRows } = await a
    .from('workspace_members')
    .select('user_id, role, joined_at')
    .eq('workspace_id', id);

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await a.from('profiles').select('id, email, full_name, avatar_url').in('id', userIds)
    : { data: [] as any[] };
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const members = (memberRows ?? []).map((m) => ({
    role: m.role,
    joined_at: m.joined_at,
    user: profileMap.get(m.user_id) ?? {
      id: m.user_id,
      email: '(unknown)',
      full_name: null,
      avatar_url: null,
    },
  }));

  return NextResponse.json({ workspace, members });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const role = await getUserRole(a, user.id, id);
  if (!isAdminOrOwner(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await a
    .from('workspaces')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const role = await getUserRole(a, user.id, id);
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const { count } = await a
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete your only workspace' },
      { status: 400 },
    );
  }

  const { error } = await a.from('workspaces').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
