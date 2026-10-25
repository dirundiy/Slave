import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../state/AppContext';
import { usePersist } from '../lib/storage';
import { EASE, addDays, dayKey, DOW, monthShort, weekStart } from '../lib/util';
import { TaskList } from './Tasks';
import { CheckIcon } from './Icons';

/* An endless planner: step through weeks or months in either direction, forever.
   Week view is for writing tasks; month view is for seeing what's coming. */

type View = 'week' | 'month';

const monthLong = (d: Date) => d.toLocaleString('en', { month: 'long' }).toLowerCase();
const weeksBetween = (a: Date, b: Date) => Math.round((weekStart(a).getTime() - weekStart(b).getTime()) / (7 * 864e5));

function weekLabel(ws: Date) {
  const n = weeksBetween(ws, new Date());
  if (n === 0) return 'this week';
  if (n === 1) return 'next week';
  if (n === -1) return 'last week';
  return n > 0 ? `in ${n} weeks` : `${-n} weeks ago`;
}

function MonthCell({ date, inMonth, onOpen }: { date: Date; inMonth: boolean; onOpen: () => void }) {
  const { tasks, setTasks } = useApp();
  const k = dayKey(date);
  const list = tasks.filter(t => t.day === k);
  const shown = list.slice(0, 3);
  const toggle = (id: string) => setTasks(ts => ts.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  return (
    <div className={`mcell${inMonth ? '' : ' out'}${k === dayKey() ? ' today' : ''}`}>
      <button className="mnum" onClick={onOpen} aria-label={`open the week of ${date.toDateString()}`}>{date.getDate()}</button>
      <ul>
        {shown.map(t => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <button className="chk" onClick={() => toggle(t.id)} role="checkbox" aria-checked={t.done} aria-label={t.text}><CheckIcon /></button>
            <span className="mtext" onClick={onOpen}>{t.text}</span>
          </li>
        ))}
      </ul>
      {list.length > shown.length && <button className="more" onClick={onOpen}>+{list.length - shown.length} more</button>}
      <button className="mfill" onClick={onOpen} aria-hidden="true" tabIndex={-1} />
    </div>
  );
}

export function Calendar() {
  const [view, setView] = usePersist<View>('planner.view', 'week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [dir, setDir] = useState(0);

  const ws = weekStart(anchor);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = weekStart(first);
  const today = dayKey();

  const step = (n: number) => {
    setDir(n);
    setAnchor(a => (view === 'week' ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1)));
  };
  const goToday = () => {
    setDir(0);
    setAnchor(new Date());
  };
  const openWeek = (d: Date) => {
    setDir(0);
    setAnchor(d);
    setView('week');
  };

  const end = addDays(ws, 6);
  const sameYear = ws.getFullYear() === new Date().getFullYear() && end.getFullYear() === ws.getFullYear();
  const title = view === 'week' ? weekLabel(ws) : `${monthLong(first)}${first.getFullYear() === new Date().getFullYear() ? '' : ` ${first.getFullYear()}`}`;
  const range =
    view === 'week'
      ? `${ws.getDate()} ${monthShort(ws)} – ${end.getDate()} ${monthShort(end)}${sameYear ? '' : ` ${end.getFullYear()}`}`
      : '';
  const atToday = view === 'week' ? weeksBetween(ws, new Date()) === 0 : first.getMonth() === new Date().getMonth() && first.getFullYear() === new Date().getFullYear();
  const periodKey = view === 'week' ? `w${dayKey(ws)}` : `m${first.getFullYear()}-${first.getMonth()}`;

  // Six rows always fit any month.
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const rows = monthDays[35].getMonth() === first.getMonth() ? 6 : 5;

  return (
    <div className="calendar">
      <div className="cal-bar">
        <div className="cal-title">
          <h2>{title}</h2>
          {range && <span className="faint">{range}</span>}
        </div>
        <div className="cal-nav">
          <button className="arrow" onClick={() => step(-1)} aria-label={view === 'week' ? 'previous week' : 'previous month'}>‹</button>
          <button className="tlink small" onClick={goToday} disabled={atToday}>today</button>
          <button className="arrow" onClick={() => step(1)} aria-label={view === 'week' ? 'next week' : 'next month'}>›</button>
          <span className="cal-sep" />
          {(['week', 'month'] as View[]).map(v => (
            <button key={v} className={`mode${view === v ? ' on' : ''}`} onClick={() => { setDir(0); setView(v); }}>{v}</button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={periodKey}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          {view === 'week' ? (
            <div className="scroll-x">
              <div className="week-board">
                {DOW.map((label, i) => {
                  const d = addDays(ws, i);
                  const k = dayKey(d);
                  return (
                    <div key={k} className={`day${k === today ? ' today' : ''}`}>
                      <h4><span className="d1">{label}</span><span className="d2">{d.getDate()} {monthShort(d)}</span></h4>
                      <TaskList day={k} idPrefix="planner" />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="scroll-x">
              <div className="month">
                {DOW.map(d => <div key={d} className="mhead">{d}</div>)}
                {monthDays.slice(0, rows * 7).map(d => (
                  <MonthCell key={dayKey(d)} date={d} inMonth={d.getMonth() === first.getMonth()} onOpen={() => openWeek(d)} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
