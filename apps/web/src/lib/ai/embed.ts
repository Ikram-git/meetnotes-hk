/**
 * Thin wrapper around OpenAI's embeddings endpoint. We use
 * text-embedding-3-small (1536 dims) — cheapest and good enough quality
 * for transcript-RAG, and matches the migration's vector(1536) column.
 *
 * If OPENAI_API_KEY is missing we throw with a clear message so callers
 * can surface a setup hint rather than a vague network error.
 */

const EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';
export const EMBED_DIMS = 1536;

export class MissingEmbeddingKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured. Cross-meeting chat needs an embeddings provider.');
    this.name = 'MissingEmbeddingKeyError';
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) throw new MissingEmbeddingKeyError();
  if (texts.length === 0) return [];

  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  // OpenAI may not return data in input order — sort by index to be safe.
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
