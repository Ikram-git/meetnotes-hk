import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

const KEY_PREFIX = 'briva_sk_';

function hashKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Generate a new personal API key. Returns the plaintext value (only shown
 * at creation) and the prefix (safe to store/display).
 */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString('base64url'); // 32 chars
  const plaintext = `${KEY_PREFIX}${random}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 14), // "briva_sk_abcde"
    hash: hashKey(plaintext),
  };
}

/**
 * Authenticate an external API request via `Authorization: Bearer briva_sk_...`.
 * Returns the user id if the key is valid and not revoked, null otherwise.
 * Uses the admin client because we need to bypass RLS to look up hashes.
 */
export async function authenticateApiKey(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token.startsWith(KEY_PREFIX)) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );

  const hash = hashKey(token);
  const { data } = await admin
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', hash)
    .single();

  if (!data || data.revoked_at) return null;

  // Best-effort last_used update; don't block on it.
  admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then();

  return data.user_id;
}
