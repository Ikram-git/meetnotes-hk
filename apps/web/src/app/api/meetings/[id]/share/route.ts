import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST — generate or update share link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const password = body.password || null;

  // Verify ownership
  const { data: meeting } = await supabase
    .from('meetings').select('id, share_token, user_id').eq('id', meetingId).single();
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  // Reuse existing token or create new. 21 chars = ~126 bits of
  // entropy, the nanoid default — well above any realistic
  // brute-force or enumeration risk. Existing 12-char tokens stay
  // valid because we only mint new ones when there isn't one already.
  let token = meeting.share_token;
  if (!token) {
    token = nanoid(21);
  }

  // Use admin client to bypass RLS for the update
  const admin = getAdminSupabase();
  const { error: updateError } = await admin.from('meetings').update({
    share_token: token,
    share_password: password,
  }).eq('id', meetingId);

  if (updateError) {
    console.error('[Share] Update failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({
    shareUrl: `${appUrl}/shared/${token}`,
    hasPassword: !!password,
  });
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

  const admin = getAdminSupabase();
  await admin.from('meetings').update({
    share_token: null,
    share_password: null,
  }).eq('id', meetingId);
  return NextResponse.json({ success: true });
}
