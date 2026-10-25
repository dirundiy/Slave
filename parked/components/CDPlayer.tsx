import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerApi, Track } from '../types';
import { usePlayer, useSpotify } from '../player/PlayerContext';
import { typeFor } from '../data/typography';
import { EASE, mss } from '../lib/util';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, ShuffleIcon, VolumeIcon } from './Icons';

/* The centerpiece: a jewel case with a CD that slides out and spins while music plays.
   Sample records print their art on the disc. Spotify artwork is shown only uncropped on the
   case (Spotify's display rules), so Spotify discs get a printed label in the album's lettering. */

function useSpin(playing: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useRef(playing);
  on.current = playing;
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reduce ? 30 : 160; // degrees per second
    let raf = 0;
    let last = performance.now();
    let angle = Math.random() * 360;
    let vel = on.current ? speed : 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      vel += ((on.current ? speed : 0) - vel) * Math.min(1, dt * (on.current ? 1.4 : 1.9));
      angle = (angle + vel * dt) % 360;
      if (ref.current) ref.current.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

function Disc({ track, playing, id }: { track: Track | null; playing: boolean; id: string }) {
  const spin = useSpin(playing);
  const ty = typeFor(track);
  const printed = !track || track.source === 'spotify';
  const ring = track ? `${track.artist} · ${track.album} · ${track.cat ?? 'stereo'} · slaveaway. ·` : 'slaveaway. · compact disc · stereo ·';
  return (
    <div className="disc" aria-hidden="true">
      <div className="disc-body">
        <div className="disc-spin" ref={spin}>
          {printed ? (
            <div className="disc-print">
              <span style={{ fontFamily: ty.family, fontStyle: ty.style, fontWeight: ty.weight, textTransform: ty.transform }}>
                {track?.title ?? 'slaveaway.'}
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <motion.img key={track.id} src={track.cover} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
            </AnimatePresence>
          )}
          <div className="disc-grooves" />
          <div className="disc-hub" />
          <svg className="disc-ring" viewBox="0 0 100 100">
            <defs><path id={id} d="M50,50 m-21.5,0 a21.5,21.5 0 1,1 43,0 a21.5,21.5 0 1,1 -43,0" /></defs>
            <text fontSize="2.3" letterSpacing=".55" fontFamily="DM Mono, monospace">
              <textPath href={`#${id}`}>{ring.toUpperCase()}</textPath>
            </text>
          </svg>
        </div>
        <div className="disc-irid" />
        <div className="disc-sheen" />
        <div className="disc-rim" />
      </div>
    </div>
  );
}

function Sleeve({ track }: { track: Track | null }) {
  return (
    <div className="sleeve">
      <div className="spine"><span>{track ? `${track.artist} · ${track.album}` : 'slaveaway.'}</span></div>
      <div className="face">
        <AnimatePresence initial={false}>
          {track && (
            <motion.img
              key={track.id}
              src={track.cover}
              alt={`${track.album} by ${track.artist}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Just the case and disc. `bare` drops the fabric backdrop so it floats on the page. */
export function CDArt({ size = 'md', bare = false }: { size?: 'md' | 'lg'; bare?: boolean }) {
  const p = usePlayer();
  return (
    <div className={`cdp cdp-${size}`}>
      <div className={`stage${bare ? ' bare' : ''}${p.playing ? ' playing' : ''}`}>
        <div className="art">
          <Disc track={p.track} playing={p.playing} id={`ring-${size}-${bare ? 'b' : 'f'}`} />
          <Sleeve track={p.track} />
        </div>
      </div>
    </div>
  );
}

function sourceLine(p: PlayerApi) {
  if (p.source === 'demo') return 'a sample record';
  if (!p.device) return 'spotify, no active device';
  return `on spotify, ${p.device.name}`;
}

/** Title, artist, progress and controls. */
export function NowPlaying({ size = 'md', showVolume = false }: { size?: 'md' | 'lg' | 'xl'; showVolume?: boolean }) {
  const p = usePlayer();
  const spotify = useSpotify();
  const t = p.track;
  const ty = typeFor(t);
  const frac = t ? Math.min(1, p.position / t.dur) : 0;

  return (
    <div className={`np np-${size}`}>
      <p className="soft">{sourceLine(p)}</p>

      <div className="title-wrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={t?.id ?? 'none'}
            className="track-title"
            style={{
              fontFamily: ty.family, fontStyle: ty.style, fontWeight: ty.weight, textTransform: ty.transform,
              letterSpacing: ty.tracking, fontSize: `calc(var(--title) * ${ty.scale})`
            }}
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {t?.title ?? 'nothing playing'}
          </motion.h2>
        </AnimatePresence>
      </div>

      <p className="by">
        {t ? (
          <>
            {t.artist} <span className="soft">— {t.album}</span>
            {t.url && <> <a className="tlink small" href={t.url} target="_blank" rel="noreferrer">open in spotify</a></>}
          </>
        ) : (
          <span className="soft">Pick a playlist, or press play to pick up where you left off.</span>
        )}
      </p>

      <div className="prog">
        <span>{mss(p.position)}</span>
        <div className="bar">
          <div className="bar-fill" style={{ transform: `scaleX(${frac})` }} />
          <div className="bar-knob" style={{ left: `${frac * 100}%` }} />
          <input type="range" aria-label="seek" min={0} max={Math.floor(t?.dur ?? 0)} step={1} value={Math.floor(p.position)} disabled={!t} onChange={e => p.seek(+e.target.value)} />
        </div>
        <span>{mss(t?.dur ?? 0)}</span>
      </div>

      <div className="ctrls">
        <button className={`ib${p.shuffle ? ' on' : ''}`} onClick={p.toggleShuffle} aria-label="shuffle" aria-pressed={p.shuffle}><ShuffleIcon /></button>
        <button className="ib" onClick={p.prev} aria-label="previous track"><PrevIcon /></button>
        <motion.button className="playbtn" whileTap={{ scale: 0.93 }} onClick={p.toggle} aria-label={p.playing ? 'pause' : 'play'}>
          {p.playing ? <PauseIcon /> : <PlayIcon />}
        </motion.button>
        <button className="ib" onClick={p.next} aria-label="next track"><NextIcon /></button>
        <button className={`ib${p.repeat !== 'off' ? ' on' : ''}`} onClick={p.cycleRepeat} aria-label={`repeat: ${p.repeat}`}>
          <RepeatIcon />{p.repeat === 'one' && <sup>1</sup>}
        </button>
        {showVolume && (
          <label className="vol">
            <VolumeIcon /><span className="sr-only">volume</span>
            <input id="volume" className="thin-range" type="range" min={0} max={1} step={0.01} value={p.volume}
              style={{ ['--v' as string]: `${p.volume * 100}%` }} onChange={e => p.setVolume(+e.target.value)} />
          </label>
        )}
      </div>

      {p.notice && <p className="notice" role="status">{p.notice}</p>}
      {!spotify.connected && (
        <p className="soft">
          No sound yet. <button className="tlink" onClick={spotify.connect}>Connect Spotify</button> to play your own music.
        </p>
      )}
    </div>
  );
}

export function CDPlayer({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div>
      <CDArt size={size} />
      <div className="mt-8"><NowPlaying size={size} showVolume={size === 'lg'} /></div>
    </div>
  );
}
