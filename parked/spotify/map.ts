import type { Repeat, Track } from '../types';
import { COVERS } from '../data/covers';
import type { SpEpisode, SpImage, SpTrack } from './api';
import type { SdkTrack } from './sdk';

export const bestImage = (images?: SpImage[] | null) =>
  images && images.length ? [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0].url : COVERS.blank;

export function fromApiItem(item: SpTrack | SpEpisode): Track {
  if (item.type === 'episode') {
    return {
      id: item.id, uri: item.uri, title: item.name, artist: item.show?.name ?? 'podcast', album: item.show?.name ?? '',
      dur: item.duration_ms / 1000, cover: bestImage(item.images?.length ? item.images : item.show?.images),
      url: item.external_urls?.spotify, source: 'spotify'
    };
  }
  const year = item.album.release_date ? parseInt(item.album.release_date, 10) : undefined;
  return {
    id: item.id, uri: item.uri, title: item.name, artist: item.artists.map(a => a.name).join(', '), album: item.album.name,
    year: Number.isFinite(year) ? year : undefined, dur: item.duration_ms / 1000, cover: bestImage(item.album.images),
    url: item.external_urls?.spotify, source: 'spotify'
  };
}

export function fromSdkTrack(t: SdkTrack): Track {
  return {
    id: t.id ?? t.uri, uri: t.uri, title: t.name, artist: t.artists.map(a => a.name).join(', '), album: t.album.name,
    dur: t.duration_ms / 1000, cover: bestImage(t.album.images),
    url: t.id ? `https://open.spotify.com/track/${t.id}` : undefined, source: 'spotify'
  };
}

export const repeatFromApi = (r: 'off' | 'context' | 'track'): Repeat => (r === 'context' ? 'all' : r === 'track' ? 'one' : 'off');
export const repeatToApi = (r: Repeat) => (r === 'all' ? 'context' : r === 'one' ? 'track' : 'off') as 'off' | 'context' | 'track';
export const repeatFromSdk = (m: 0 | 1 | 2): Repeat => (m === 1 ? 'all' : m === 2 ? 'one' : 'off');
