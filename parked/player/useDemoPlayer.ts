import { useEffect, useState } from 'react';
import type { PlayerApi, Repeat } from '../types';
import { DEMO_PLAYLISTS, DEMO_PLAYLIST_IDS, DEMO_TRACK } from '../data/demo';

// Sample records with a simulated clock. No audio. Used until Spotify is connected.
export function useDemoPlayer(active: boolean): PlayerApi {
  const [plId, setPlId] = useState('p1');
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(71);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>('off');
  const [volume, setVolume] = useState(0.7);

  const order = DEMO_PLAYLIST_IDS[plId];
  const track = DEMO_TRACK[order[pos]];

  useEffect(() => {
    if (!active || !playing) return;
    const id = window.setInterval(() => setT(x => x + 0.25), 250);
    return () => window.clearInterval(id);
  }, [active, playing]);

  const advance = (dir: 1 | -1, auto: boolean) => {
    if (shuffle && dir > 0 && order.length > 1) {
      let n = pos;
      while (n === pos) n = Math.floor(Math.random() * order.length);
      setPos(n);
      setT(0);
      return;
    }
    let n = pos + dir;
    if (n >= order.length) {
      n = 0;
      if (auto && repeat === 'off') setPlaying(false);
    }
    if (n < 0) n = order.length - 1;
    setPos(n);
    setT(0);
  };

  useEffect(() => {
    if (t < track.dur) return;
    if (repeat === 'one') setT(0);
    else advance(1, true);
  });

  return {
    source: 'demo',
    track,
    playing,
    position: t,
    shuffle,
    repeat,
    volume,
    contextName: DEMO_PLAYLISTS.find(p => p.id === plId)?.name,
    device: null,
    notice: null,
    playlists: DEMO_PLAYLISTS,
    currentPlaylistId: plId,
    toggle: () => setPlaying(p => !p),
    next: () => advance(1, false),
    prev: () => (t > 3 ? setT(0) : advance(-1, false)),
    seek: s => setT(Math.max(0, Math.min(track.dur - 0.5, s))),
    setVolume,
    toggleShuffle: () => setShuffle(s => !s),
    cycleRepeat: () => setRepeat(r => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    playPlaylist: (id, trackUri) => {
      const ids = DEMO_PLAYLIST_IDS[id];
      if (!ids) return;
      const start = trackUri ? Math.max(0, ids.findIndex(x => DEMO_TRACK[x].uri === trackUri)) : 0;
      setPlId(id);
      setPos(start);
      setT(0);
      setPlaying(true);
    },
    getPlaylistTracks: async id => (DEMO_PLAYLIST_IDS[id] ?? []).map(x => DEMO_TRACK[x])
  };
}
