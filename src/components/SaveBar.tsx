import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Session, Task, TimerSettings } from '../types';
import { useApp } from '../state/AppContext';
import { dayKey } from '../lib/util';

interface Backup { app: 'slave'; version: 1; savedAt: string; tasks: Task[]; history: Session[]; settings: TimerSettings }

const time = (d: Date) => d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

/* Everything already saves to this browser on every change.
   This line shows when, and lets you keep a backup file or restore one. */
export function SaveBar() {
  const { tasks, history, settings, setTasks, setHistory, setSettings } = useApp();
  const [savedAt, setSavedAt] = useState(() => new Date());
  const [msg, setMsg] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSavedAt(new Date());
  }, [tasks, history, settings]);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [msg]);

  const download = () => {
    const backup: Backup = { app: 'slave', version: 1, savedAt: new Date().toISOString(), tasks, history, settings };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `slave-planner-${dayKey()}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('Backup saved to your downloads.');
  };

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Partial<Backup>;
      if (data.app !== 'slave' || !Array.isArray(data.tasks) || !Array.isArray(data.history)) throw new Error();
      setTasks(data.tasks);
      setHistory(data.history);
      if (data.settings) setSettings(data.settings);
      setMsg(`Restored ${data.tasks.length} tasks and ${data.history.length} sessions.`);
    } catch {
      setMsg('That file isn’t a slave. backup. Pick a file saved with “save backup”.');
    }
  };

  return (
    <div className="savebar" role="status">
      <span className="faint">{msg ?? `saved automatically · ${time(savedAt)}`}</span>
      <button className="tlink small" onClick={download}>save backup</button>
      <label className="tlink small restore">
        restore
        <input type="file" accept="application/json,.json" className="sr-only" onChange={restore} />
      </label>
    </div>
  );
}
