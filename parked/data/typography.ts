import type { Track } from '../types';

/* Album lettering.
   A song title is set in a face that suits its record: artist + album match first,
   then artist alone, then the house serif. Every face here is SIL Open Font License
   (served by Google Fonts) and chosen to evoke the record. None is an official album font.
   To add one: add a rule below and add the family to the Google Fonts link in index.html. */

export interface TypeRule {
  artist: string;
  album?: string;
  font: string;
  family: string;
  style?: 'normal' | 'italic';
  weight?: number;
  transform?: 'none' | 'uppercase' | 'lowercase';
  tracking?: string;
  scale?: number;
  why: string;
}

export const DEFAULT_TYPE: TypeRule = {
  artist: '*', font: 'Instrument Serif', family: '"Instrument Serif", Georgia, serif',
  style: 'italic', scale: 1.06, tracking: '-0.01em', why: 'house serif'
};

export const TYPE_RULES: TypeRule[] = [
  // sample records
  { artist: 'June Marlowe', album: 'cherry static', font: 'Playfair Display', family: '"Playfair Display", Georgia, serif', style: 'italic', weight: 500, tracking: '-0.02em', scale: 0.96, why: 'high-contrast retro serif' },
  { artist: 'Odette', album: 'nocturnes for nobody', font: 'Pinyon Script', family: '"Pinyon Script", cursive', scale: 1.12, why: 'candlelit copperplate' },
  { artist: 'Hollow Saints', album: 'motel lights', font: 'Anton', family: 'Anton, Impact, sans-serif', transform: 'uppercase', tracking: '.01em', why: 'roadside-sign poster sans' },
  { artist: 'The Lindens', album: 'late bloomers', font: 'Special Elite', family: '"Special Elite", "Courier New", monospace', scale: 0.8, why: 'scrapbook typewriter' },
  { artist: 'mira kō', album: 'softcore', font: 'Syne', family: 'Syne, sans-serif', weight: 600, tracking: '-0.03em', scale: 0.9, why: 'soft, wide grotesk' },
  { artist: 'Little Wren', album: 'fern', font: 'Fraunces', family: 'Fraunces, Georgia, serif', style: 'italic', weight: 600, tracking: '-0.02em', scale: 0.94, why: 'warm 1970s soft serif' },
  { artist: 'Saint Vellum', album: 'ex vivo', font: 'Bodoni Moda', family: '"Bodoni Moda", Didot, serif', weight: 500, transform: 'uppercase', tracking: '.06em', scale: 0.74, why: 'cold, glossy didone' },
  // real artists (used with Spotify)
  { artist: 'Taylor Swift', album: 'folklore', font: 'IM Fell English', family: '"IM Fell English", Georgia, serif', style: 'italic', why: 'old-style book serif' },
  { artist: 'Laufey', font: 'Pinyon Script', family: '"Pinyon Script", cursive', scale: 1.12, why: 'jazz-age copperplate' },
  { artist: 'Mitski', font: 'Bodoni Moda', family: '"Bodoni Moda", Didot, serif', style: 'italic', scale: 0.9, why: 'theatrical didone' },
  { artist: 'Clairo', font: 'Cormorant Garamond', family: '"Cormorant Garamond", Georgia, serif', style: 'italic', weight: 500, why: 'soft, bookish serif' },
  { artist: 'Tame Impala', font: 'Syne', family: 'Syne, sans-serif', weight: 700, scale: 0.9, why: 'wide psychedelic grotesk' },
  { artist: 'beabadoobee', font: 'Special Elite', family: '"Special Elite", monospace', scale: 0.82, why: 'zine typewriter' },
  { artist: 'Lana Del Rey', font: 'Playfair Display', family: '"Playfair Display", Georgia, serif', style: 'italic', why: 'old Hollywood serif' }
];

const same = (a?: string, b?: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();
// Spotify gives "Artist A, Artist B"; match on the lead artist.
const lead = (artist: string) => artist.split(',')[0].trim();

export function typeFor(track: Track | null): Required<Omit<TypeRule, 'album'>> {
  const rule =
    (track && TYPE_RULES.find(r => r.album && same(r.artist, lead(track.artist)) && same(r.album, track.album))) ||
    (track && TYPE_RULES.find(r => !r.album && same(r.artist, lead(track.artist)))) ||
    DEFAULT_TYPE;
  return {
    artist: rule.artist, font: rule.font, family: rule.family, why: rule.why,
    style: rule.style ?? 'normal', weight: rule.weight ?? 400, transform: rule.transform ?? 'none',
    tracking: rule.tracking ?? '0', scale: rule.scale ?? 1
  };
}
