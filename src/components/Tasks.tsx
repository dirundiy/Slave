import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '../types';
import { useApp } from '../state/AppContext';
import { EASE, uid } from '../lib/util';
import { CheckIcon } from './Icons';

export function TaskItem({ task }: { task: Task }) {
  const { setTasks } = useApp();
  const toggle = () => setTasks(ts => ts.map(x => (x.id === task.id ? { ...x, done: !x.done } : x)));
  return (
    <motion.li
      layout
      className={`task${task.done ? ' done' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <button className="chk" onClick={toggle} role="checkbox" aria-checked={task.done} aria-label={task.text}><CheckIcon /></button>
      <span className="ttext" onClick={toggle}>{task.text}</span>
      <button className="tdel" onClick={() => setTasks(ts => ts.filter(x => x.id !== task.id))} aria-label={`delete ${task.text}`}>×</button>
    </motion.li>
  );
}

export function AddTask({ day, id, placeholder = 'add a task' }: { day: string; id: string; placeholder?: string }) {
  const { setTasks } = useApp();
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const text = v.trim();
        if (!text) return;
        setTasks(ts => [...ts, { id: uid(), text, done: false, day }]);
        setV('');
      }}
    >
      <label htmlFor={id} className="sr-only">add a task</label>
      <input id={id} className="add" value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </form>
  );
}

export function TaskList({ day, idPrefix }: { day: string; idPrefix: string }) {
  const { tasks } = useApp();
  const list = tasks.filter(t => t.day === day);
  return (
    <>
      <ul>
        <AnimatePresence initial={false}>{list.map(t => <TaskItem key={t.id} task={t} />)}</AnimatePresence>
      </ul>
      <AddTask day={day} id={`add-${idPrefix}-${day}`} />
    </>
  );
}
