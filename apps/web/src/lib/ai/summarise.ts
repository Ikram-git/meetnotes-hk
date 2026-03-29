import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, SUMMARY_USER_PROMPT } from './prompts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SummaryResult {
  summary: string;
  summary_zh?: string;
  key_decisions: Array<{
    text: string;
    text_zh?: string;
    speaker: string;
    timestamp_ms: number;
  }>;
  action_items: Array<{
    text: string;
    text_zh?: string;
    assignee: string;
    due_date?: string;
    status: string;
  }>;
  key_quotes: Array<{
    text: string;
    speaker: string;
    timestamp_ms: number;
  }>;
  topics: Array<{
    name: string;
    name_zh?: string;
  }>;
  sentiment: string;
  usage: { input_tokens: number; output_tokens: number };
  processing_time_ms: number;
}

export async function summariseMeeting(
  transcript: string,
  options: {
    language: 'en' | 'zh-Hant' | 'both';
    style: 'concise' | 'detailed' | 'bullet';
  }
): Promise<SummaryResult> {
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: SUMMARY_USER_PROMPT(transcript, options),
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse JSON from response (handle markdown wrapping and trailing text)
  let jsonStr = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Extract just the JSON object — find the outermost { }
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    jsonStr = jsonStr.slice(start, end + 1);
  }

  const parsed = JSON.parse(jsonStr);

  return {
    ...parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    processing_time_ms: Date.now() - startTime,
  };
}
