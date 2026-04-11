import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: meeting } = await supabase
    .from('meetings')
    .select('share_password')
    .eq('share_token', token)
    .single();

  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (meeting.share_password !== password) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
