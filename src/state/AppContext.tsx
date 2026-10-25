import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Session, Task, TimerSettings } from '../types';
import { usePersist } from '../lib/storage';
import { addDays, dayKey, DOW, mmss, uid, weekStart } from '../lib/util';
import { MODE_LABEL, useTimer, type Timer } from './useTimer';

export const PAGES = ['home', 'planner'] as const;
export type Page = (typeof PAGES)[number];

type Setter<T> = Dispatch<SetStateAction<T>>;

interface AppState {
  page: Page;
  go(p: Page): void;
  settings: TimerSettings;
  setSettings: Setter<TimerSettings>;
  timer: Timer;
  tasks: Task[];
  setTasks: Setter<Task[]>;
  history: Session[];
  setHistory: Setter<Session[]>;
  grain: boolean;
  setGrain: Setter<boolean>;
  /** True for a few seconds after a break ends, while the car sits at the flag. */
  finishFlag: boolean;
  showFinish(): void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => useContext(Ctx)!;

const pageFromHash = (): Page => {
  const h = window.location.hash.slice(1) as Page;
  return PAGES.includes(h) ? h : 'home';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [settings, setSettings] = usePersist<TimerSettings>('settings', { focus: 25, short: 5, long: 15, every: 4, chime: true, goal: 120 });
  // v2 keys start empty, leaving the old sample data behind.
  const [tasks, setTasks] = usePersist<Task[]>('tasks.v2', []);
  const [history, setHistory] = usePersist<Session[]>('history.v2', []);
  const [grain, setGrain] = usePersist<boolean>('grain', true);

  const [finishFlag, setFinishFlag] = useState(false);
  const finishTimer = useRef<number>();
  const showFinish = useCallback(() => {
    setFinishFlag(true);
    window.clearTimeout(finishTimer.current);
    finishTimer.current = window.setTimeout(() => setFinishFlag(false), 4500);
  }, []);

  // Focus done: log it and the car crosses the line.
  const logSession = useCallback(
    (minutes: number) => {
      const d = new Date();
      setHistory(h => [...h, { id: uid(), at: d.toISOString(), day: dayKey(d), minutes }]);
      showFinish();
    },
    [setHistory, showFinish]
  );

  const timer = useTimer(settings, logSession, showFinish);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = timer.running ? `${mmss(timer.remaining)} · ${MODE_LABEL[timer.mode]} — slave.` : 'slave.';
  }, [timer.running, timer.remaining, timer.mode]);

  const go = (p: Page) => {
    setPage(p);
    window.history.replaceState(null, '', p === 'home' ? '/' : `#${p}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const value: AppState = { page, go, settings, setSettings, timer, tasks, setTasks, history, setHistory, grain, setGrain, finishFlag, showFinish };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStats() {
  const { history } = useApp();
  return useMemo(() => {
    const byDay: Record<string, number> = {};
    history.forEach(h => (byDay[h.day] = (byDay[h.day] ?? 0) + h.minutes));
    const today = dayKey();
    let streak = 0;
    let d = new Date();
    if (!byDay[today]) d = addDays(d, -1);
    while (byDay[dayKey(d)]) {
      streak++;
      d = addDays(d, -1);
    }
    const ws = weekStart();
    const week = DOW.map((label, i) => {
      const date = addDays(ws, i);
      const k = dayKey(date);
      return { k, label, date: date.getDate(), min: byDay[k] ?? 0, today: k === today };
    });
    return {
      today: byDay[today] ?? 0,
      streak,
      week,
      weekTotal: week.reduce((a, b) => a + b.min, 0),
      sample: history.some(h => h.sample)
    };
  }, [history]);
}
