/**
 * Translate any thrown error or API error message into something safe
 * to show users. Hides stack traces, internal IDs, and noisy fetch
 * errors behind a calm "try again" message, while preserving
 * intentional API error messages (which we control).
 */
export function friendlyErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (typeof err === 'string') return classify(err) || err;
  if (err instanceof Error) return classify(err.message) || fallback;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === 'string') return classify(msg) || msg;
  }
  return fallback;
}

function classify(message: string): string | null {
  const lower = message.toLowerCase();

  // Network / connectivity
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('err_network')
  ) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (lower.includes('err_quic') || lower.includes('err_connection_reset')) {
    return 'The connection dropped. Please retry.';
  }
  if (lower.includes('aborted') || lower.includes('timeout') || lower.includes('etimedout')) {
    return 'The request timed out. Try again on a more stable connection.';
  }

  // TUS resumable upload failures (we use this for big audio uploads).
  // The library's stringified errors look like:
  //   tus: failed to upload chunk at offset 12582912, caused by [object ProgressEvent]
  if (lower.startsWith('tus:') || lower.includes('failed to upload chunk')) {
    return 'The upload was interrupted. Click Try again to resume.';
  }
  if (lower.includes('storage') && lower.includes('quota')) {
    return 'Storage is full for this workspace. Delete old meetings or upgrade.';
  }

  // Common server-side messages we want to soften
  if (lower.includes('unexpected token') || lower.includes('json')) {
    return 'The server returned an unexpected response. Please try again.';
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return "You don't have permission to do that.";
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Your session expired. Please sign in again.';
  }
  if (lower.includes('429') || lower.includes('rate')) {
    return 'Too many requests right now — wait a few seconds and retry.';
  }
  if (lower.includes('500') || lower.includes('internal server error')) {
    return 'The server hit a snag. Please try again in a moment.';
  }

  // No transformation — message is short and intentional, let it through
  return null;
}
