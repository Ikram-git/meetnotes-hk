import { createClient } from '@/lib/supabase/server';
import { createClient as createDeepgram } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

/**
 * Diagnoses Deepgram key permissions. Calls a few endpoints and reports
 * what works and what returns FORBIDDEN so we can identify the exact
 * permission boundary.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
  }

  const results: Record<string, unknown> = {
    keyPrefix: apiKey.substring(0, 8),
    keyLength: apiKey.length,
  };

  // Test 1: list projects (tests basic key validity)
  try {
    const projectsRes = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${apiKey}` },
    });
    results.listProjects = {
      status: projectsRes.status,
      ok: projectsRes.ok,
      body: await projectsRes.json().catch(() => null),
    };
  } catch (err) {
    results.listProjects = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test 2: grant token (tests Member scope)
  try {
    const dg = createDeepgram(apiKey);
    const { result, error } = await dg.auth.grantToken();
    results.grantToken = {
      error: error ? { message: error.message, name: error.name } : null,
      result: result ? { hasToken: !!result.access_token, expires_in: result.expires_in } : null,
    };
  } catch (err) {
    results.grantToken = { threw: err instanceof Error ? err.message : String(err) };
  }

  // Test 3: direct REST prerecorded endpoint (tests usage:write)
  try {
    const preRes = await fetch(
      'https://api.deepgram.com/v1/listen?url=https://dpgr.am/spacewalk.wav&model=nova-2',
      { method: 'POST', headers: { Authorization: `Token ${apiKey}` } },
    );
    results.prerecorded = {
      status: preRes.status,
      ok: preRes.ok,
      body: await preRes.json().catch(() => null),
    };
  } catch (err) {
    results.prerecorded = { error: err instanceof Error ? err.message : String(err) };
  }

  // Test various WebSocket auth paths
  const WebSocketMod = (await import('ws')).default;
  const runWs = (label: string, url: string, opts: Record<string, unknown>) =>
    new Promise<unknown>((resolve) => {
      const ws = new WebSocketMod(url, opts as never);
      const timer = setTimeout(() => {
        ws.close();
        resolve({ label, result: 'timeout' });
      }, 5000);
      ws.on('open', () => {
        clearTimeout(timer);
        ws.close();
        resolve({ label, result: 'opened' });
      });
      ws.on('unexpected-response', (_req, res) => {
        clearTimeout(timer);
        let body = '';
        res.on('data', (c: Buffer) => (body += c.toString()));
        res.on('end', () => resolve({ label, result: 'rejected', status: res.statusCode, body }));
      });
      ws.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({ label, result: 'error', message: err.message });
      });
    });

  const baseUrl =
    'wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1&language=en';

  results.wsHeaderAuth = await runWs('header', baseUrl, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  results.wsSubprotocolAuth = await runWs('subprotocol', baseUrl, {
    protocol: ['token', apiKey],
  });
  results.wsHeaderAuthDiarize = await runWs('header+diarize', `${baseUrl}&diarize=true`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  results.wsSubprotocolDiarize = await runWs(
    'subprotocol+diarize',
    `${baseUrl}&diarize=true`,
    { protocol: ['token', apiKey] },
  );

  // Test with a minted JWT instead of raw key
  try {
    const dg = createDeepgram(apiKey);
    const { result: tokenResult } = await dg.auth.grantToken();
    const jwt = tokenResult?.access_token;
    if (jwt) {
      results.wsJwtAsToken = await runWs('jwt as token', baseUrl, { protocol: ['token', jwt] });
      results.wsJwtAsBearer = await runWs('jwt as bearer', baseUrl, { protocol: ['bearer', jwt] });
    } else {
      results.wsJwt = 'no jwt available';
    }
  } catch (err) {
    results.wsJwt = { err: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results);
}
