// Meeting types
export type MeetingStatus =
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'summarising'
  | 'completed'
  | 'error';

export type MeetingSource = 'upload' | 'chrome_extension' | 'api';

export type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'webm';

export type STTProvider = 'deepgram' | 'google' | 'assemblyai';

// User preferences
// Any supported language code (see apps/web/src/lib/i18n/languages.ts)
// or 'both' for a special bilingual EN+Traditional Chinese output.
export type PreferredLanguage = string;

export type SummaryStyle = 'concise' | 'detailed' | 'bullet';

export type SubscriptionTier = 'free' | 'pro' | 'team';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

// Export types
export type ExportType = 'pdf' | 'email' | 'clipboard';

export type ExportStatus = 'pending' | 'completed' | 'error';

// Sentiment types
export type Sentiment = 'positive' | 'neutral' | 'mixed' | 'tense';

// Database table types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: PreferredLanguage;
  preferred_summary_style: SummaryStyle;
  timezone: string;
  stripe_customer_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  minutes_used_this_month: number;
  minutes_limit: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  audio_storage_path: string | null;
  audio_duration_seconds: number | null;
  audio_format: AudioFormat | null;
  audio_size_bytes: number | null;
  source: MeetingSource;
  source_url: string | null;
  status: MeetingStatus;
  error_message: string | null;
  stt_provider: STTProvider | null;
  detected_languages: string[] | null;
  meeting_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  segment_index: number;
  speaker_label: string | null;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  language: string | null;
  confidence: number | null;
  created_at: string;
}

export interface KeyDecision {
  text: string;
  text_zh?: string;
  speaker: string;
  timestamp_ms: number;
}

export interface ActionItem {
  text: string;
  text_zh?: string;
  assignee: string;
  due_date?: string;
  status: 'pending' | 'completed';
}

export interface KeyQuote {
  text: string;
  speaker: string;
  timestamp_ms: number;
}

export interface Topic {
  name: string;
  name_zh?: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  /** 1-2 sentence TL;DR */
  overview: string | null;
  overview_zh: string | null;
  /** Fuller paragraph summary (kept for backwards compatibility) */
  summary_text: string;
  summary_text_zh: string | null;
  /** Bullet list of discussion points */
  key_points: Array<{ text: string; text_zh?: string }>;
  /** @deprecated — kept in DB for old rows, no longer written or displayed */
  key_decisions: KeyDecision[];
  action_items: ActionItem[];
  key_quotes: KeyQuote[];
  topics: Topic[];
  sentiment: Sentiment | null;
  model_used: string | null;
  prompt_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  processing_time_ms: number | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface SpeakerMapping {
  id: string;
  meeting_id: string;
  speaker_label: string;
  speaker_name: string;
  created_at: string;
}

export interface Export {
  id: string;
  meeting_id: string;
  user_id: string;
  export_type: ExportType;
  export_language: PreferredLanguage;
  status: ExportStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
