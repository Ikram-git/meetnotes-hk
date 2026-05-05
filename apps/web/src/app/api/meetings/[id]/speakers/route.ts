import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getGates, tierUpgradeMessage } from '@/lib/billing/gates';
import { NextRequest, NextResponse } from 'next/server';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET speaker mappings for a meeting
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: mappings } = await admin()
    .from('speaker_mappings')
    .select('*')
    .eq('meeting_id', meetingId);

  return NextResponse.json(mappings || []);
}

// PUT (upsert) a speaker mapping. Also propagates to any tasks whose
// assignee_label still matches the renamed speaker, fuzzy-matching the
// new name against workspace members so auto-assignment kicks in.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  if (!getGates(profile?.subscription_tier).speakerNaming) {
    return NextResponse.json(
      { error: tierUpgradeMessage('Speaker naming', 'pro') },
      { status: 402 },
    );
  }

  const { speakerLabel, speakerName } = await req.json();
  if (!speakerLabel || !speakerName) {
    return NextResponse.json(
      { error: 'speakerLabel and speakerName required' },
      { status: 400 },
    );
  }

  const a = admin();
  const { data: meeting } = await a
    .from('meetings')
    .select('id, workspace_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const { data, error } = await a
    .from('speaker_mappings')
    .upsert(
      {
        meeting_id: meetingId,
        speaker_label: speakerLabel,
        speaker_name: speakerName,
      },
      { onConflict: 'meeting_id,speaker_label' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Propagate to tasks: any task with assignee_label = the old speaker
  // label gets either re-linked to a real workspace member (if the new
  // name fuzzy-matches one) or just relabelled.
  await propagateRenameToTasks(a, meetingId, meeting.workspace_id, speakerLabel, speakerName);

  return NextResponse.json(data);
}

async function propagateRenameToTasks(
  a: ReturnType<typeof admin>,
  meetingId: string,
  workspaceId: string,
  speakerLabel: string,
  newName: string,
) {
  // Find tasks whose fallback label still points at this speaker.
  const { data: tasksToUpdate } = await a
    .from('tasks')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('assignee_label', speakerLabel);
  if (!tasksToUpdate || tasksToUpdate.length === 0) return;

  // Try to fuzzy-match the new name to a workspace member.
  const { data: memberRows } = await a
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);
  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await a
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
    : { data: [] as any[] };

  const needle = newName.trim().toLowerCase();
  const match = (profiles ?? []).find((p: any) => {
    const candidates: string[] = [];
    if (p.full_name) {
      candidates.push((p.full_name as string).toLowerCase());
      (p.full_name as string).split(/\s+/).forEach((part) => {
        if (part.length >= 2) candidates.push(part.toLowerCase());
      });
    }
    if (p.email) candidates.push((p.email as string).split('@')[0].toLowerCase());
    return candidates.some(
      (c) => c === needle || c.includes(needle) || needle.includes(c),
    );
  });

  await a
    .from('tasks')
    .update({
      assignee_user_id: match?.id ?? null,
      assignee_label: match ? null : newName,
    })
    .eq('meeting_id', meetingId)
    .eq('assignee_label', speakerLabel);
}
