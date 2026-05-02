import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Try cookie auth first (web app), then Bearer token (extension)
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File;

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 });
  }

  // Check minutes limit
  const { data: profile } = await supabase
    .from('profiles')
    .select('minutes_used_this_month, minutes_limit, subscription_tier')
    .eq('id', user.id)
    .single();

  if (profile && profile.minutes_used_this_month >= profile.minutes_limit) {
    return NextResponse.json(
      { error: 'Monthly limit reached. Upgrade to Pro.' },
      { status: 429 }
    );
  }

  // Upload to Supabase Storage
  const fileId = nanoid();
  const ext = audioFile.name.split('.').pop() || 'webm';
  const storagePath = `${user.id}/${fileId}.${ext}`;

  // Normalise MIME type — browsers report .mp4 as video/mp4 but Supabase bucket only allows audio/*
  let contentType = audioFile.type;
  if (contentType === 'video/mp4') contentType = 'audio/mp4';
  if (contentType === 'video/webm') contentType = 'audio/webm';

  // Convert to Buffer so Supabase uses our contentType, not the File's original MIME
  const fileBuffer = Buffer.from(await audioFile.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('meeting-audio')
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[Upload] Storage upload failed:', uploadError.message, { contentType, ext, size: audioFile.size });
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  // Create meeting record
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      audio_storage_path: storagePath,
      audio_format: ext,
      audio_size_bytes: audioFile.size,
      source: 'upload',
      status: 'uploaded',
    })
    .select()
    .single();

  if (meetingError) {
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }

  // Trigger transcription — forward whichever auth the request used
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const triggerHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  const cookie = req.headers.get('cookie');
  const authorization = req.headers.get('authorization');
  if (cookie) triggerHeaders['Cookie'] = cookie;
  if (authorization) triggerHeaders['Authorization'] = authorization;

  fetch(`${appUrl}/api/transcribe`, {
    method: 'POST',
    headers: triggerHeaders,
    body: JSON.stringify({ meetingId: meeting.id }),
  }).catch(console.error);

  return NextResponse.json({ meetingId: meeting.id, status: 'uploaded' }, { headers: CORS_HEADERS });
}
