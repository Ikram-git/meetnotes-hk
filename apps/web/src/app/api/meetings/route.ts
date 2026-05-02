import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  const query = supabase.from('meetings').select('*').order('created_at', { ascending: false });
  const { data: meetings, error } = workspaceId
    ? await query.eq('workspace_id', workspaceId)
    : await query.eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Try cookie auth first, then Bearer token
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      audio_storage_path: body.audio_storage_path,
      audio_format: body.audio_format,
      audio_size_bytes: body.audio_size_bytes,
      source: body.source || 'upload',
      status: 'uploaded',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(meeting);
}
