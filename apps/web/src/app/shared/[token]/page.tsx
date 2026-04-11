import { createClient as createAdminClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDuration, formatTime } from '@/lib/utils';
import { SharedContent } from './shared-content';

export const dynamic = 'force-dynamic';

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find meeting by share token
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('share_token', token)
    .single();

  if (!meeting) notFound();

  const hasPassword = !!meeting.share_password;

  // If password protected, render the client component that handles the gate
  if (hasPassword) {
    return <SharedContent token={token} requiresPassword meetingTitle={meeting.title} />;
  }

  // No password — render directly
  const [segmentsResult, summaryResult, mappingsResult] = await Promise.all([
    supabase.from('transcript_segments').select('*').eq('meeting_id', meeting.id).order('segment_index', { ascending: true }),
    supabase.from('summaries').select('*').eq('meeting_id', meeting.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('speaker_mappings').select('speaker_label, speaker_name').eq('meeting_id', meeting.id),
  ]);

  const segments = segmentsResult.data || [];
  const summary = summaryResult.data;
  const speakerMap: Record<string, string> = {};
  for (const m of (mappingsResult.data || [])) speakerMap[m.speaker_label] = m.speaker_name;

  return (
    <SharedContent
      token={token}
      requiresPassword={false}
      meetingTitle={meeting.title}
      meeting={meeting}
      segments={segments}
      summary={summary}
      speakerMap={speakerMap}
    />
  );
}
