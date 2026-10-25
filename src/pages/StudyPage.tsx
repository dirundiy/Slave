import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { TutorChat, TutorFile, TutorMsg } from '../types';
import { usePersist } from '../lib/storage';
import { EASE, kb, uid } from '../lib/util';
import { streamTutor, tutorStatus, uploadFile, type TutorStatus } from '../lib/api';
import { PageTitle } from '../components/Label';
import { Markdown } from '../components/Markdown';
import { FlashcardDeck, QuizCard } from '../components/StudyCards';

const QUICK = ['make me a practice quiz', 'make flashcards', 'explain this simply', 'summarize the key points'];

// Thumbnails for images picked during this visit.
const previews: Record<string, string> = {};

interface Pending { key: string; name: string; status: 'uploading' | 'ready' | 'error'; file?: TutorFile; error?: string }

const extOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1].slice(0, 4).toUpperCase() ?? 'FILE';

function FileChip({ name, size, id, status, error, onRemove }: { name: string; size?: number; id?: string; status?: Pending['status']; error?: string; onRemove?: () => void }) {
  const thumb = id ? previews[id] : undefined;
  return (
    <span className={`chip${status === 'error' ? ' bad' : ''}`} title={error ?? name}>
      {thumb ? <img src={thumb} alt="" /> : <span className="ext">{extOf(name)}</span>}
      <span className="nm">{name}</span>
      <span className="faint">{status === 'uploading' ? 'uploading' : status === 'error' ? 'failed' : size ? kb(size) : ''}</span>
      {onRemove && <button className="x" onClick={onRemove} aria-label={`remove ${name}`}>×</button>}
    </span>
  );
}

function StatusBanner({ status }: { status: TutorStatus | null }) {
  if (status === 'ready' || status === null) return null;
  return (
    <div className="banner-note" role="status">
      {status === 'offline' ? (
        <>The study server isn’t running. In the terminal, stop the site and start it again with <code>npm run dev</code>.</>
      ) : (
        <>The tutor needs a Claude API key. Copy <code>.env.example</code> to <code>.env.local</code>, paste your key after <code>ANTHROPIC_API_KEY=</code>, then restart <code>npm run dev</code>.</>
      )}
    </div>
  );
}

export function StudyPage() {
  const [chats, setChats] = usePersist<TutorChat[]>('tutor.chats', []);
  const [activeId, setActiveId] = usePersist<string>('tutor.active', '');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const chat = chats.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    void tutorStatus().then(setStatus);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat?.messages.length, chat?.messages[chat.messages.length - 1]?.text.length]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [draft]);

  const patchMsg = (chatId: string, msgId: string, fn: (m: TutorMsg) => TutorMsg) =>
    setChats(cs => cs.map(c => (c.id === chatId ? { ...c, messages: c.messages.map(m => (m.id === msgId ? fn(m) : m)) } : c)));

  const addFiles = (list: FileList | null) => {
    for (const file of Array.from(list ?? []).slice(0, 8)) {
      const key = uid();
      setPending(p => [...p, { key, name: file.name || 'pasted-image.png', status: 'uploading' }]);
      uploadFile(file)
        .then(stored => {
          if (file.type.startsWith('image/')) previews[stored.id] = URL.createObjectURL(file);
          setPending(p => p.map(x => (x.key === key ? { ...x, status: 'ready', file: stored } : x)));
        })
        .catch(e => setPending(p => p.map(x => (x.key === key ? { ...x, status: 'error', error: (e as Error).message } : x))));
    }
  };

  const uploading = pending.some(p => p.status === 'uploading');

  const send = async (text: string) => {
    const files = pending.filter(p => p.status === 'ready').map(p => p.file!);
    if (busy || uploading || (!text.trim() && !files.length)) return;

    let target = chat;
    if (!target) {
      target = { id: uid(), title: 'new conversation', updated: Date.now(), messages: [] };
      setChats(cs => [target!, ...cs]);
      setActiveId(target.id);
    }
    const chatId = target.id;
    const userMsg: TutorMsg = { id: uid(), role: 'user', text: text.trim(), files: files.length ? files : undefined };
    const aiMsg: TutorMsg = { id: uid(), role: 'ai', text: '', pending: true };
    const history = [...target.messages.filter(m => !m.error), userMsg];
    const title = target.title === 'new conversation' ? (text.trim() || files[0]?.name || 'new conversation').slice(0, 48) : target.title;

    setChats(cs => cs.map(c => (c.id === chatId ? { ...c, title, updated: Date.now(), messages: [...c.messages, userMsg, aiMsg] } : c)));
    setDraft('');
    setPending([]);
    setBusy(true);

    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      await streamTutor(
        history,
        e => {
          if (e.type === 'text') patchMsg(chatId, aiMsg.id, m => ({ ...m, text: m.text + e.delta }));
          else if (e.type === 'quiz') patchMsg(chatId, aiMsg.id, m => ({ ...m, quiz: e.quiz }));
          else if (e.type === 'flashcards') patchMsg(chatId, aiMsg.id, m => ({ ...m, deck: e.deck }));
          else if (e.type === 'notice') patchMsg(chatId, aiMsg.id, m => ({ ...m, notice: e.message }));
          else if (e.type === 'error') patchMsg(chatId, aiMsg.id, m => ({ ...m, error: e.message }));
        },
        ctrl.signal
      );
    } catch (e) {
      if (!ctrl.signal.aborted) patchMsg(chatId, aiMsg.id, m => ({ ...m, error: (e as Error).message }));
      void tutorStatus().then(setStatus);
    } finally {
      patchMsg(chatId, aiMsg.id, m => ({ ...m, pending: false, text: m.text || (ctrl.signal.aborted ? '(stopped)' : m.text) }));
      setBusy(false);
      abort.current = null;
    }
  };

  const newChat = () => {
    setActiveId('');
    setDraft('');
    input.current?.focus();
  };
  const sorted = [...chats].sort((a, b) => b.updated - a.updated);

  return (
    <>
      <PageTitle>study</PageTitle>
      <div className="study">
        <aside className="study-side">
          <button className="tlink" onClick={newChat}>new conversation</button>
          <ul className="convos">
            {sorted.map(c => (
              <li key={c.id} className={c.id === activeId ? 'on' : ''}>
                <button className="ct" onClick={() => setActiveId(c.id)}>{c.title}</button>
                {armed === c.id ? (
                  <button className="tlink small" onClick={() => { setChats(cs => cs.filter(x => x.id !== c.id)); if (activeId === c.id) setActiveId(''); setArmed(null); }}>delete?</button>
                ) : (
                  <button className="tdel" onClick={() => setArmed(c.id)} aria-label={`delete ${c.title}`}>×</button>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <section className="study-main">
          <StatusBanner status={status} />
          <div className="thread" ref={scroller}>
            {!chat || chat.messages.length === 0 ? (
              <div className="empty">
                <p className="script">what are we studying?</p>
                <p className="hint">Attach a worksheet, notes, a PDF or a Word doc, then ask about it, or ask for a practice quiz or flashcards.</p>
              </div>
            ) : (
              chat.messages.map(m => (
                <motion.div key={m.id} className={`turn turn-${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                  <div className="who">{m.role === 'user' ? 'you' : 'tutor'}</div>
                  {m.files && <div className="chips">{m.files.map(f => <FileChip key={f.id} id={f.id} name={f.name} size={f.size} />)}</div>}
                  {m.role === 'user' ? m.text && <p className="said">{m.text}</p> : m.text && <Markdown text={m.text} />}
                  {m.quiz && <QuizCard quiz={m.quiz} />}
                  {m.deck && <FlashcardDeck deck={m.deck} />}
                  {m.pending && !m.text && !m.quiz && !m.deck && <div className="typing" aria-label="the tutor is thinking"><i /><i /><i /></div>}
                  {m.notice && <p className="hint">{m.notice}</p>}
                  {m.error && <p className="err">{m.error}</p>}
                </motion.div>
              ))
            )}
          </div>

          <div
            className={`composer${drag ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          >
            {pending.length > 0 && (
              <div className="chips">
                {pending.map(p => (
                  <FileChip key={p.key} id={p.file?.id} name={p.name} size={p.file?.size} status={p.status} error={p.error}
                    onRemove={() => setPending(list => list.filter(x => x.key !== p.key))} />
                ))}
              </div>
            )}
            <label htmlFor="tutor-input" className="sr-only">ask the tutor</label>
            <textarea
              id="tutor-input"
              ref={input}
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }}
              onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
              placeholder="ask about a worksheet, a chapter, a formula"
            />
            <div className="composer-row">
              <label className="tlink small attach" htmlFor="tutor-file">
                attach files
                <input id="tutor-file" className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.docx,.txt,.md,.csv"
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
              </label>
              <div className="quick">
                {QUICK.map(q => <button key={q} onClick={() => void send(q)} disabled={busy || uploading}>{q}</button>)}
              </div>
              {busy ? (
                <button className="startbtn small" onClick={() => abort.current?.abort()}>stop</button>
              ) : (
                <button className="startbtn small" onClick={() => void send(draft)} disabled={uploading}>send</button>
              )}
            </div>
            {pending.some(p => p.status === 'error') && (
              <p className="err">{pending.find(p => p.status === 'error')?.error}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
