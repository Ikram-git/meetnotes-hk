import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getActiveWorkspaceId, getUserRole, isAdminOrOwner } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

type Policy = 'keep' | 'delete_after_processing' | 'delete_after_7_days' | 'delete_after_30_days';
const VALID_POLICIES: Policy[] = ['keep', 'delete_after_processing', 'delete_after_7_days', 'delete_after_30_days'];

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
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

  const a = admin();
  const { data: ws } = await a
    .from('workspaces')
    .select('audio_retention')
    .eq('id', workspaceId)
    .maybeSingle();
  const role = await getUserRole(a, user.id, workspaceId);

  return NextResponse.json({
    policy: (ws?.audio_retention as Policy) || 'keep',
    canEdit: isAdminOrOwner(role),
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

  const a = admin();
  const role = await getUserRole(a, user.id, workspaceId);
  if (!isAdminOrOwner(role)) {
    return NextResponse.json({ error: 'Only workspace owners and admins can change this.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const policy = body?.policy as Policy | undefined;
  if (!policy || !VALID_POLICIES.includes(policy)) {
    return NextResponse.json({ error: 'Invalid policy' }, { status: 400 });
  }

  const { error } = await a
    .from('workspaces')
    .update({ audio_retention: policy })
    .eq('id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policy });
}
