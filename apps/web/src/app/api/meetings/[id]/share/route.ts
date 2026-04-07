import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// POST — generate a share token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: meeting } = await supabase
    .from('meetings').select('id, share_token').eq('id', meetingId).eq('user_id', user.id).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  // Reuse existing token or create new
  let token = meeting.share_token;
  if (!token) {
    token = nanoid(12);
    await supabase.from('meetings').update({ share_token: token }).eq('id', meetingId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({ shareUrl: `${appUrl}/shared/${token}` });
}

// DELETE — revoke share link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('meetings').update({ share_token: null }).eq('id', meetingId).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
