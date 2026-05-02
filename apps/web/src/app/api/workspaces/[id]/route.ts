import { createClient } from '@/lib/supabase/server';
import { getUserRole, isAdminOrOwner } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: members } = await supabase
    .from('workspace_members')
    .select('role, joined_at, user:profiles(id, email, full_name, avatar_url)')
    .eq('workspace_id', id);

  return NextResponse.json({ workspace, members: members ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(supabase, user.id, id);
  if (!isAdminOrOwner(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
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

  const role = await getUserRole(supabase, user.id, id);
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const { count } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete your only workspace' },
      { status: 400 },
    );
  }

  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
