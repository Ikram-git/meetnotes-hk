import { createClient } from '@/lib/supabase/server';
import { getUserRole, isAdminOrOwner, type WorkspaceRole } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId: targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerRole = await getUserRole(supabase, user.id, id);
  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const { role } = (await req.json()) as { role?: WorkspaceRole };
  if (!role || !['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (role === 'owner') {
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'You are already owner' }, { status: 400 });
    }
    const { error: demoteError } = await supabase
      .from('workspace_members')
      .update({ role: 'admin' })
      .eq('workspace_id', id)
      .eq('user_id', user.id);
    if (demoteError) {
      return NextResponse.json({ error: demoteError.message }, { status: 500 });
    }
    const { error: ownerUpdateError } = await supabase
      .from('workspaces')
      .update({ owner_id: targetUserId })
      .eq('id', id);
    if (ownerUpdateError) {
      return NextResponse.json({ error: ownerUpdateError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', id)
    .eq('user_id', targetUserId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId: targetUserId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerRole = await getUserRole(supabase, user.id, id);
  if (!callerRole) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const isSelfRemove = targetUserId === user.id;
  if (!isSelfRemove && !isAdminOrOwner(callerRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data: target } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'Owner cannot leave; transfer ownership first' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', id)
    .eq('user_id', targetUserId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
