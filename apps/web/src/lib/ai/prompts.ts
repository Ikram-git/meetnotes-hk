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
- Same rule applies to "text" vs "text_zh" inside key_points and action_items, and "name" vs "name_zh" in topics.`
    : `Output language: ${languageLabel}

Language rules for the JSON output:
- "summary" should be written entirely in ${languageLabel}
- Omit "summary_zh" completely
- All "text" fields in key_points, action_items, key_quotes should be in ${languageLabel}
- Omit all "text_zh" fields
- All "name" fields in topics should be in ${languageLabel}
- Omit all "name_zh" fields
- Translate content from the source audio into ${languageLabel} as needed`;

  return `
Analyse this meeting transcript and produce a structured "Notes" object.

${languageRules}
Style: ${options.style}

Your Notes object has these parts, in order of importance:
1. overview     — a punchy 1-2 sentence TL;DR capturing what the meeting was about and the most important outcome. This is what someone reads first.
2. summary      — a richer paragraph (3-6 sentences) expanding on the overview. This is the traditional summary field, kept for backwards compatibility and for users who want a longer read.
3. key_points   — 4-8 bullet points summarising the MAIN DISCUSSION topics and what was said about them. Each bullet should be a single sentence. These are the notes someone would jot in their notebook.
4. action_items — specific, actionable follow-ups with assignees and (if mentioned) due dates.
5. key_quotes   — 1-3 notable verbatim quotes (in the original spoken language is fine).
6. topics       — short labels (1-3 words each) for the main themes discussed.
7. sentiment    — the overall tone of the meeting.

Respond in this exact JSON format:
{
  "overview": "1-2 sentence TL;DR in the requested output language",
  "overview_zh": "繁體中文 TL;DR — ONLY include when language is 'both', omit entirely otherwise",
  "summary": "Fuller paragraph summary in the requested output language",
  "summary_zh": "繁體中文摘要 — ONLY include when language is 'both', omit entirely otherwise",
  "key_points": [
    {"text": "A single-sentence key point", "text_zh": "中文 (only if 'both')"}
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

Do NOT include a "key_decisions" field. That section has been removed.

TRANSCRIPT:
${transcript}
`;
};
