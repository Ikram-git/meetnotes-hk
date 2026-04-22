import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

export function getRedirectUri(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}/api/google/auth/callback`;
}

export function buildOAuthClient(redirectUri: string): OAuth2Client {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not set');
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

export function buildOAuthClientFromTokens(
  redirectUri: string,
  accessToken: string,
  refreshToken: string,
): OAuth2Client {
  const client = buildOAuthClient(redirectUri);
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}
