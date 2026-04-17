import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function GET() {
  const keyExists = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 7) || 'MISSING';

  if (!keyExists) {
    return NextResponse.json({
      status: 'error',
      error: 'ANTHROPIC_API_KEY not set in environment',
      keyPrefix,
    });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const start = Date.now();
    const response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Reply with just: OK' }],
      },
      { timeout: 15_000 },
    );
    const elapsed = Date.now() - start;
    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      status: 'ok',
      keyPrefix,
      model: 'claude-sonnet-4-6',
      response: text,
      elapsed_ms: elapsed,
      usage: response.usage,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      keyPrefix,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
