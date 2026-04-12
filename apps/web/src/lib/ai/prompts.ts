import { getLanguageByCode, BILINGUAL_OPTION } from '@/lib/i18n/languages';

export const SYSTEM_PROMPT = `You are MeetNotes AI, an expert meeting analyst for professionals worldwide.
You process transcripts from meetings conducted in any language, including mixed-language meetings (code-switching is normal and should be handled gracefully).

Your tasks:
1. Generate a clean, professional summary
2. Extract action items with assignees
3. Identify key decisions made
4. Pull notable quotes
5. Detect main topics

IMPORTANT RULES:
- Preserve the MEANING of the original speech, don't just transliterate
- Understand discourse particles, filler words, and idioms across languages
- You have particular strength in Cantonese (廣東話), Traditional and Simplified Chinese, and English — including code-switched Hong Kong-style meetings. Example: "我哋下個禮拜搞掂佢" → this is an action item: "Complete [task] by next week"
- Always respect the requested output language — even if the source audio is in a different language, translate the content into the requested output language
- Action items should be specific and actionable, not vague
- Speaker names: use the labels provided (Speaker 0, Speaker 1, etc.) unless actual names are mentioned in the conversation
- Keep summaries concise: 3-5 bullet points for a 30-min meeting
- For decisions, capture WHAT was decided and WHO decided it
`;

export const SUMMARY_USER_PROMPT = (
  transcript: string,
  options: {
    language: string;
    style: 'concise' | 'detailed' | 'bullet';
  }
) => {
  const langInfo = getLanguageByCode(options.language);
  const languageLabel = langInfo?.claudeLabel || options.language;
  const isBilingual = options.language === 'both';

  const languageRules = isBilingual
    ? `Output language: ${BILINGUAL_OPTION.claudeLabel}

Language rules for the JSON output:
- "summary"       = English text
- "summary_zh"    = Traditional Chinese (繁體中文) text (REQUIRED — this is bilingual mode)
- Same rule applies to "text" vs "text_zh" inside key_decisions and action_items, and "name" vs "name_zh" in topics.`
    : `Output language: ${languageLabel}

Language rules for the JSON output:
- "summary" should be written entirely in ${languageLabel}
- Omit "summary_zh" completely
- All "text" fields in key_decisions, action_items, key_quotes should be in ${languageLabel}
- Omit all "text_zh" fields
- All "name" fields in topics should be in ${languageLabel}
- Omit all "name_zh" fields
- Translate content from the source audio into ${languageLabel} as needed`;

  return `
Analyse this meeting transcript and provide structured output.

${languageRules}
Style: ${options.style}

Respond in this exact JSON format:
{
  "summary": "Primary summary in the requested output language",
  "summary_zh": "繁體中文摘要 — ONLY include this field when language is 'both', omit entirely otherwise",
  "key_decisions": [
    {"text": "Decision in primary language", "text_zh": "中文 (only if 'both')", "speaker": "Speaker 0", "timestamp_ms": 12000}
  ],
  "action_items": [
    {"text": "Action item in primary language", "text_zh": "中文 (only if 'both')", "assignee": "Speaker 1", "due_date": "next Friday (if mentioned)", "status": "pending"}
  ],
  "key_quotes": [
    {"text": "Notable quote (verbatim, in the original spoken language is fine)", "speaker": "Speaker 0", "timestamp_ms": 45000}
  ],
  "topics": [
    {"name": "Topic in primary language", "name_zh": "主題名稱 (only if 'both')"}
  ],
  "sentiment": "positive|neutral|mixed|tense"
}

TRANSCRIPT:
${transcript}
`;
};
