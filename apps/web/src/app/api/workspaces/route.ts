import { createClient } from '@/lib/supabase/server';
import { listUserWorkspaces } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaces = await listUserWorkspaces(supabase, user.id);
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name: name.trim(), owner_id: user.id })
    .select()
    .single();

  if (error || !workspace) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ workspace });
}
