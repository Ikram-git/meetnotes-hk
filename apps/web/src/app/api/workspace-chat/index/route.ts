import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { indexMeetingForChat } from '@/lib/ai/index-meeting';
import { MissingEmbeddingKeyError } from '@/lib/ai/embed';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

/**
 * Backfill: embed every completed, not-yet-indexed meeting in the
 * active workspace. Safe to call repeatedly — the indexer is
 * idempotent. Returns counts so the UI can show progress on retry.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get every completed meeting in the workspace.
  const { data: meetings } = await admin
    .from('meetings')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'completed');

  if (!meetings || meetings.length === 0) {
    return NextResponse.json({ indexed: 0, skipped: 0, total: 0 });
  }

  // Skip ones that already have chunks.
  const meetingIds = meetings.map((m) => m.id);
  const { data: existingChunks } = await admin
    .from('transcript_chunks')
    .select('meeting_id')
    .in('meeting_id', meetingIds);
  const indexed = new Set((existingChunks ?? []).map((c) => c.meeting_id));

  const todo = meetingIds.filter((id) => !indexed.has(id));

  let success = 0;
  let failed = 0;
  for (const id of todo) {
    try {
      const result = await indexMeetingForChat(admin, id);
      if ('chunkCount' in result) success++;
      else failed++;
    } catch (err) {
      if (err instanceof MissingEmbeddingKeyError) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY is not configured.' },
          { status: 503 },
        );
      }
      failed++;
    }
  }

  return NextResponse.json({
    total: meetingIds.length,
    already_indexed: indexed.size,
    indexed: success,
    failed,
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ count: meetingCount }, { count: chunkCount }] = await Promise.all([
    admin
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed'),
    admin
      .from('transcript_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
  ]);

  return NextResponse.json({
    completed_meetings: meetingCount ?? 0,
    indexed_chunks: chunkCount ?? 0,
  });
}
