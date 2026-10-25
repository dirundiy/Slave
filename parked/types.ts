export type Source = 'demo' | 'spotify';
export type Repeat = 'off' | 'all' | 'one';

export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  dur: number; // seconds
  cover: string;
  cat?: string;
  url?: string; // link back to Spotify
  source: Source;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  uri: string;
  covers: string[];
  total?: number;
  owned: boolean;
  note?: string;
}

export interface PlayerApi {
  source: Source;
  track: Track | null;
  playing: boolean;
  position: number; // seconds
  shuffle: boolean;
  repeat: Repeat;
  volume: number; // 0..1
  contextName?: string;
  device: { name: string; local: boolean } | null;
  notice: string | null;
  user?: { name: string; image?: string } | null;
  playlists: PlaylistSummary[];
  currentPlaylistId?: string;
  toggle(): void;
  next(): void;
  prev(): void;
  seek(seconds: number): void;
  setVolume(v: number): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  playPlaylist(id: string, trackUri?: string): void;
  getPlaylistTracks(id: string): Promise<Track[] | null>;
}

export interface Task { id: string; text: string; done: boolean; day: string }
export interface Session { id: string; at: string; day: string; minutes: number; sample?: boolean }

export interface FileRef { id: string; name: string; type: string; size: number }
export interface Flashcard { q: string; a: string }
export interface QuizQuestion { q: string; opts: string[]; a: number; why: string }
export interface Message {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  files?: FileRef[];
  kind?: 'text' | 'flashcards' | 'quiz';
  cards?: Flashcard[];
  questions?: QuizQuestion[];
  demo?: boolean;
  sample?: boolean;
}
export interface Chat { id: string; title: string; updated: number; messages: Message[] }

export interface TimerSettings { focus: number; short: number; long: number; every: number; chime: boolean; goal: number }
export type TimerMode = 'focus' | 'short' | 'long';
