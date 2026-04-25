/**
 * Shape a meeting + summary row into the public payload Zapier (and other
 * webhook consumers) receive. Keep this stable — Zap users build their Zaps
 * around these field names.
 */
export function buildZapierPayload(
  m: Record<string, unknown>,
  s: Record<string, unknown> | undefined,
) {
  return {
    id: m.id as string,
    title: (m.title as string) || 'Untitled Meeting',
    created_at: m.created_at as string,
    duration_seconds: (m.audio_duration_seconds as number) || 0,
    source: m.source as string,
    google_event_id: (m.google_event_id as string) || null,
    google_event_summary: (m.google_event_summary as string) || null,
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meetnotes-ochre.vercel.app'}/meetings/${m.id}`,
    summary: s
      ? {
          overview: (s.overview as string) || null,
          summary_text: (s.summary_text as string) || null,
          key_points: (s.key_points as unknown[]) || [],
          action_items: (s.action_items as unknown[]) || [],
          topics: (s.topics as unknown[]) || [],
          sentiment: (s.sentiment as string) || null,
        }
      : null,
  };
}
