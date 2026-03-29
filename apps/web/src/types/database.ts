// Database types for Supabase
// This file can be auto-generated using: supabase gen types typescript --local

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_language: string;
          preferred_summary_style: string;
          timezone: string;
          stripe_customer_id: string | null;
          subscription_tier: string;
          subscription_status: string;
          minutes_used_this_month: number;
          minutes_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: string;
          preferred_summary_style?: string;
          timezone?: string;
          stripe_customer_id?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          minutes_used_this_month?: number;
          minutes_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: string;
          preferred_summary_style?: string;
          timezone?: string;
          stripe_customer_id?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          minutes_used_this_month?: number;
          minutes_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          description: string | null;
          audio_storage_path: string | null;
          audio_duration_seconds: number | null;
          audio_format: string | null;
          audio_size_bytes: number | null;
          source: string;
          source_url: string | null;
          status: string;
          error_message: string | null;
          stt_provider: string | null;
          detected_languages: string[] | null;
          meeting_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          description?: string | null;
          audio_storage_path?: string | null;
          audio_duration_seconds?: number | null;
          audio_format?: string | null;
          audio_size_bytes?: number | null;
          source?: string;
          source_url?: string | null;
          status?: string;
          error_message?: string | null;
          stt_provider?: string | null;
          detected_languages?: string[] | null;
          meeting_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          description?: string | null;
          audio_storage_path?: string | null;
          audio_duration_seconds?: number | null;
          audio_format?: string | null;
          audio_size_bytes?: number | null;
          source?: string;
          source_url?: string | null;
          status?: string;
          error_message?: string | null;
          stt_provider?: string | null;
          detected_languages?: string[] | null;
          meeting_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transcript_segments: {
        Row: {
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
        };
        Insert: {
          id?: string;
          meeting_id: string;
          segment_index: number;
          speaker_label?: string | null;
          start_time_ms: number;
          end_time_ms: number;
          text: string;
          language?: string | null;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          segment_index?: number;
          speaker_label?: string | null;
          start_time_ms?: number;
          end_time_ms?: number;
          text?: string;
          language?: string | null;
          confidence?: number | null;
          created_at?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          meeting_id: string;
          summary_text: string;
          summary_text_zh: string | null;
          key_decisions: Json;
          action_items: Json;
          key_quotes: Json;
          topics: Json;
          sentiment: string | null;
          model_used: string | null;
          prompt_version: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          processing_time_ms: number | null;
          is_edited: boolean;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          summary_text: string;
          summary_text_zh?: string | null;
          key_decisions?: Json;
          action_items?: Json;
          key_quotes?: Json;
          topics?: Json;
          sentiment?: string | null;
          model_used?: string | null;
          prompt_version?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          is_edited?: boolean;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          summary_text?: string;
          summary_text_zh?: string | null;
          key_decisions?: Json;
          action_items?: Json;
          key_quotes?: Json;
          topics?: Json;
          sentiment?: string | null;
          model_used?: string | null;
          prompt_version?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          processing_time_ms?: number | null;
          is_edited?: boolean;
          edited_at?: string | null;
          created_at?: string;
        };
      };
      speaker_mappings: {
        Row: {
          id: string;
          meeting_id: string;
          speaker_label: string;
          speaker_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          speaker_label: string;
          speaker_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          speaker_label?: string;
          speaker_name?: string;
          created_at?: string;
        };
      };
      exports: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          export_type: string;
          export_language: string;
          status: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          export_type: string;
          export_language?: string;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          export_type?: string;
          export_language?: string;
          status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_minutes_used: {
        Args: { user_id: string; minutes: number };
        Returns: void;
      };
      reset_monthly_usage: {
        Args: Record<string, never>;
        Returns: void;
      };
      search_transcripts: {
        Args: { user_id: string; search_query: string };
        Returns: {
          meeting_id: string;
          meeting_title: string;
          segment_text: string;
          relevance: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
