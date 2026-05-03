'use client';

/**
 * Renders a meeting summary as a bullet list.
 *
 * The AI now emits `summary` as markdown bullets ("- point\n- point\n..."),
 * but legacy rows are paragraphs. Strategy:
 *   1. If the text contains "- " bullet markers OR newlines, split on lines
 *      and treat each non-empty line as a bullet (stripping any leading
 *      "- " or "* ").
 *   2. Otherwise, fall back to splitting on sentence boundaries so that an
 *      old paragraph still renders as a list rather than a wall of text.
 */
export function SummaryBullets({
  text,
  muted = false,
}: {
  text: string;
  muted?: boolean;
}) {
  const bullets = parseBullets(text);
  if (bullets.length === 0) return null;

  const dotColor = muted ? 'bg-gray-600' : 'bg-emerald-500';
  const textColor = muted ? 'text-gray-500' : 'text-gray-300';

  return (
    <ul className="space-y-2">
      {bullets.map((line, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className={`flex-1 min-w-0 leading-relaxed ${textColor}`}>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function parseBullets(text: string): string[] {
  if (!text) return [];

  const trimmed = text.trim();

  // 1. Markdown-style bullets or any multi-line text.
  if (/(^|\n)\s*[-*•]\s+/.test(trimmed) || trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((line) => line.replace(/^\s*[-*•]\s+/, '').trim())
      .filter((line) => line.length > 0);
  }

  // 2. Legacy paragraph fallback: split on sentence-ending punctuation
  //    followed by whitespace. Handles English ".!?" and Chinese "。！？".
  const sentences = trimmed
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 1 ? sentences : [trimmed];
}
