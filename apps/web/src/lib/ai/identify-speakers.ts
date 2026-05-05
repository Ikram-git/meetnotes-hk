import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Use Claude to figure out who each "Speaker N" actually is, based on
 * transcript context (self-introductions, others addressing the person
 * by name, contextual references). Saves identified names into
 * speaker_mappings so the meeting detail page and action items use real
 * names instead of "Speaker 1".
 *
 * Best-effort. We only persist a mapping when Claude returned a name.
 * If we already have a user-confirmed mapping for a label, we don't
 * overwrite — the user's edit always wins.
 */
export async function identifyAndSaveSpeakers(
  admin: SupabaseClient,
  meetingId: string,
): Promise<Record<string, string>> {
  if (!process.env.ANTHROPIC_API_KEY) return {};

  try {
    const { data: meeting } = await admin
      .from('meetings')
      .select('id, workspace_id')
      .eq('id', meetingId)
      .maybeSingle();
    if (!meeting?.workspace_id) return {};

    // Load segments + existing mappings (to skip already-named ones).
    const [{ data: segments }, { data: existing }, { data: members }] = await Promise.all([
      admin
        .from('transcript_segments')
        .select('speaker_label, text')
        .eq('meeting_id', meetingId)
        .order('segment_index', { ascending: true })
        .limit(800),
      admin
        .from('speaker_mappings')
        .select('speaker_label, speaker_name')
        .eq('meeting_id', meetingId),
      admin
        .from('workspace_members')
        .select('profiles!user_id(full_name, email)')
        .eq('workspace_id', meeting.workspace_id),
    ]);

    if (!segments || segments.length === 0) return {};

    const distinctLabels = Array.from(
      new Set(
        segments
          .map((s) => (s.speaker_label as string | null) || '')
          .filter(Boolean),
      ),
    );
    if (distinctLabels.length === 0) return {};

    const alreadyNamed = new Set(
      (existing ?? [])
        .map((m: any) => m.speaker_label as string)
        .filter((label) => /^speaker\s*\d+$/i.test(label) === false),
    );
    const labelsToIdentify = distinctLabels.filter((l) => !alreadyNamed.has(l));
    if (labelsToIdentify.length === 0) return {};

    // Compact transcript so we don't blow context. ~25k chars is plenty
    // for a 30-min meeting.
    const transcriptText = segments
      .map((s) => `${s.speaker_label}: ${s.text}`)
      .join('\n')
      .slice(0, 25_000);

    const memberNames = (members ?? [])
      .map((m: any) => m.profiles?.full_name)
      .filter((n: string | undefined) => n && n.length > 1)
      .slice(0, 20)
      .join(', ');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const prompt = `Workspace members (use these names verbatim if a speaker matches): ${memberNames || '(none provided)'}

Transcript:
"""
${transcriptText}
"""

Speakers to identify: ${labelsToIdentify.join(', ')}

For each label, return the speaker's actual name if you're confident from context (e.g. "Hi, I'm X", someone addressing them by name, them signing off as X). Return null for speakers you can't identify confidently.

Reply ONLY with a JSON object. Example:
{"Speaker 0": "Anna Wong", "Speaker 1": null, "Speaker 2": "Tom"}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system:
        'You identify meeting speakers by name from transcript context. Never invent names. Prefer matching workspace member names exactly when context allows. Reply with JSON only.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    let parsed: Record<string, string | null>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return {};
    }

    const validRows = Object.entries(parsed)
      .filter(([label, name]) =>
        labelsToIdentify.includes(label) &&
        typeof name === 'string' &&
        name.trim().length > 0,
      )
      .map(([label, name]) => ({
        meeting_id: meetingId,
        speaker_label: label,
        speaker_name: (name as string).trim(),
      }));

    if (validRows.length > 0) {
      await admin
        .from('speaker_mappings')
        .upsert(validRows, { onConflict: 'meeting_id,speaker_label' });
    }

    const out: Record<string, string> = {};
    validRows.forEach((r) => (out[r.speaker_label] = r.speaker_name));
    return out;
  } catch (err) {
    console.warn(
      '[identify-speakers] failed:',
      err instanceof Error ? err.message : err,
    );
    return {};
  }
}
