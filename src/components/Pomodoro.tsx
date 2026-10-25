import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TimerMode, TimerSettings } from '../types';
import { useApp } from '../state/AppContext';
import { MODE_LABEL } from '../state/useTimer';
import { chime } from '../lib/sound';
import { EASE, mmss } from '../lib/util';
import { Driver } from './Driver';

function Digits({ value }: { value: string }) {
  return (
    <div className="digits" role="timer" aria-label={value}>
      {value.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={`c${i}`} className="colon" aria-hidden="true">:</span>
        ) : (
          <span key={i} className="dg" aria-hidden="true">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={ch}
                initial={{ y: '-60%', opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '60%', opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      )}
    </div>
  );
}

const STEPS: [keyof TimerSettings, string, number, number, number][] = [
  ['focus', 'focus', 5, 90, 5],
  ['short', 'short break', 1, 30, 1],
  ['long', 'long break', 5, 45, 5],
  ['every', 'sessions before a long break', 2, 8, 1]
];

function Settings() {
  const { settings, setSettings, showFinish } = useApp();
  const step = (k: keyof TimerSettings, d: number, min: number, max: number) =>
    setSettings(s => ({ ...s, [k]: Math.max(min, Math.min(max, (s[k] as number) + d)) }));
  return (
    <div className="settings">
      {STEPS.map(([k, label, min, max, d]) => (
        <div key={k} className="stepper">
          <span>{label}</span>
          <span className="stepper-ctl">
            <button onClick={() => step(k, -d, min, max)} aria-label={`less ${label}`}>−</button>
            <span className="v">{settings[k] as number}</span>
            <button onClick={() => step(k, d, min, max)} aria-label={`more ${label}`}>+</button>
          </span>
        </div>
      ))}
      <div className="stepper">
        <span>chime at the end</span>
        <span className="stepper-ctl">
          <button className="tlink" onClick={() => setSettings(s => ({ ...s, chime: !s.chime }))}>{settings.chime ? 'on' : 'off'}</button>
          <button className="tlink" onClick={chime}>listen</button>
        </span>
      </div>
      <div className="stepper">
        <span>the checkered flag</span>
        <button className="tlink" onClick={showFinish}>preview</button>
      </div>
    </div>
  );
}

const PHRASE: Record<TimerMode, [string, string]> = {
  focus: ['ready when you are', 'stay with it'],
  short: ['take a breath', 'breathe'],
  long: ['go get some water', 'rest a while']
};

export function Timer() {
  const { timer: tm, settings } = useApp();
  const [open, setOpen] = useState(false);
  const filled = tm.mode === 'long' ? settings.every : tm.cycle;

  return (
    <div className={`timer${tm.running ? ' running' : ''}`}>
      <div className="modes" role="tablist" aria-label="timer mode">
        {(['focus', 'short', 'long'] as TimerMode[]).map(m => (
          <button key={m} role="tab" aria-selected={tm.mode === m} className={`mode${tm.mode === m ? ' on' : ''}`} onClick={() => tm.switchMode(m)}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="digits-row">
        <Digits value={mmss(tm.remaining)} />
        <Driver />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${tm.mode}-${tm.running}`}
          className="phrase"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {PHRASE[tm.mode][tm.running ? 1 : 0]}
        </motion.p>
      </AnimatePresence>

      <div className="thin-progress"><div style={{ transform: `scaleX(${tm.frac})` }} /></div>

      <div className="actions">
        <button className="startbtn" onClick={tm.toggle}>{tm.running ? 'pause' : tm.remaining < tm.total ? 'resume' : 'start'}</button>
        <button className="tlink" onClick={tm.reset}>reset</button>
      </div>

      <div className="cycle" aria-label={`${filled} of ${settings.every} sessions done`}>
        {Array.from({ length: settings.every }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}
      </div>

      <button className="tlink small settings-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? 'close settings' : 'settings'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="settings-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Settings />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
