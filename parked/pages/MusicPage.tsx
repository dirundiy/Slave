import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaylistSummary, Track } from '../types';
import { usePlayer, useSpotify } from '../player/PlayerContext';
import { EASE, mss } from '../lib/util';
import { Label, PageTitle } from '../components/Label';
import { CDPlayer } from '../components/CDPlayer';

function PlaylistTracks({ pl }: { pl: PlaylistSummary }) {
  const p = usePlayer();
  const [tracks, setTracks] = useState<Track[] | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setTracks(undefined);
    p.getPlaylistTracks(pl.id).then(t => alive && setTracks(t));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pl.id, p.source]);

  if (tracks === undefined) return <p className="hint py-3">loading tracks</p>;
  if (tracks === null)
    return <p className="hint py-3">Spotify only lists the songs in playlists you own or collaborate on. Press play to start this one.</p>;
  return (
    <div>
      {tracks.map((t, i) => {
        const on = p.track?.uri === t.uri;
        return (
          <button key={`${t.uri}-${i}`} className={`trow${on ? ' on' : ''}`} onClick={() => p.playPlaylist(pl.id, t.uri)}>
            <span className="n">{on && p.playing ? <span className="eq"><i /><i /><i /></span> : String(i + 1).padStart(2, '0')}</span>
            <span className="tt-wrap"><span className="tt">{t.title}</span><span className="ta">{t.artist}</span></span>
            <span className="d">{mss(t.dur)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Library() {
  const p = usePlayer();
  const spotify = useSpotify();
  const [open, setOpen] = useState<string | null>(p.currentPlaylistId ?? null);

  return (
    <div>
      <Label action={<span className="faint">{spotify.connected ? 'from spotify' : 'samples'}</span>}>playlists</Label>
      {spotify.connected && p.playlists.length === 0 && <p className="hint">No playlists found on this account yet.</p>}
      <ul className="plist">
        {p.playlists.map(pl => {
          const isOpen = open === pl.id;
          return (
            <li key={pl.id}>
              <div className={`prow${p.currentPlaylistId === pl.id ? ' on' : ''}`}>
                <button className="prow-main" onClick={() => setOpen(isOpen ? null : pl.id)} aria-expanded={isOpen}>
                  <img src={pl.covers[0]} alt="" />
                  <span className="min-w-0">
                    <span className="pname">{pl.name}</span>
                    <span className="pmeta">{pl.total != null ? `${pl.total} tracks` : 'playlist'}</span>
                  </span>
                </button>
                <button className="link" onClick={() => p.playPlaylist(pl.id)}>play</button>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} style={{ overflow: 'hidden' }}>
                    <PlaylistTracks pl={pl} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MusicPage() {
  return (
    <>
      <PageTitle>music</PageTitle>
      <div className="two-col music-cols">
        <section><CDPlayer size="lg" /></section>
        <section><Library /></section>
      </div>
    </>
  );
}
