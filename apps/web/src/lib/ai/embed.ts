/**
 * Embedding provider abstraction. Prefers Voyage AI (Anthropic's
 * recommended partner — generous free tier, no card required) and
 * falls back to OpenAI's text-embedding-3-small if VOYAGE_API_KEY
 * isn't set.
 *
 * Both producers output 1024-dim vectors so they fit the same
 * transcript_chunks.embedding column without a migration when you
 * switch providers:
 *   - Voyage: voyage-3 natively returns 1024 dims.
 *   - OpenAI: text-embedding-3-small supports a `dimensions` param
 *     for built-in dim reduction; we ask for 1024.
 *
 * If neither key is set we throw MissingEmbeddingKeyError so callers
 * can surface a clear setup message.
 */

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-3';

const OPENAI_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small';

export const EMBED_DIMS = 1024;

export class MissingEmbeddingKeyError extends Error {
  constructor() {
    super(
      'No embedding provider configured. Set VOYAGE_API_KEY (preferred) or OPENAI_API_KEY in your environment.',
    );
    this.name = 'MissingEmbeddingKeyError';
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (process.env.VOYAGE_API_KEY) return embedViaVoyage(texts);
  if (process.env.OPENAI_API_KEY) return embedViaOpenAI(texts);
  throw new MissingEmbeddingKeyError();
}

async function embedViaVoyage(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: 'document',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voyage embeddings failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedViaOpenAI(texts: string[]): Promise<number[][]> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: OPENAI_MODEL,
      dimensions: EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings failed (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/**
 * Embed a question for retrieval. Voyage uses a different `input_type`
 * for queries vs documents to improve recall. OpenAI doesn't have this
 * distinction.
 */
export async function embedQuery(text: string): Promise<number[]> {
  if (process.env.VOYAGE_API_KEY) {
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: [text],
        model: VOYAGE_MODEL,
        input_type: 'query',
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Voyage query embedding failed (${res.status}): ${detail}`);
    }
    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }
  const [v] = await embed([text]);
  return v;
}
