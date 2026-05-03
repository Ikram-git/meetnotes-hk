import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function authMember(meetingId: string, userId: string) {
  const a = admin();
  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) return null;
  const { data: m } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!m) return null;
  return meeting;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meeting = await authMember(meetingId, user.id);
  if (!meeting) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const a = admin();
  const { data: comments } = await a
    .from('meeting_comments')
    .select('id, user_id, content, created_at, updated_at')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });

  const userIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
  const { data: profiles } = userIds.length
    ? await a
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)
    : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p]),
  );

  const hydrated = (comments ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    updated_at: c.updated_at,
    author: profileMap.get(c.user_id) ?? {
      id: c.user_id,
      email: '(unknown)',
      full_name: null,
      avatar_url: null,
    },
  }));

  return NextResponse.json({ comments: hydrated, currentUserId: user.id });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meeting = await authMember(meetingId, user.id);
  if (!meeting) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { content } = (await req.json()) as { content?: string };
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: 'Comment is too long (max 4000 chars)' }, { status: 400 });
  }

  const a = admin();
  const { data, error } = await a
    .from('meeting_comments')
    .insert({ meeting_id: meetingId, user_id: user.id, content: content.trim() })
    .select('id, user_id, content, created_at, updated_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}
