/**
 * Group transcript segments into RAG-ready chunks.
 *
 * Strategy: pack consecutive segments until the running text crosses a
 * target word count (default ~250). Each chunk records its first
 * segment's start_ms, last segment's end_ms, and the dominant speaker
 * label so citations can deep-link back to the right place. The first
 * `overlapWords` words of each chunk after the first are duplicated
 * from the tail of the previous chunk so question phrasing that lands
 * on a chunk boundary still hits the right context.
 */

export interface SegmentInput {
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  speakerLabel: string | null;
}

export interface Chunk {
  text: string;
  startMs: number;
  endMs: number;
  speakerLabel: string | null;
}

export function chunkSegments(
  segments: SegmentInput[],
  opts: { targetWords?: number; overlapWords?: number } = {},
): Chunk[] {
  const targetWords = opts.targetWords ?? 250;
  const overlapWords = opts.overlapWords ?? 40;
  if (segments.length === 0) return [];

  const chunks: Chunk[] = [];
  let buf: SegmentInput[] = [];
  let bufWordCount = 0;
  let carry: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    const speakers = buf.map((s) => s.speakerLabel).filter((s): s is string => !!s);
    const dominant = mostCommon(speakers);
    const body = buf.map((s) => fmt(s)).join(' ');
    const text = carry.length ? `${carry.join(' ')} ${body}` : body;
    chunks.push({
      text: text.trim(),
      startMs: buf[0].startTimeMs,
      endMs: buf[buf.length - 1].endTimeMs,
      speakerLabel: dominant,
    });
    // Prepare carry for the next chunk from the tail of the one we just emitted.
    const allWords = body.split(/\s+/);
    carry = allWords.slice(Math.max(0, allWords.length - overlapWords));
    buf = [];
    bufWordCount = 0;
  };

  for (const seg of segments) {
    buf.push(seg);
    bufWordCount += countWords(seg.text);
    if (bufWordCount >= targetWords) flush();
  }
  flush();

  return chunks;
}

function fmt(s: SegmentInput): string {
  return s.speakerLabel ? `${s.speakerLabel}: ${s.text}` : s.text;
}

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function mostCommon(items: string[]): string | null {
  if (items.length === 0) return null;
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }
  return best;
}
