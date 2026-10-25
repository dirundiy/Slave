import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { FileRef, Flashcard, Message, QuizQuestion } from '../types';
import { useApp } from '../state/AppContext';
import { ACTIONS, type ActionId } from '../data/tutor';
import { EASE, kb, uid } from '../lib/util';
import { SendIcon } from './Icons';

// Image thumbnails for files picked this visit (object URLs don't survive a reload).
const previews: Record<string, string> = {};

const inline = (s: string): ReactNode[] => s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

function Rich({ text }: { text: string }) {
  return (
    <div className="rich">
      {text.split(/\n\n+/).map((block, i) => {
        const lines = block.split('\n');
        if (lines.every(l => l.startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}

const extOf = (f: FileRef) => /\.([a-z0-9]+)$/i.exec(f.name)?.[1].slice(0, 4).toUpperCase() ?? (f.type.startsWith('image/') ? 'IMG' : 'FILE');

function FileSlip({ f, onRemove }: { f: FileRef; onRemove?: () => void }) {
  const url = previews[f.id];
  return (
    <span className="slip" title={f.name}>
      {url ? <img src={url} alt="" /> : <span className="ext">{extOf(f)}</span>}
      <span className="nm">{f.name}</span>
      <span className="sz">{kb(f.size)}</span>
      {onRemove && <button className="x" onClick={onRemove} aria-label={`remove ${f.name}`}>×</button>}
    </span>
  );
}

function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const move = (d: number) => {
    setFlip(false);
    window.setTimeout(() => setI(x => (x + d + cards.length) % cards.length), flip ? 250 : 0);
  };
  return (
    <div className="fc">
      <button className="fc-card" onClick={() => setFlip(f => !f)} aria-label={flip ? 'show question' : 'show answer'}>
        <div className={`fc-inner${flip ? ' flipped' : ''}`}>
          <div className="fc-face"><span className="lbl">question {i + 1}</span><p>{cards[i].q}</p></div>
          <div className="fc-face back"><span className="lbl">answer</span><p>{cards[i].a}</p></div>
        </div>
      </button>
      <div className="fc-nav">
        <button onClick={() => move(-1)}>prev</button>
        <span>{i + 1} / {cards.length}</span>
        <button onClick={() => move(1)}>next</button>
      </div>
    </div>
  );
}

function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const score = questions.filter((q, i) => picked[i] === q.a).length;
  return (
    <div className="quiz">
      {questions.map((q, i) => (
        <div key={i} className="q">
          <h5>{i + 1}. {q.q}</h5>
          {q.opts.map((o, j) => {
            const done = picked[i] !== undefined;
            const cls = done ? (j === q.a ? ' right' : j === picked[i] ? ' wrong' : '') : '';
            return (
              <button key={j} className={`opt${cls}`} disabled={done} onClick={() => setPicked(p => ({ ...p, [i]: j }))}>
                <b>{'abcd'[j]}.</b>{o}
              </button>
            );
          })}
          {picked[i] !== undefined && <p className="why">{q.why}</p>}
        </div>
      ))}
      {Object.keys(picked).length === questions.length && <p className="hint">score {score} / {questions.length}</p>}
    </div>
  );
}

function MessageView({ m }: { m: Message }) {
  return (
    <motion.div className={`msg msg-${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <div className="msg-who">{m.role === 'user' ? 'you' : 'tutor'}{(m.demo || m.sample) && <span className="faint">{m.demo ? 'demo reply' : 'sample'}</span>}</div>
      {m.files && m.files.length > 0 && <div className="slips">{m.files.map(f => <FileSlip key={f.id} f={f} />)}</div>}
      {m.text && <Rich text={m.text} />}
      {m.kind === 'flashcards' && m.cards && <Flashcards cards={m.cards} />}
      {m.kind === 'quiz' && m.questions && <Quiz questions={m.questions} />}
    </motion.div>
  );
}

export function Chat({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const app = useApp();
  const chat = app.chats.find(c => c.id === app.chatId) ?? app.chats[0];
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<FileRef[]>([]);
  const [drag, setDrag] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat?.messages.length, app.pending]);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, el.scrollHeight)}px`;
  }, [draft]);

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []).slice(0, 6).map(file => {
      const id = uid();
      if (file.type.startsWith('image/')) previews[id] = URL.createObjectURL(file);
      return { id, name: file.name || 'pasted-image.png', type: file.type, size: file.size };
    });
    setFiles(f => [...f, ...picked].slice(0, 8));
  };

  const send = (action?: ActionId) => {
    if (app.pending || !chat) return;
    const text = draft.trim();
    if (!text && !files.length && !action) return;
    app.sendChat(chat.id, { text, files, action });
    setDraft('');
    setFiles([]);
  };

  const inputId = `chat-input-${size}`;
  const fileId = `chat-file-${size}`;

  return (
    <div className={`chat chat-${size}`}>
      <div className="chat-scroll" ref={scroller}>
        {chat?.messages.length === 0 && (
          <div className="chat-empty">
            <p className="script">ask me anything</p>
            <p className="hint">Add a worksheet photo, a PDF or your notes, then ask about it.</p>
          </div>
        )}
        {chat?.messages.map(m => <MessageView key={m.id} m={m} />)}
        {app.pending && (
          <div className="msg msg-ai">
            <div className="msg-who">tutor</div>
            <div className="typing" aria-label="tutor is typing"><i /><i /><i /></div>
          </div>
        )}
      </div>

      <div
        className={`composer${drag ? ' drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
      >
        {files.length > 0 && <div className="slips">{files.map(f => <FileSlip key={f.id} f={f} onRemove={() => setFiles(fs => fs.filter(x => x.id !== f.id))} />)}</div>}
        <label htmlFor={inputId} className="sr-only">message the tutor</label>
        <textarea
          id={inputId}
          ref={ta}
          rows={1}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
          placeholder="ask about a worksheet, a chapter, a formula"
        />
        <div className="composer-row">
          <label className="attach" htmlFor={fileId}>
            attach
            <input id={fileId} className="sr-only" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.md,.rtf" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <div className="qa" role="group" aria-label="quick study actions">
            {ACTIONS.map(a => <button key={a.id} onClick={() => send(a.id)} disabled={app.pending}>{a.label}</button>)}
          </div>
          <button className="send" onClick={() => send()} aria-label="send" disabled={app.pending}><SendIcon /></button>
        </div>
      </div>
    </div>
  );
}
