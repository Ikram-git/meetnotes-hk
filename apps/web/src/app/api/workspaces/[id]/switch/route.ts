import { createClient } from '@/lib/supabase/server';
import { getUserRole, setActiveWorkspaceCookie } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getUserRole(supabase, user.id, id);
  if (!role) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  await setActiveWorkspaceCookie(id);
  return NextResponse.json({ success: true });
}
