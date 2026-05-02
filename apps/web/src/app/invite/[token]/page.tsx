import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import Link from 'next/link';
import { InviteAcceptClient } from './invite-client';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdmin(
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

  if (!invite) return <InviteError title="Invite not found" message="This invitation link is not valid." />;
  if (invite.revoked_at) return <InviteError title="Invite revoked" message="This invitation was revoked. Ask the workspace admin to send a new one." />;
  if (invite.accepted_at) return <InviteError title="Already accepted" message="This invitation has already been used." />;
  if (new Date(invite.expires_at) < new Date()) {
    return <InviteError title="Invite expired" message="This invitation has expired. Ask the workspace admin to send a new one." />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const workspace = Array.isArray(invite.workspace) ? invite.workspace[0] : invite.workspace;
  const inviter = Array.isArray(invite.inviter) ? invite.inviter[0] : invite.inviter;
  const inviterName = inviter?.full_name || inviter?.email || 'Someone';
  const wsName = workspace?.name || 'a workspace';

  return (
    <div className="min-h-screen bg-[#080c0a] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-[#111916] rounded-2xl border border-emerald-900/30 p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" /><rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" /><rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" /><rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Briva</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">You're invited</h1>
        <p className="text-sm text-gray-400 mb-6">
          <span className="text-white font-medium">{inviterName}</span> invited you to join{' '}
          <span className="text-white font-medium">{wsName}</span> as a <span className="text-emerald-400">{invite.role}</span>.
        </p>

        <InviteAcceptClient
          token={token}
          inviteEmail={invite.email}
          loggedInEmail={user?.email ?? null}
        />

        <p className="text-xs text-gray-600 mt-6 text-center">
          This invitation expires {new Date(invite.expires_at).toLocaleDateString()}.
        </p>
      </div>
    </div>
  );
}

function InviteError({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#080c0a] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-[#111916] rounded-2xl border border-red-900/30 p-8">
        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <Link
          href="/"
          className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-400 transition"
        >
          Go to Briva
        </Link>
      </div>
    </div>
  );
}
