/**
 * Central registry of languages the app supports for summary output.
 *
 * - `code` is what we store in the DB and send to the server
 * - `name` is the English display name
 * - `nativeName` is what speakers of the language call it
 * - `flag` is an emoji used in the UI
 * - `claudeLabel` is how we describe the language to Claude in the prompt
 *
 * Note: Audio *transcription* (Deepgram) auto-detects the language and
 * doesn't need an entry here. This registry only governs how the summary
 * is produced and how the UI renders the picker.
 */
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  claudeLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en',      name: 'English',             nativeName: 'English',      flag: '🇬🇧', claudeLabel: 'English' },
  { code: 'zh-Hant', name: 'Traditional Chinese', nativeName: '繁體中文',      flag: '🇭🇰', claudeLabel: 'Traditional Chinese (繁體中文)' },
  { code: 'zh-Hans', name: 'Simplified Chinese',  nativeName: '简体中文',      flag: '🇨🇳', claudeLabel: 'Simplified Chinese (简体中文)' },
  { code: 'yue',     name: 'Cantonese',           nativeName: '廣東話',        flag: '🇭🇰', claudeLabel: 'Written Cantonese (廣東話, using Cantonese-specific characters where appropriate)' },
  { code: 'ja',      name: 'Japanese',            nativeName: '日本語',        flag: '🇯🇵', claudeLabel: 'Japanese (日本語)' },
  { code: 'ko',      name: 'Korean',              nativeName: '한국어',         flag: '🇰🇷', claudeLabel: 'Korean (한국어)' },
  { code: 'es',      name: 'Spanish',             nativeName: 'Español',      flag: '🇪🇸', claudeLabel: 'Spanish (Español)' },
  { code: 'fr',      name: 'French',              nativeName: 'Français',     flag: '🇫🇷', claudeLabel: 'French (Français)' },
  { code: 'de',      name: 'German',              nativeName: 'Deutsch',      flag: '🇩🇪', claudeLabel: 'German (Deutsch)' },
  { code: 'pt',      name: 'Portuguese',          nativeName: 'Português',    flag: '🇵🇹', claudeLabel: 'Portuguese (Português)' },
  { code: 'it',      name: 'Italian',             nativeName: 'Italiano',     flag: '🇮🇹', claudeLabel: 'Italian (Italiano)' },
  { code: 'nl',      name: 'Dutch',               nativeName: 'Nederlands',   flag: '🇳🇱', claudeLabel: 'Dutch (Nederlands)' },
  { code: 'ru',      name: 'Russian',             nativeName: 'Русский',      flag: '🇷🇺', claudeLabel: 'Russian (Русский)' },
  { code: 'hi',      name: 'Hindi',               nativeName: 'हिन्दी',          flag: '🇮🇳', claudeLabel: 'Hindi (हिन्दी)' },
  { code: 'ar',      name: 'Arabic',              nativeName: 'العربية',       flag: '🇦🇪', claudeLabel: 'Arabic (العربية)' },
  { code: 'id',      name: 'Indonesian',          nativeName: 'Bahasa Indonesia', flag: '🇮🇩', claudeLabel: 'Indonesian (Bahasa Indonesia)' },
  { code: 'vi',      name: 'Vietnamese',          nativeName: 'Tiếng Việt',   flag: '🇻🇳', claudeLabel: 'Vietnamese (Tiếng Việt)' },
  { code: 'th',      name: 'Thai',                nativeName: 'ไทย',           flag: '🇹🇭', claudeLabel: 'Thai (ไทย)' },
];

/**
 * 'both' is a special bilingual option, kept for the HK market where
 * meetings are commonly summarised in English + Traditional Chinese.
 */
export type SummaryLanguage = string; // any `SUPPORTED_LANGUAGES[i].code` or 'both'

export const BILINGUAL_OPTION = {
  code: 'both' as const,
  name: 'English + 繁體中文',
  nativeName: 'Bilingual',
  flag: '🌐',
  claudeLabel: 'Both English and Traditional Chinese (繁體中文). Provide both fields.',
};

export function getLanguageByCode(code: string): SupportedLanguage | typeof BILINGUAL_OPTION | undefined {
  if (code === 'both') return BILINGUAL_OPTION;
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}

export function isValidLanguageCode(code: string): boolean {
  return code === 'both' || SUPPORTED_LANGUAGES.some((l) => l.code === code);
}
