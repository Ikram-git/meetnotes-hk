import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  generateInviteToken,
  getUserRole,
  isAdminOrOwner,
  type WorkspaceRole,
} from '@/lib/workspace';
import { getGates } from '@/lib/billing/gates';
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
  if (!isAdminOrOwner(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data: invites } = await a
    .from('workspace_invites')
    .select('id, email, role, expires_at, created_at, accepted_at, revoked_at')
    .eq('workspace_id', id)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  return NextResponse.json({ invites: invites ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const callerRole = await getUserRole(a, user.id, id);
  if (!isAdminOrOwner(callerRole)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { email, role } = (await req.json()) as {
    email?: string;
    role?: WorkspaceRole;
  };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const inviteRole: WorkspaceRole = role === 'admin' ? 'admin' : 'member';
  const normalisedEmail = email.trim().toLowerCase();

  const { data: workspace } = await a
    .from('workspaces')
    .select('name, owner_id')
    .eq('id', id)
    .maybeSingle();
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  // Plan-based seat cap (Free: 2, Pro: 5, Team/Enterprise: unlimited).
  const { data: ownerProfile } = await a
    .from('profiles')
    .select('subscription_tier')
    .eq('id', workspace.owner_id)
    .maybeSingle();
  const gates = getGates(ownerProfile?.subscription_tier);
  if (gates.maxWorkspaceMembers !== null) {
    const [{ count: memberCount }, { count: pendingInvites }] = await Promise.all([
      a
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', id),
      a
        .from('workspace_invites')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', id)
        .is('accepted_at', null)
        .is('revoked_at', null),
    ]);
    const seatsUsed = (memberCount ?? 0) + (pendingInvites ?? 0);
    if (seatsUsed >= gates.maxWorkspaceMembers) {
      return NextResponse.json(
        {
          error: `This workspace has reached its ${gates.maxWorkspaceMembers}-member limit. Upgrade the workspace owner's plan to invite more teammates.`,
        },
        { status: 402 },
      );
    }
  }

  const token = generateInviteToken();

  const { data: invite, error } = await a
    .from('workspace_invites')
    .insert({
      workspace_id: id,
      email: normalisedEmail,
      role: inviteRole,
      invited_by: user.id,
      token,
    })
    .select('id, email, role, token, expires_at')
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://meetbriva.com';
  const acceptUrl = `${appUrl}/invite/${token}`;
  const inviterName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    'Someone';

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Briva <noreply@meetbriva.com>',
        to: normalisedEmail,
        subject: `${inviterName} invited you to ${workspace.name} on Briva`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">You've been invited to ${escapeHtml(workspace.name)}</h2>
            <p style="margin:0 0 16px;color:#444">
              ${escapeHtml(inviterName)} invited you to collaborate on Briva &mdash; AI meeting notes.
            </p>
            <p style="margin:24px 0">
              <a href="${acceptUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
                Accept invitation
              </a>
            </p>
            <p style="margin:0;color:#666;font-size:13px">
              Or paste this link in your browser:<br/><a href="${acceptUrl}" style="color:#10b981;word-break:break-all">${acceptUrl}</a>
            </p>
            <p style="margin:24px 0 0;color:#888;font-size:12px">
              This invite expires in 7 days. If you weren't expecting this, you can ignore the email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.warn('[invites] email send failed:', err);
    }
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      accept_url: acceptUrl,
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
