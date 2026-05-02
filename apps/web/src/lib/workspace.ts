import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const COOKIE_NAME = 'briva_workspace_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

/**
 * Resolve the active workspace for the current request. Reads the
 * `briva_workspace_id` cookie; if missing or invalid (user is not a member),
 * falls back to the user's first workspace and updates the cookie.
 *
 * Caller must have already authenticated `userId`. Returns null only if the
 * user has zero workspaces, which shouldn't happen post-migration since the
 * signup trigger creates one.
 */
export async function getActiveWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  if (cookieValue) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', cookieValue)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return cookieValue;
  }

  const { data: first } = await supabase
    .from('workspace_members')
    .select('workspace_id, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return first?.workspace_id ?? null;
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, workspaceId, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function listUserWorkspaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkspaceSummary[]> {
  const { data } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(id, name)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  if (!data) return [];
  return data
    .filter((row: any) => row.workspace)
    .map((row: any) => ({
      id: row.workspace.id,
      name: row.workspace.name,
      role: row.role as WorkspaceRole,
    }));
}

/**
 * Returns the caller's role in the given workspace, or null if not a member.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as WorkspaceRole | undefined) ?? null;
}

export function isAdminOrOwner(role: WorkspaceRole | null): boolean {
  return role === 'admin' || role === 'owner';
}

export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
