import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `You are Briva's live meeting AI assistant. The user is in a live meeting right now and will ask you questions about what's being discussed. You have access to the meeting transcript as it's being captured.

Rules:
- Answer based only on the meeting transcript provided. If the transcript doesn't have the information yet, say so and suggest what to listen for.
- Keep answers concise — the user is in a live meeting and needs quick info. 1-3 short sentences or a tight bullet list.
- Format for quick scanning: bullets, bold key terms, short sentences.
- Preserve meaning across languages (EN / Cantonese / Mandarin code-switching is common).
- Never invent facts, participants, or decisions that aren't in the transcript.
`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) {
    console.log('[Ask] Unauthorized — no cookie session, no bearer token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const transcript: string = typeof body.transcript === 'string' ? body.transcript : '';
  const question: string = typeof body.question === 'string' ? body.question : '';
  const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

  if (!question.trim()) {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 });
  }

  const userTurn = transcript.trim()
    ? `Meeting transcript so far:\n"""\n${transcript}\n"""\n\nQuestion: ${question}`
    : `The meeting transcript is empty so far. Question: ${question}`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content } as Anthropic.MessageParam)),
    { role: 'user', content: userTurn },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Ask] stream failed:', msg);
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
