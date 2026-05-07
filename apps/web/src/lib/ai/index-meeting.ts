import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { chunkSegments, type SegmentInput } from './chunk';
import { embed, MissingEmbeddingKeyError } from './embed';

/**
 * Chunk + embed a finished meeting and write the rows into
 * transcript_chunks. Idempotent: deletes any existing chunks for the
 * meeting first so re-runs after a re-summarise don't duplicate.
 *
 * Best-effort: if anything fails (no API key, embedding 5xx, network)
 * we just log and return — the meeting itself is already saved and the
 * cross-meeting chat will simply not see this meeting until the next
 * successful index attempt.
 */
export async function indexMeetingForChat(
  _supabase: SupabaseClient,
  meetingId: string,
): Promise<{ chunkCount: number } | { error: string }> {
  // Always use admin client — same RLS-null-in-after()-blocks issue.
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  try {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, workspace_id')
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting?.workspace_id) {
      return { error: 'Meeting or workspace not found' };
    }

    const { data: segments } = await supabase
      .from('transcript_segments')
      .select('text, start_time_ms, end_time_ms, speaker_label')
      .eq('meeting_id', meetingId)
      .order('segment_index', { ascending: true });

    if (!segments || segments.length === 0) {
      return { chunkCount: 0 };
    }

    const segInputs: SegmentInput[] = segments.map((s) => ({
      text: s.text as string,
      startTimeMs: s.start_time_ms as number,
      endTimeMs: s.end_time_ms as number,
      speakerLabel: (s.speaker_label as string | null) ?? null,
    }));

    const chunks = chunkSegments(segInputs);
    if (chunks.length === 0) return { chunkCount: 0 };

    const embeddings = await embed(chunks.map((c) => c.text));

    // Replace any existing chunks for this meeting (idempotent).
    await supabase.from('transcript_chunks').delete().eq('meeting_id', meetingId);

    const rows = chunks.map((c, i) => ({
      meeting_id: meetingId,
      workspace_id: meeting.workspace_id,
      chunk_index: i,
      text: c.text,
      start_ms: c.startMs,
      end_ms: c.endMs,
      speaker_label: c.speakerLabel,
      // pgvector accepts a JSON array string in the wire format
      embedding: JSON.stringify(embeddings[i]),
    }));

    const { error: insertErr } = await supabase.from('transcript_chunks').insert(rows);
    if (insertErr) {
      console.warn(`[index-meeting] insert failed for ${meetingId}:`, insertErr.message);
      return { error: insertErr.message };
    }

    console.log(`[index-meeting] embedded ${chunks.length} chunks for meeting ${meetingId}`);
    return { chunkCount: chunks.length };
  } catch (err) {
    if (err instanceof MissingEmbeddingKeyError) {
      // Don't spam the logs — this is a known config gap until OPENAI_API_KEY is set.
      console.warn('[index-meeting] OPENAI_API_KEY not set; skipping indexing');
    } else {
      console.warn('[index-meeting] failed:', err instanceof Error ? err.message : err);
    }
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
