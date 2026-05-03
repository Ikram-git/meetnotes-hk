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

interface MeetingDigest {
  id: string;
  title: string | null;
  created_at: string;
  overview: string | null;
  summary_text: string | null;
  key_points: Array<{ text?: string }> | null;
  action_items: Array<{ text?: string; assignee?: string | null }> | null;
  topics: Array<{ name?: string }> | null;
}

const CHAT_SYSTEM_PROMPT = `You are Briva AI, a concise meeting researcher. The user asks questions about meetings their team has held; you answer using ONLY the material provided in <CONTEXT/>.

<CONTEXT/> contains two kinds of items:
- <MEETING/> blocks: a high-level summary of one meeting (overview, key points, action items, topics).
- <CHUNK/> blocks: verbatim transcript excerpts from one of those meetings.

Rules:
- Cite sources with [#N] markers — N is the index of the source you used (1-based, matching the order in <CONTEXT/>). You may cite multiple in one sentence: "they agreed on Friday [#2][#3]".
- For "summarise the latest meeting" type questions, draw mostly from the relevant <MEETING/> block, not the chunks.
- For specific factual questions ("what did Anna say about X"), prefer <CHUNK/> blocks for verbatim quotes.
- If the context doesn't contain enough information to answer, say so plainly. Do not invent facts.
- Reply in the same language the user asked in.
- Keep replies tight: a paragraph or short bullets. No preamble like "Based on the transcripts...".`;

const SUMMARY_INTENT_RE =
  /\b(summari[sz]e|summary of|tell me about|recap|what (?:happened|did we discuss) in)\b.*\b(latest|recent|most recent|last|today'?s|yesterday'?s|this(?: week|'s))?\s*meeting/i;
const PURE_LATEST_RE = /\b(latest|most recent|last)\s+meeting\b/i;

function isLatestMeetingQuery(q: string): boolean {
  return SUMMARY_INTENT_RE.test(q) || PURE_LATEST_RE.test(q);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
  }

  const body = (await req.json()) as {
    question?: string;
    history?: ChatTurn[];
    threadId?: string | null;
  };
  const question = (body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

  const history = (body.history ?? []).slice(-10);

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Resolve / create the thread the messages will be saved to.
  let threadId = body.threadId ?? null;
  if (threadId) {
    const { data: existing } = await admin
      .from('workspace_chat_threads')
      .select('id, user_id')
      .eq('id', threadId)
      .maybeSingle();
    if (!existing || existing.user_id !== user.id) {
      threadId = null;
    }
  }
  if (!threadId) {
    const { data: created } = await admin
      .from('workspace_chat_threads')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        title: question.length > 60 ? question.slice(0, 57) + '…' : question,
      })
      .select('id')
      .single();
    threadId = created?.id ?? null;
  }

  // 1. Vector search for relevant chunks (skipped if obviously a "latest
  //    meeting" intent — RAG underperforms on meta-questions like
  //    "summarise the latest meeting" because the query has no semantic
  //    content matching transcript text).
  let chunks: MatchedChunk[] = [];
  const useRag = !isLatestMeetingQuery(question);

  if (useRag) {
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

    const { data: matches, error: searchErr } = await admin.rpc('match_workspace_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      workspace_id_in: workspaceId,
      match_count: 8,
      similarity_threshold: 0.35,
    });
    if (searchErr) {
      return NextResponse.json({ error: searchErr.message }, { status: 500 });
    }
    chunks = (matches ?? []) as MatchedChunk[];
  }

  // 2. Pull the most recent 3 meetings as a "always-on" context (used as
  //    the primary source for "summarise the latest meeting" questions,
  //    and as a complement to chunks for everything else).
  const { data: recentMeetings } = await admin
    .from('meetings')
    .select('id, title, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3);

  // 3. Collect the meeting_ids we want full summaries for: every chunk's
  //    parent meeting + the recent 3 (deduped).
  const summaryMeetingIds = Array.from(
    new Set([
      ...chunks.map((c) => c.meeting_id),
      ...(recentMeetings ?? []).map((m) => m.id),
    ]),
  );

  let digests: MeetingDigest[] = [];
  if (summaryMeetingIds.length > 0) {
    const { data: meetings } = await admin
      .from('meetings')
      .select('id, title, created_at')
      .in('id', summaryMeetingIds);
    const { data: summaries } = await admin
      .from('summaries')
      .select('meeting_id, overview, summary_text, key_points, action_items, topics')
      .in('meeting_id', summaryMeetingIds);

    const summaryByMeeting = new Map((summaries ?? []).map((s: any) => [s.meeting_id, s]));
    digests = (meetings ?? []).map((m) => {
      const s = summaryByMeeting.get(m.id) || {};
      return {
        id: m.id,
        title: m.title,
        created_at: m.created_at,
        overview: s.overview ?? null,
        summary_text: s.summary_text ?? null,
        key_points: s.key_points ?? null,
        action_items: s.action_items ?? null,
        topics: s.topics ?? null,
      };
    });
    // Sort digests by recency so [#1] tends to be the most recent meeting
    digests.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }

  if (digests.length === 0 && chunks.length === 0) {
    return NextResponse.json({
      answer:
        "I couldn't find anything in this workspace's meetings that answers that. Try a different question, or upload more meetings first.",
      citations: [],
    });
  }

  // 4. Build the unified context. Citations are numbered across both
  //    digests and chunks so the model can reference either.
  const contextParts: string[] = [];
  const citations: Array<{
    index: number;
    meeting_id: string;
    meeting_title: string;
    meeting_created_at: string;
    start_ms: number | null;
    snippet: string;
  }> = [];

  let n = 0;
  for (const d of digests) {
    n++;
    const when = new Date(d.created_at).toLocaleDateString();
    const title = d.title || 'Untitled meeting';
    const lines: string[] = [`[${n}] <MEETING title="${title}" date="${when}">`];
    if (d.overview) lines.push(`Overview: ${d.overview}`);
    if (d.summary_text) lines.push(`Summary:\n${d.summary_text}`);
    const kps = (d.key_points ?? []).map((k) => k?.text).filter(Boolean) as string[];
    if (kps.length) lines.push(`Key points:\n- ${kps.join('\n- ')}`);
    const ais = (d.action_items ?? [])
      .map((a) => (a?.text ? `${a.text}${a.assignee ? ` (${a.assignee})` : ''}` : null))
      .filter(Boolean) as string[];
    if (ais.length) lines.push(`Action items:\n- ${ais.join('\n- ')}`);
    const ts = (d.topics ?? []).map((t) => t?.name).filter(Boolean) as string[];
    if (ts.length) lines.push(`Topics: ${ts.join(', ')}`);
    lines.push('</MEETING>');
    contextParts.push(lines.join('\n'));

    citations.push({
      index: n,
      meeting_id: d.id,
      meeting_title: title,
      meeting_created_at: d.created_at,
      start_ms: null,
      snippet: d.overview || d.summary_text?.slice(0, 200) || '',
    });
  }

  for (const c of chunks) {
    n++;
    const when = new Date(c.meeting_created_at).toLocaleDateString();
    const title = c.meeting_title || 'Untitled meeting';
    contextParts.push(
      `[${n}] <CHUNK title="${title}" date="${when}" speaker="${c.speaker_label ?? ''}">\n${c.text}\n</CHUNK>`,
    );
    citations.push({
      index: n,
      meeting_id: c.meeting_id,
      meeting_title: title,
      meeting_created_at: c.meeting_created_at,
      start_ms: c.start_ms,
      snippet: c.text.length > 200 ? c.text.slice(0, 200) + '…' : c.text,
    });
  }

  const userPrompt = `<CONTEXT>\n${contextParts.join('\n\n---\n\n')}\n</CONTEXT>\n\nQuestion: ${question}`;

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

  // Persist both turns. Best-effort — if it fails the user still got
  // their answer; we just won't have the history.
  if (threadId) {
    const { count } = await admin
      .from('workspace_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId);
    const startIndex = count ?? 0;
    await admin.from('workspace_chat_messages').insert([
      {
        thread_id: threadId,
        role: 'user',
        content: question,
        turn_index: startIndex,
      },
      {
        thread_id: threadId,
        role: 'assistant',
        content: answer,
        citations,
        turn_index: startIndex + 1,
      },
    ]);
    // Bump the thread's updated_at so the sidebar list reflects activity.
    await admin
      .from('workspace_chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);
  }

  return NextResponse.json({ answer, citations, threadId });
}
