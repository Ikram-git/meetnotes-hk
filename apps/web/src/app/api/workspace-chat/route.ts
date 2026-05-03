import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { embedQuery, MissingEmbeddingKeyError } from '@/lib/ai/embed';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface MatchedChunk {
  id: string;
  meeting_id: string;
  meeting_title: string | null;
  meeting_created_at: string;
  text: string;
  start_ms: number | null;
  speaker_label: string | null;
  similarity: number;
}

const CHAT_SYSTEM_PROMPT = `You are Briva AI, a concise meeting researcher. The user asks questions about meetings their team has held; you answer using ONLY the transcript excerpts provided as <CONTEXT/>.

Rules:
- If the answer is in the context, cite it with [#N] markers — N is the index of the source you used (1-based, matching the order in <CONTEXT/>). You may cite multiple sources in one sentence: "they agreed on Friday [#2][#3]".
- If the context doesn't contain enough information, say so plainly. Do not invent facts.
- Reply in the same language the user asked in. Mixed-language answers are fine if the user mixes languages.
- Keep replies tight: a paragraph or short bullets. No preamble like "Based on the transcripts...".`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const body = (await req.json()) as { question?: string; history?: ChatTurn[] };
  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

  const history = (body.history ?? []).slice(-10);

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(question);
  } catch (err) {
    if (err instanceof MissingEmbeddingKeyError) {
      return NextResponse.json(
        {
          error:
            'Cross-meeting chat needs an embeddings provider. Set VOYAGE_API_KEY (preferred — free tier) or OPENAI_API_KEY in Vercel.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Embedding failed' },
      { status: 500 },
    );
  }

  // Use admin client for the RPC — match_workspace_chunks is SECURITY DEFINER
  // but PostgREST still runs it inside the caller's RLS context for some
  // joined tables. Admin keeps it predictable; we already verified workspace
  // membership above via getActiveWorkspaceId.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: matches, error: searchErr } = await admin.rpc('match_workspace_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    workspace_id_in: workspaceId,
    match_count: 8,
    similarity_threshold: 0.4,
  });
  if (searchErr) {
    return NextResponse.json({ error: searchErr.message }, { status: 500 });
  }

  const chunks = (matches ?? []) as MatchedChunk[];

  if (chunks.length === 0) {
    return NextResponse.json({
      answer:
        "I couldn't find anything in this workspace's meetings that answers that. Try a different question, or upload more meetings first.",
      citations: [],
    });
  }

  const contextBlock = chunks
    .map((c, i) => {
      const when = new Date(c.meeting_created_at).toLocaleDateString();
      const title = c.meeting_title || 'Untitled meeting';
      return `[${i + 1}] (${title}, ${when})\n${c.text}`;
    })
    .join('\n\n---\n\n');

  const userPrompt = `<CONTEXT>\n${contextBlock}\n</CONTEXT>\n\nQuestion: ${question}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  let answer = '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: CHAT_SYSTEM_PROMPT,
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user' as const, content: userPrompt },
      ],
    });
    answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI call failed' },
      { status: 500 },
    );
  }

  const citations = chunks.map((c, i) => ({
    index: i + 1,
    meeting_id: c.meeting_id,
    meeting_title: c.meeting_title || 'Untitled meeting',
    meeting_created_at: c.meeting_created_at,
    start_ms: c.start_ms,
    snippet: c.text.length > 200 ? c.text.slice(0, 200) + '…' : c.text,
  }));

  return NextResponse.json({ answer, citations });
}
