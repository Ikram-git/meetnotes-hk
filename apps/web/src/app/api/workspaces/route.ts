import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { listUserWorkspaces } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use the admin client for the membership read — auth is already
  // verified via getUser() above, and listUserWorkspaces filters by
  // user.id explicitly so we can't leak other users' workspaces.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const workspaces = await listUserWorkspaces(admin, user.id);
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

  // Use the admin client for the insert: we've already verified the
  // caller via getUser(). This sidesteps cases where RLS sees auth.uid()
  // as NULL in the SQL context (which has been observed in some Vercel
  // edge contexts even with a valid session cookie).
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: workspace, error } = await admin
    .from('workspaces')
    .insert({ name: name.trim(), owner_id: user.id })
    .select()
    .single();

  if (error || !workspace) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 });
  }

  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ workspace });
}
