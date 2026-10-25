import { useEffect, useRef, useState } from 'react';
import type { TimerMode, TimerSettings } from '../types';
import { chime, unlockAudio } from '../lib/sound';

export const MODE_LABEL: Record<TimerMode, string> = { focus: 'focus', short: 'short break', long: 'long break' };

export interface Timer {
  mode: TimerMode;
  running: boolean;
  remaining: number;
  total: number;
  cycle: number;
  frac: number;
  toggle(): void;
  reset(): void;
  skip(): void;
  switchMode(m: TimerMode): void;
}

// Counts against a wall-clock end time, so it stays accurate if the tab is throttled.
export function useTimer(settings: TimerSettings, onFocusDone: (minutes: number) => void, onBreakDone: () => void): Timer {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(settings.focus * 60);
  const [cycle, setCycle] = useState(0);
  const endAt = useRef(0);
  const total = settings[mode] * 60;

  const latest = useRef({ mode, settings, cycle, onFocusDone, onBreakDone });
  latest.current = { mode, settings, cycle, onFocusDone, onBreakDone };

  const prevTotal = useRef(total);
  useEffect(() => {
    if (prevTotal.current === total) return;
    prevTotal.current = total;
    if (!running) setRemaining(total);
  }, [total, running]);

  const advance = (logIt: boolean) => {
    const { mode, settings, cycle, onFocusDone, onBreakDone } = latest.current;
    let next: TimerMode = 'focus';
    let c = cycle;
    if (mode === 'focus') {
      if (logIt) onFocusDone(settings.focus);
      c = cycle + 1;
      next = c >= settings.every ? 'long' : 'short';
      if (c >= settings.every) c = 0;
    } else if (logIt) {
      onBreakDone();
    }
    setCycle(c);
    setRunning(false);
    setMode(next);
    setRemaining(settings[next] * 60);
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const r = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        window.clearInterval(id);
        if (latest.current.settings.chime) chime();
        advance(true);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    unlockAudio();
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  return {
    mode, running, remaining, total, cycle,
    frac: 1 - remaining / total,
    toggle: () => (running ? setRunning(false) : start()),
    reset: () => {
      setRunning(false);
      setRemaining(total);
    },
    skip: () => advance(false),
    switchMode: m => {
      setRunning(false);
      setMode(m);
      setRemaining(settings[m] * 60);
    }
  };
}
