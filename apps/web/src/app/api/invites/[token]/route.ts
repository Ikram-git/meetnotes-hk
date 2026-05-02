import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite } = await admin
    .from('workspace_invites')
    .select(`
      id, email, role, expires_at, accepted_at, revoked_at,
      workspace:workspaces(id, name),
      inviter:profiles!invited_by(full_name, email)
    `)
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.revoked_at) {
    return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      workspace: invite.workspace,
      inviter: invite.inviter,
      expires_at: invite.expires_at,
    },
  });
}
