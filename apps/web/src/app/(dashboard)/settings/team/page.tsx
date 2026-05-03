import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getActiveWorkspaceId, getUserRole } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import { TeamSettingsClient } from './team-client';

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?returnTo=/settings/team');

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your workspace and members</p>
        </div>
        <p className="text-sm text-gray-500">No workspace found.</p>
      </div>
    );
  }

  // Auth + membership are verified via getActiveWorkspaceId (which uses
  // the cookie-bound supabase client and RLS). Once we know the user
  // belongs to this workspace, fetch the full team via the admin client
  // — the cookie-bound client returns 0 rows in some serverless contexts
  // because RLS sees auth.uid() as null.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [workspaceRes, membersRes, invitesRes, currentRole] = await Promise.all([
    admin.from('workspaces').select('*').eq('id', workspaceId).maybeSingle(),
    admin
      .from('workspace_members')
      .select('role, joined_at, user:profiles(id, email, full_name, avatar_url)')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true }),
    admin
      .from('workspace_invites')
      .select('id, email, role, expires_at, created_at')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
    getUserRole(admin, user.id, workspaceId),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your workspace and members</p>
      </div>

      <TeamSettingsClient
        workspace={workspaceRes.data}
        members={(membersRes.data ?? []) as any}
        invites={invitesRes.data ?? []}
        currentUserId={user.id}
        currentUserRole={currentRole}
      />
    </div>
  );
}
