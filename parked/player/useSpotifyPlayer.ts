import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerApi, PlaylistSummary, Repeat, Track } from '../types';
import * as api from '../spotify/api';
import { SpotifyError } from '../spotify/api';
import { getAccessToken, logout } from '../spotify/auth';
import { loadSdk, type SdkPlayer, type SdkState } from '../spotify/sdk';
import { bestImage, fromApiItem, fromSdkTrack, repeatFromApi, repeatFromSdk, repeatToApi } from '../spotify/map';

/* Real Spotify playback.
   - The Web Playback SDK makes this tab a device called "slaveaway." (Premium only).
   - The Web API reads and controls whatever device is active, including a phone or desktop app.
   State comes from SDK events when this tab is playing, and from polling /me/player otherwise. */

interface Snap {
  track: Track | null;
  playing: boolean;
  posMs: number;
  at: number; // when posMs was measured
  shuffle: boolean;
  repeat: Repeat;
  volume: number;
  device: { id: string | null; name: string; local: boolean } | null;
  contextUri: string | null;
  contextName?: string;
}
const EMPTY: Snap = { track: null, playing: false, posMs: 0, at: 0, shuffle: false, repeat: 'off', volume: 0.7, device: null, contextUri: null };

const NO_DEVICE = 'No active Spotify device yet. Press play to start music here, or open Spotify on your phone or computer.';

export function useSpotifyPlayer(enabled: boolean, onSignedOut: () => void): PlayerApi {
  const [snap, setSnap] = useState<Snap>(EMPTY);
  const [user, setUser] = useState<{ name: string; image?: string } | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const playerRef = useRef<SdkPlayer | null>(null);
  const localId = useRef<string | null>(null);
  const lastSdkEvent = useRef(0);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const volumeTimer = useRef<number>();

  const fail = useCallback(
    (e: unknown) => {
      if (!(e instanceof SpotifyError)) {
        setNotice('Could not reach Spotify. Check your connection.');
        return;
      }
      if (e.status === 401) {
        logout();
        onSignedOut();
      } else if (e.status === 403 && /premium/i.test(`${e.reason} ${e.message}`)) {
        setNotice('Controlling playback needs Spotify Premium.');
      } else if (e.status === 403) {
        setNotice('Spotify refused this request. If you are not the app owner, ask them to add your account under User Management in the Spotify dashboard.');
      } else if (e.status === 404) {
        setNotice(NO_DEVICE);
      } else if (e.status === 429) {
        setNotice('Spotify is limiting requests for a moment. Try again shortly.');
      } else {
        setNotice(e.message);
      }
    },
    [onSignedOut]
  );

  const refresh = useCallback(async () => {
    try {
      const st = await api.getPlaybackState();
      if (!st || !st.device) {
        setSnap(s => ({ ...s, playing: false, device: null }));
        return;
      }
      const local = !!localId.current && st.device.id === localId.current;
      const device = { id: st.device.id, name: local ? 'this browser' : st.device.name, local };
      // SDK events are fresher than polling for this tab.
      if (local && Date.now() - lastSdkEvent.current < 2500) {
        setSnap(s => ({ ...s, device }));
        return;
      }
      setSnap(s => ({
        track: st.item ? fromApiItem(st.item) : null,
        playing: st.is_playing,
        posMs: st.progress_ms ?? 0,
        at: Date.now(),
        shuffle: st.shuffle_state,
        repeat: repeatFromApi(st.repeat_state),
        volume: st.device!.volume_percent != null ? st.device!.volume_percent / 100 : s.volume,
        device,
        contextUri: st.context?.uri ?? null,
        contextName: s.contextUri === (st.context?.uri ?? null) ? s.contextName : undefined
      }));
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  // Account, playlists and the in-browser device.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    api.getMe()
      .then(u => !cancelled && u && setUser({ name: u.display_name || u.id, image: u.images?.[0]?.url }))
      .catch(e => {
        if (e instanceof SpotifyError && e.status === 403)
          setNotice('This Spotify account is not on the app’s user list. Add it under User Management in the Spotify developer dashboard.');
        else fail(e);
      });

    api.getMyPlaylists()
      .then(r => {
        if (cancelled || !r) return;
        setPlaylists(
          r.items.filter(Boolean).map(p => ({
            id: p.id, name: p.name, uri: p.uri, covers: [bestImage(p.images)],
            total: p.items?.total ?? p.tracks?.total ?? undefined,
            // Since Feb 2026 Spotify only returns contents for playlists you own or collaborate on.
            owned: p.items != null || !!p.collaborative
          }))
        );
      })
      .catch(fail);

    loadSdk()
      .then(() => {
        if (cancelled || !window.Spotify) return;
        const player = new window.Spotify.Player({
          name: 'slaveaway.',
          volume: 0.7,
          getOAuthToken: cb => void getAccessToken().then(t => t && cb(t))
        });
        player.addListener('ready', ({ device_id }: { device_id: string }) => (localId.current = device_id));
        player.addListener('not_ready', () => (localId.current = null));
        player.addListener('player_state_changed', (s: SdkState | null) => {
          if (!s) return;
          lastSdkEvent.current = Date.now();
          const cur = s.track_window.current_track;
          setSnap(prev => ({
            ...prev,
            track: cur ? fromSdkTrack(cur) : null,
            playing: !s.paused,
            posMs: s.position,
            at: Date.now(),
            shuffle: s.shuffle,
            repeat: repeatFromSdk(s.repeat_mode),
            device: { id: localId.current, name: 'this browser', local: true },
            contextUri: s.context?.uri ?? null,
            contextName: s.context?.metadata?.name || prev.contextName
          }));
        });
        player.addListener('account_error', () =>
          setNotice('Playing in the browser needs Spotify Premium. You can still see and control music playing on your other devices.')
        );
        player.addListener('authentication_error', () => setNotice('Spotify sign-in expired. Connect again.'));
        player.addListener('initialization_error', ({ message }: { message: string }) => setNotice(`This browser could not start Spotify playback: ${message}`));
        player.addListener('playback_error', ({ message }: { message: string }) => setNotice(message));
        void player.connect();
        playerRef.current = player;
      })
      .catch(e => setNotice((e as Error).message));

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
      localId.current = null;
      setSnap(EMPTY);
      setUser(null);
      setPlaylists([]);
      setNotice(null);
    };
  }, [enabled, fail]);

  // Poll the active device. Slower while the tab is hidden.
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: number;
    const loop = async () => {
      await refresh();
      if (!stopped) timer = window.setTimeout(loop, document.hidden ? 15000 : 3000);
    };
    void loop();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [enabled, refresh]);

  // Re-render while playing so the progress bar moves between polls.
  useEffect(() => {
    if (!enabled || !snap.playing) return;
    const id = window.setInterval(() => setTick(x => x + 1), 250);
    return () => window.clearInterval(id);
  }, [enabled, snap.playing]);

  const positionMs = () => {
    const s = snapRef.current;
    const ms = s.playing ? s.posMs + (Date.now() - s.at) : s.posMs;
    return s.track ? Math.min(ms, s.track.dur * 1000) : 0;
  };

  const run = async (cmd: () => Promise<unknown>, optimistic?: (s: Snap) => Snap) => {
    if (optimistic) setSnap(optimistic);
    try {
      await cmd();
      setNotice(null);
    } catch (e) {
      fail(e);
    }
    window.setTimeout(() => void refresh(), 700);
  };

  // Browsers only allow audio after a click; the SDK needs this on the first one.
  const activate = () => void playerRef.current?.activateElement?.();

  const toggle = () => {
    activate();
    const s = snapRef.current;
    if (s.playing) return void run(() => api.pause(), x => ({ ...x, playing: false, posMs: positionMs(), at: Date.now() }));
    if (!s.device) {
      if (localId.current) return void run(() => api.transferTo(localId.current!, true));
      return setNotice(NO_DEVICE);
    }
    void run(() => api.play(), x => ({ ...x, playing: true, at: Date.now() }));
  };

  const playPlaylist = (id: string, trackUri?: string) => {
    activate();
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;
    const target = snapRef.current.device ? undefined : localId.current ?? undefined;
    if (!snapRef.current.device && !target) return setNotice(NO_DEVICE);
    void run(() => api.play({ deviceId: target, contextUri: pl.uri, offsetUri: trackUri }), x => ({ ...x, contextName: pl.name }));
  };

  const setVolume = (v: number) => {
    setSnap(x => ({ ...x, volume: v }));
    if (snapRef.current.device?.local && playerRef.current) {
      void playerRef.current.setVolume(v);
      return;
    }
    window.clearTimeout(volumeTimer.current);
    volumeTimer.current = window.setTimeout(() => void run(() => api.setVolumePercent(v * 100)), 250);
  };

  const s = snap;
  const contextName = playlists.find(p => p.uri === s.contextUri)?.name ?? s.contextName;

  return {
    source: 'spotify',
    track: s.track,
    playing: s.playing,
    position: positionMs() / 1000,
    shuffle: s.shuffle,
    repeat: s.repeat,
    volume: s.volume,
    contextName,
    device: s.device ? { name: s.device.name, local: s.device.local } : null,
    notice,
    user,
    playlists,
    currentPlaylistId: playlists.find(p => p.uri === s.contextUri)?.id,
    toggle,
    next: () => void run(() => api.nextTrack()),
    prev: () => void run(() => api.previousTrack()),
    seek: sec => void run(() => api.seekTo(sec * 1000), x => ({ ...x, posMs: sec * 1000, at: Date.now() })),
    setVolume,
    toggleShuffle: () => void run(() => api.setShuffle(!snapRef.current.shuffle), x => ({ ...x, shuffle: !x.shuffle })),
    cycleRepeat: () => {
      const next: Repeat = snapRef.current.repeat === 'off' ? 'all' : snapRef.current.repeat === 'all' ? 'one' : 'off';
      void run(() => api.setRepeat(repeatToApi(next)), x => ({ ...x, repeat: next }));
    },
    playPlaylist,
    getPlaylistTracks: async id => {
      try {
        const r = await api.getPlaylistItems(id);
        if (!r) return [];
        return r.items.map(i => i.item ?? i.track).filter((x): x is NonNullable<typeof x> => !!x).map(fromApiItem);
      } catch {
        return null; // not your playlist: Spotify no longer lists its contents
      }
    }
  };
}
