import type { PlaylistSummary, Track } from '../types';
import { COVERS } from './covers';

// Invented records used before Spotify is connected. No audio.
const t = (id: string, title: string, artist: string, album: string, year: number, dur: number, cover: string, cat: string): Track => ({
  id, uri: `demo:${id}`, title, artist, album, year, dur, cover, cat, source: 'demo'
});

export const DEMO_TRACKS: Track[] = [
  t('t1', 'velvet hours', 'June Marlowe', 'cherry static', 2024, 222, COVERS.cherry, 'SLV-001'),
  t('t2', 'slow dancing in the library', 'Odette', 'nocturnes for nobody', 2023, 258, COVERS.nocturnes, 'SLV-002'),
  t('t3', '438 miles', 'Hollow Saints', 'motel lights', 2022, 185, COVERS.motel, 'SLV-003'),
  t('t4', 'paper moons', 'The Lindens', 'late bloomers', 2025, 177, COVERS.bloomers, 'SLV-004'),
  t('t5', 'blue hour', 'mira kō', 'softcore', 2024, 211, COVERS.softcore, 'SLV-005'),
  t('t6', "honey, it's late", 'Little Wren', 'fern', 2021, 228, COVERS.fern, 'SLV-006'),
  t('t7', 'glass anatomy', 'Saint Vellum', 'ex vivo', 2026, 242, COVERS.exvivo, 'SLV-007')
];
export const DEMO_TRACK: Record<string, Track> = Object.fromEntries(DEMO_TRACKS.map(x => [x.id, x]));

export const DEMO_PLAYLIST_IDS: Record<string, string[]> = {
  p1: ['t2', 't1', 't5', 't7'],
  p2: ['t3', 't4', 't6', 't1'],
  p3: DEMO_TRACKS.map(x => x.id)
};

const meta: [string, string, string][] = [
  ['p1', '3am library', 'for the last chapter'],
  ['p2', 'rainy commute', 'windows fogged up'],
  ['p3', 'the whole crate', 'every sample record']
];
export const DEMO_PLAYLISTS: PlaylistSummary[] = meta.map(([id, name, note]) => ({
  id, name, note, uri: `demo:${id}`, owned: true,
  total: DEMO_PLAYLIST_IDS[id].length,
  covers: DEMO_PLAYLIST_IDS[id].slice(0, 4).map(tid => DEMO_TRACK[tid].cover)
}));
