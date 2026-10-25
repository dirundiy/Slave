/* Spotify sign-in: Authorization Code with PKCE.
   No client secret exists in this flow, so nothing secret ships to the browser.
   Tokens live in localStorage for now; they move to the account backend with Google sign-in. */

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export const CLIENT_ID = ((import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '').trim();
export const REDIRECT_URI =
  ((import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ?? '').trim() || `${window.location.origin}/callback`;

// streaming + user-read-email + user-read-private are required by the Web Playback SDK.
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative'
].join(' ');

const TOKEN_KEY = 'slaveaway:spotify-token';
const VERIFIER_KEY = 'slaveaway:pkce-verifier';
const STATE_KEY = 'slaveaway:pkce-state';

interface Tokens { access_token: string; refresh_token: string; expires_at: number }

function readTokens(): Tokens | null {
  try {
    const v = localStorage.getItem(TOKEN_KEY);
    return v ? (JSON.parse(v) as Tokens) : null;
  } catch {
    return null;
  }
}
function saveTokens(t: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export const isConfigured = () => CLIENT_ID.length > 0;
export const isLoggedIn = () => isConfigured() && readTokens() !== null;

function base64url(bytes: Uint8Array) {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randomString(byteLength: number) {
  const a = new Uint8Array(byteLength);
  crypto.getRandomValues(a);
  return base64url(a);
}
async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function beginLogin() {
  if (!isConfigured()) throw new Error('Add VITE_SPOTIFY_CLIENT_ID to .env.local first.');
  const verifier = randomString(64);
  const state = randomString(16);
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state
  });
  window.location.assign(`${AUTH_URL}?${params}`);
}

/** Finishes sign-in when Spotify redirects back. Returns an error message, or null. */
export async function completeLoginFromUrl(): Promise<string | null> {
  const url = new URL(window.location.href);
  if (url.pathname !== new URL(REDIRECT_URI).pathname) return null;

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  const expected = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState(null, '', '/');

  if (error) return error === 'access_denied' ? 'Spotify connection was cancelled.' : `Spotify returned an error: ${error}.`;
  if (!code || !verifier || state !== expected) return 'The Spotify sign-in could not be verified. Try connecting again.';

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID, code_verifier: verifier })
  });
  if (!res.ok) return `Spotify sign-in failed (${res.status}). Check that your app's redirect URI is exactly ${REDIRECT_URI}.`;
  const j = await res.json();
  saveTokens({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000 });
  return null;
}

let refreshing: Promise<string | null> | null = null;

async function refresh(t: Tokens): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: CLIENT_ID })
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 401) logout();
      return null;
    }
    const j = await res.json();
    const next: Tokens = {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? t.refresh_token,
      expires_at: Date.now() + j.expires_in * 1000
    };
    saveTokens(next);
    return next.access_token;
  } catch {
    return null;
  }
}

/** A valid access token, refreshed when it is within a minute of expiring. */
export async function getAccessToken(force = false): Promise<string | null> {
  const t = readTokens();
  if (!t) return null;
  if (!force && t.expires_at - 60_000 > Date.now()) return t.access_token;
  if (!refreshing) refreshing = refresh(t).finally(() => (refreshing = null));
  return refreshing;
}
