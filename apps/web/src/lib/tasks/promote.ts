import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createAdminClient } from '@supabase/supabase-js';

interface ActionItem {
  text?: string;
  assignee?: string | null;
  due_date?: string | null;
  status?: string | null;
}

/**
 * Promote each AI-extracted action item from a meeting's summary into a row
 * in `tasks`. Idempotent — drops any existing task rows that point at the
 * same meeting first, so re-running after a re-summarise doesn't duplicate.
 *
 * Tries to fuzzy-match the speaker-label assignee ("Anna", "Speaker 1")
 * against workspace members. On match → assignee_user_id is set. Otherwise
 * the raw label is preserved on assignee_label so the user can re-assign.
 */
export async function promoteActionItemsToTasks(
  _supabase: SupabaseClient,
  meetingId: string,
): Promise<{ created: number } | { error: string }> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  try {
    const { data: meeting } = await admin
      .from('meetings')
      .select('id, workspace_id, user_id')
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting?.workspace_id) return { error: 'Meeting not found' };

    const { data: summary } = await admin
      .from('summaries')
      .select('action_items')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const items = (summary?.action_items as ActionItem[] | null) ?? [];

    // Always wipe existing AI-derived tasks for this meeting before
    // recreating, so re-summarise doesn't leave stale rows.
    await admin
      .from('tasks')
      .delete()
      .eq('meeting_id', meetingId)
      .not('source_action_item_index', 'is', null);

    if (items.length === 0) return { created: 0 };

    // Pre-fetch workspace members + speaker mappings.
    const [{ data: members }, { data: mappings }] = await Promise.all([
      admin
        .from('workspace_members')
        .select('user_id, profiles:profiles!user_id(id, email, full_name)')
        .eq('workspace_id', meeting.workspace_id),
      admin
        .from('speaker_mappings')
        .select('speaker_label, speaker_name')
        .eq('meeting_id', meetingId),
    ]);

    const memberIndex = (members ?? [])
      .map((m: any) => m.profiles)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id as string,
        names: candidateNamesFor(p.full_name as string | null, p.email as string | null),
      }));

    // "Speaker N" → identified name (from speaker_mappings, populated by
    // identifyAndSaveSpeakers before this runs).
    const speakerMap = new Map<string, string>();
    for (const m of mappings ?? []) {
      if (m.speaker_label && m.speaker_name) {
        speakerMap.set(
          (m.speaker_label as string).trim().toLowerCase(),
          m.speaker_name as string,
        );
      }
    }

    const rows = items.map((item, index) => {
      const rawAssignee = item.assignee ?? null;
      const resolved =
        rawAssignee && speakerMap.has(rawAssignee.trim().toLowerCase())
          ? speakerMap.get(rawAssignee.trim().toLowerCase())!
          : rawAssignee;
      const matchedId = matchAssignee(resolved ?? null, memberIndex);
      return {
        workspace_id: meeting.workspace_id,
        meeting_id: meetingId,
        source_action_item_index: index,
        title: (item.text || '(untitled)').slice(0, 500),
        assignee_user_id: matchedId,
        assignee_label: matchedId ? null : (resolved ?? rawAssignee ?? null),
        due_date: parseDueDate(item.due_date ?? null),
        status: item.status === 'done' ? 'done' : 'todo',
        created_by: meeting.user_id,
      };
    });

    const { error } = await admin.from('tasks').insert(rows);
    if (error) return { error: error.message };
    return { created: rows.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function candidateNamesFor(fullName: string | null, email: string | null): string[] {
  const out: string[] = [];
  if (fullName) {
    out.push(fullName.toLowerCase());
    fullName.split(/\s+/).forEach((part) => {
      if (part.length >= 2) out.push(part.toLowerCase());
    });
  }
  if (email) {
    const local = email.split('@')[0];
    if (local) out.push(local.toLowerCase());
  }
  return Array.from(new Set(out));
}

function matchAssignee(
  rawAssignee: string | null,
  memberIndex: Array<{ id: string; names: string[] }>,
): string | null {
  if (!rawAssignee) return null;
  const needle = rawAssignee.trim().toLowerCase();
  if (!needle) return null;
  // Skip generic speaker labels — those don't map to a real person.
  if (/^speaker\s*\d+$/.test(needle)) return null;
  // Direct or substring match on any candidate name.
  for (const m of memberIndex) {
    for (const name of m.names) {
      if (name === needle || name.includes(needle) || needle.includes(name)) {
        return m.id;
      }
    }
  }
  return null;
}

/**
 * AI sometimes returns date strings like "next Friday" or "2026-05-10".
 * We only persist real ISO-ish dates; everything else gets dropped (the
 * original phrase stays in the action_items JSONB, which the UI can
 * still surface as a hint).
 */
function parseDueDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept YYYY-MM-DD or anything Date.parse can handle that ISOifies.
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(trimmed);
  if (isoMatch) return isoMatch[0];
  const ts = Date.parse(trimmed);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString().slice(0, 10);
}
