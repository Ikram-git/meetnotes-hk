import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getUserRole, isAdminOrOwner } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const { data: existing } = await a
    .from('meeting_comments')
    .select('user_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
  }

  const { content } = (await req.json()) as { content?: string };
  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const { error } = await a
    .from('meeting_comments')
    .update({ content: content.trim() })
    .eq('id', commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { id: meetingId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const a = admin();
  const { data: existing } = await a
    .from('meeting_comments')
    .select('user_id, meeting_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Author can always delete their own comment; admins/owners of the
  // workspace can delete any comment for moderation.
  let allowed = existing.user_id === user.id;
  if (!allowed) {
    const { data: meeting } = await a
      .from('meetings')
      .select('workspace_id')
      .eq('id', meetingId)
      .maybeSingle();
    if (meeting) {
      const role = await getUserRole(a, user.id, meeting.workspace_id);
      if (isAdminOrOwner(role)) allowed = true;
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await a.from('meeting_comments').delete().eq('id', commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
