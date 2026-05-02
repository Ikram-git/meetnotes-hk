import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId, getUserRole } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import { SettingsNav } from '@/components/settings-nav';
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
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team</p>
          <SettingsNav />
        </div>
        <p className="text-sm text-gray-500">No workspace found.</p>
      </div>
    );
  }

  const [workspaceRes, membersRes, invitesRes, currentRole] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle(),
    supabase
      .from('workspace_members')
      .select('role, joined_at, user:profiles(id, email, full_name, avatar_url)')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('workspace_invites')
      .select('id, email, role, expires_at, created_at')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
    getUserRole(supabase, user.id, workspaceId),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your team</p>
        <SettingsNav />
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
