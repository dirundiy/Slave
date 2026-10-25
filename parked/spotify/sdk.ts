/* Spotify Web Playback SDK: turns this browser tab into a Spotify device.
   Spotify only lets Premium accounts play through it. */

export interface SdkImage { url: string; width?: number | null; height?: number | null }
export interface SdkTrack {
  id: string | null;
  uri: string;
  name: string;
  duration_ms: number;
  type?: string;
  artists: { name: string }[];
  album: { name: string; images: SdkImage[] };
}
export interface SdkState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat_mode: 0 | 1 | 2;
  context: { uri: string | null; metadata?: { name?: string } | null };
  track_window: { current_track: SdkTrack | null };
}
export interface SdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (arg: any) => void): boolean;
  activateElement?(): Promise<void>;
  setVolume(v: number): Promise<void>;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SdkPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let loading: Promise<void> | null = null;

export function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.async = true;
      s.onerror = () => {
        loading = null;
        reject(new Error('Could not load the Spotify player.'));
      };
      document.body.appendChild(s);
    });
  }
  return loading;
}
