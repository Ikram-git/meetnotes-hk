/**
 * Microsoft 365 / Outlook Calendar OAuth + Graph helpers.
 *
 * Uses the v2.0 Microsoft identity platform endpoints with the
 * "common" tenant so both work + personal Microsoft accounts can
 * connect. We hit the Graph API directly via fetch — no SDK
 * dependency, keeps the bundle small.
 */

const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const TENANT = process.env.MS_TENANT || 'common'; // 'common' = work + personal

export const MS_SCOPES = [
  'offline_access',           // refresh tokens
  'openid',
  'profile',
  'email',
  'User.Read',
  'Calendars.Read',
];

const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function getRedirectUri(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}/api/outlook/auth/callback`;
}

export function buildAuthorizeUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}): string {
  if (!CLIENT_ID) {
    throw new Error('MS_CLIENT_ID not set');
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: MS_SCOPES.join(' '),
    state,
    prompt: 'consent',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('MS_CLIENT_ID / MS_CLIENT_SECRET not set');
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    scope: MS_SCOPES.join(' '),
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('MS_CLIENT_ID / MS_CLIENT_SECRET not set');
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: MS_SCOPES.join(' '),
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function graphFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export interface MsUser {
  id: string;
  mail: string | null;
  userPrincipalName: string | null;
  displayName: string | null;
}

export async function getMeInfo(accessToken: string): Promise<MsUser> {
  return graphFetch<MsUser>(accessToken, '/me?$select=id,mail,userPrincipalName,displayName');
}

export interface MsEvent {
  id: string;
  subject: string | null;
  body?: { content?: string; contentType?: string };
  start: { dateTime: string; timeZone: string };
  end:   { dateTime: string; timeZone: string };
  onlineMeeting?: { joinUrl?: string } | null;
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
  }>;
}

interface EventsResponse {
  value: MsEvent[];
}

/**
 * Fetch a single Outlook calendar event by id.
 * Used by auto-recap to look up attendees on the linked event.
 */
export async function fetchEvent(accessToken: string, eventId: string): Promise<MsEvent> {
  return graphFetch<MsEvent>(accessToken, `/me/events/${encodeURIComponent(eventId)}`);
}

/**
 * Fetch the user's upcoming events for the next 24 hours.
 */
export async function fetchUpcomingEvents(accessToken: string): Promise<MsEvent[]> {
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const path = `/me/calendarView?startDateTime=${encodeURIComponent(now)}&endDateTime=${encodeURIComponent(in24h)}&$orderby=start/dateTime&$top=25`;
  const data = await graphFetch<EventsResponse>(accessToken, path);
  return data.value || [];
}
