import { getAccessToken } from './auth';

/* Thin Spotify Web API client. Endpoint paths follow the February 2026 changes
   (playlist contents live under /items, and only for playlists the user owns). */

const BASE = 'https://api.spotify.com/v1';

export class SpotifyError extends Error {
  constructor(public status: number, message: string, public reason?: string) {
    super(message);
  }
}

export interface SpImage { url: string; width?: number | null; height?: number | null }
export interface SpTrack {
  type: 'track';
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: SpImage[]; release_date?: string };
  external_urls?: { spotify?: string };
}
export interface SpEpisode {
  type: 'episode';
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  images: SpImage[];
  show?: { name: string; images: SpImage[] };
  external_urls?: { spotify?: string };
}
export interface SpPlaybackState {
  device: { id: string | null; name: string; volume_percent: number | null; is_active: boolean } | null;
  is_playing: boolean;
  progress_ms: number | null;
  shuffle_state: boolean;
  repeat_state: 'off' | 'context' | 'track';
  item: SpTrack | SpEpisode | null;
  context: { uri: string } | null;
}
export interface SpPlaylist {
  id: string;
  name: string;
  uri: string;
  images: SpImage[] | null;
  owner: { id: string; display_name?: string };
  collaborative?: boolean;
  items?: { total: number } | null;
  tracks?: { total: number } | null; // pre-2026 field name, still seen on some responses
}
export interface SpUser { id: string; display_name: string | null; images?: SpImage[] }

function withQuery(path: string, q: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

async function sp<T>(path: string, init: RequestInit = {}, retried = false): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyError(401, 'Not signed in to Spotify.');
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }
  });
  if (res.status === 401 && !retried) {
    const fresh = await getAccessToken(true);
    if (fresh) return sp<T>(path, init, true);
  }
  if (res.status === 204 || res.status === 202) return null;
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null; // some player commands answer 200 with an empty or non-JSON body
  }
  if (!res.ok) {
    const err = body?.error;
    throw new SpotifyError(res.status, err?.message || res.statusText || 'Spotify request failed.', err?.reason);
  }
  return body as T;
}

export const getMe = () => sp<SpUser>('/me');
export const getPlaybackState = () => sp<SpPlaybackState>('/me/player?additional_types=episode');
export const getMyPlaylists = () => sp<{ items: SpPlaylist[] }>('/me/playlists?limit=50');
export const getPlaylistItems = (id: string) =>
  sp<{ items: { item?: SpTrack | SpEpisode | null; track?: SpTrack | SpEpisode | null }[] }>(`/playlists/${id}/items?limit=50`);

export function play(opts: { deviceId?: string; contextUri?: string; offsetUri?: string; uris?: string[] } = {}) {
  const body: Record<string, unknown> = {};
  if (opts.contextUri) body.context_uri = opts.contextUri;
  if (opts.offsetUri) body.offset = { uri: opts.offsetUri };
  if (opts.uris) body.uris = opts.uris;
  return sp(withQuery('/me/player/play', { device_id: opts.deviceId }), {
    method: 'PUT',
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  });
}
export const pause = () => sp('/me/player/pause', { method: 'PUT' });
export const nextTrack = () => sp('/me/player/next', { method: 'POST' });
export const previousTrack = () => sp('/me/player/previous', { method: 'POST' });
export const seekTo = (ms: number) => sp(withQuery('/me/player/seek', { position_ms: Math.round(ms) }), { method: 'PUT' });
export const setVolumePercent = (pct: number) => sp(withQuery('/me/player/volume', { volume_percent: Math.round(pct) }), { method: 'PUT' });
export const setShuffle = (on: boolean) => sp(withQuery('/me/player/shuffle', { state: on }), { method: 'PUT' });
export const setRepeat = (mode: 'off' | 'context' | 'track') => sp(withQuery('/me/player/repeat', { state: mode }), { method: 'PUT' });
export const transferTo = (deviceId: string, startPlaying: boolean) =>
  sp('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [deviceId], play: startPlaying }) });
