import { createClient as createServerClient } from '@/lib/supabase/server';
import { setActiveWorkspaceCookie } from '@/lib/workspace';
import { syncWorkspaceSeats } from '@/lib/billing/seats';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: invite } = await admin
    .from('workspace_invites')
    .select('id, workspace_id, email, role, expires_at, accepted_at, revoked_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.revoked_at) return NextResponse.json({ error: 'Invite revoked' }, { status: 410 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: 'This invite was sent to a different email address',
        invite_email: invite.email,
        your_email: user.email,
      },
      { status: 403 },
    );
  }

  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
      });
    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  await admin
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Bump the owner's Stripe seat count if they're on Team plan.
  await syncWorkspaceSeats(admin, invite.workspace_id);

  await setActiveWorkspaceCookie(invite.workspace_id);

  return NextResponse.json({
    success: true,
    workspace_id: invite.workspace_id,
  });
}
