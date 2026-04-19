import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { MeetingDetailClient } from '@/components/meeting-detail-client';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch all data in parallel
  const [meetingResult, segmentsResult, summaryResult, mappingsResult, chatsResult] =
    await Promise.all([
      supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('transcript_segments')
        .select('*')
        .eq('meeting_id', id)
        .order('segment_index', { ascending: true }),
      supabase
        .from('summaries')
        .select('*')
        .eq('meeting_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('speaker_mappings')
        .select('speaker_label, speaker_name')
        .eq('meeting_id', id),
      supabase
        .from('meeting_chats')
        .select('role, content, turn_index')
        .eq('meeting_id', id)
        .order('turn_index', { ascending: true }),
    ]);

  if (!meetingResult.data) notFound();

  // Get signed audio URL if audio exists
  let audioUrl: string | null = null;
  if (meetingResult.data.audio_storage_path) {
    const { data: signedUrl } = await supabase.storage
      .from('meeting-audio')
      .createSignedUrl(meetingResult.data.audio_storage_path, 3600);
    audioUrl = signedUrl?.signedUrl || null;
  }

  return (
    <MeetingDetailClient
      meeting={meetingResult.data}
      segments={segmentsResult.data || []}
      summary={summaryResult.data}
      speakerMappings={mappingsResult.data || []}
      audioUrl={audioUrl}
      chats={chatsResult.data || []}
    />
  );
}
