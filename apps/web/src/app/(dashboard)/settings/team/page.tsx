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

  const [workspaceRes, memberRowsRes, invitesRes, currentRole] = await Promise.all([
    admin.from('workspaces').select('*').eq('id', workspaceId).maybeSingle(),
    admin
      .from('workspace_members')
      .select('user_id, role, joined_at')
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

  // Hydrate user profiles for each membership in a separate query — the
  // PostgREST join syntax (user:profiles(...)) was returning empty even
  // when the underlying rows existed.
  const memberRows = memberRowsRes.data ?? [];
  const userIds = memberRows.map((r) => r.user_id);
  const { data: profileRows } = userIds.length
    ? await admin
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)
    : { data: [] };
  const profileMap = new Map(
    (profileRows ?? []).map((p: { id: string; email: string; full_name: string | null; avatar_url: string | null }) => [p.id, p]),
  );
  const members = memberRows.map((r) => ({
    role: r.role as 'owner' | 'admin' | 'member',
    joined_at: r.joined_at,
    user: profileMap.get(r.user_id) ?? {
      id: r.user_id,
      email: '(unknown)',
      full_name: null,
      avatar_url: null,
    },
  }));

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Team</h1>
          {workspaceRes.data?.name && (
            <span className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              {workspaceRes.data.name}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Manage members and invites for the workspace you&apos;re currently viewing.
          Switch workspace in the top-left to manage a different one.
        </p>
      </div>

      <TeamSettingsClient
        workspace={workspaceRes.data}
        members={members}
        invites={invitesRes.data ?? []}
        currentUserId={user.id}
        currentUserRole={currentRole}
      />
    </div>
  );
}
