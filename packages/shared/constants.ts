// Subscription limits
export const SUBSCRIPTION_LIMITS = {
  free: {
    minutes: 300, // 5 hours per month
    maxFileSize: 100 * 1024 * 1024, // 100 MB
  },
  pro: {
    minutes: 3000, // 50 hours per month
    maxFileSize: 500 * 1024 * 1024, // 500 MB
  },
  team: {
    minutes: 10000, // 166 hours per month
    maxFileSize: 1024 * 1024 * 1024, // 1 GB
  },
} as const;

// Supported audio formats
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/x-m4a',
] as const;

export const AUDIO_FILE_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm'] as const;

// Language codes
export const LANGUAGE_CODES = {
  english: 'en',
  cantonese: 'yue-Hant-HK',
  mandarin: 'cmn-Hans-CN',
} as const;

// Meeting status display names
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  uploaded: 'Uploaded',
  transcribing: 'Transcribing...',
  transcribed: 'Transcribed',
  summarising: 'Generating Summary...',
  completed: 'Completed',
  error: 'Error',
};

// STT provider names
export const STT_PROVIDER_NAMES: Record<string, string> = {
  deepgram: 'Deepgram Nova-2',
  google: 'Google Cloud STT',
  assemblyai: 'AssemblyAI',
};

// API endpoints
export const API_ENDPOINTS = {
  upload: '/api/upload',
  transcribe: '/api/transcribe',
  meetings: '/api/meetings',
  webhooks: {
    deepgram: '/api/webhooks/deepgram',
    stripe: '/api/webhooks/stripe',
  },
} as const;
