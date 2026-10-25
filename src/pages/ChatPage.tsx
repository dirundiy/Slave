import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../types';
import { usePersist } from '../lib/storage';
import { EASE } from '../lib/util';
import { dmRoom, fetchRoom, fetchThreads, HALL, postMessage } from '../lib/api';
import { PageTitle } from '../components/Label';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
const lower = (s: string) => s.trim().toLowerCase();

function JoinForm({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form className="join" onSubmit={e => { e.preventDefault(); if (name.trim()) onJoin(name.trim().slice(0, 24)); }}>
      <p className="script">who’s studying?</p>
      <label htmlFor="chat-name" className="hint">Pick the name other people will see.</label>
      <input id="chat-name" className="add big" value={name} onChange={e => setName(e.target.value)} placeholder="your name" autoComplete="nickname" maxLength={24} />
      <button className="startbtn" type="submit">join</button>
    </form>
  );
}

export function ChatPage() {
  const [me, setMe] = usePersist<string>('chat.name', '');
  const [room, setRoom] = useState(HALL);
  const [rooms, setRooms] = useState<Record<string, ChatMessage[]>>({});
  const [online, setOnline] = useState<string[]>([]);
  const [threads, setThreads] = useState<{ room: string; with: string }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({}); // lowercase -> display name
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [conn, setConn] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef(room);
  roomRef.current = room;
  const list = useRef<HTMLDivElement>(null);

  const remember = (...display: string[]) => setNames(n => {
    const next = { ...n };
    display.forEach(d => (next[lower(d)] = d));
    return next;
  });

  // Live stream: presence and new messages.
  useEffect(() => {
    if (!me) return;
    setConn('connecting');
    const es = new EventSource(`/api/chat/stream?name=${encodeURIComponent(me)}`);
    es.onopen = () => setConn('live');
    es.onerror = () => setConn(es.readyState === EventSource.CLOSED ? 'offline' : 'connecting');
    es.onmessage = ev => {
      const data = JSON.parse(ev.data);
      if (data.type === 'hello' || data.type === 'presence') {
        setOnline(data.online);
        remember(...data.online);
      } else if (data.type === 'message') {
        const m = data.message as ChatMessage;
        remember(m.from);
        setRooms(r => (r[m.room] ? { ...r, [m.room]: r[m.room].some(x => x.id === m.id) ? r[m.room] : [...r[m.room], m] } : r));
        if (m.room !== roomRef.current) setUnread(u => new Set(u).add(m.room));
        if (m.room.startsWith('dm:')) void fetchThreads(me).then(setThreads);
      }
    };
    void fetchThreads(me).then(setThreads);
    return () => es.close();
  }, [me]);

  // Load a conversation's history when it is opened.
  useEffect(() => {
    if (!me) return;
    setUnread(u => {
      const next = new Set(u);
      next.delete(room);
      return next;
    });
    fetchRoom(room, me)
      .then(msgs => {
        remember(...msgs.map(m => m.from));
        setRooms(r => ({ ...r, [room]: msgs }));
      })
      .catch(e => setError((e as Error).message));
  }, [room, me]);

  const messages = rooms[room] ?? [];
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, room]);

  const display = (k: string) => names[k] ?? k;
  const otherIn = (r: string) => r.slice(3).split('|').find(k => k !== lower(me)) ?? lower(me);
  const roomTitle = room === HALL ? 'study hall' : display(otherIn(room));

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setError(null);
    try {
      const m = await postMessage(me, room, text);
      setRooms(r => ({ ...r, [room]: (r[room] ?? []).some(x => x.id === m.id) ? r[room] : [...(r[room] ?? []), m] }));
    } catch (err) {
      setError((err as Error).message);
      setDraft(text);
    }
  };

  if (!me) {
    return (
      <>
        <PageTitle>chat</PageTitle>
        <JoinForm onJoin={setMe} />
      </>
    );
  }

  const people = online.filter(n => lower(n) !== lower(me));
  const dmKeys = new Set(threads.map(t => t.room));

  return (
    <>
      <PageTitle>chat</PageTitle>
      <div className="study">
        <aside className="study-side">
          <p className="faint">
            you’re <span className="me">{me}</span> · <button className="tlink small" onClick={() => { setMe(''); setRoom(HALL); }}>change</button>
          </p>
          <ul className="convos">
            <li className={room === HALL ? 'on' : ''}>
              <button className="ct" onClick={() => setRoom(HALL)}>study hall</button>
              {unread.has(HALL) && <span className="dot" aria-label="new messages" />}
            </li>
          </ul>

          <p className="side-h">messages</p>
          <ul className="convos">
            {threads.length === 0 && <li className="hint">No direct messages yet.</li>}
            {threads.map(t => (
              <li key={t.room} className={room === t.room ? 'on' : ''}>
                <button className="ct" onClick={() => setRoom(t.room)}>{display(t.with)}</button>
                {unread.has(t.room) && <span className="dot" aria-label="new messages" />}
              </li>
            ))}
          </ul>

          <p className="side-h">online now</p>
          <ul className="convos">
            {people.length === 0 && <li className="hint">Nobody else is here right now.</li>}
            {people.map(n => (
              <li key={n}>
                <button className="ct" onClick={() => setRoom(dmRoom(me, n))} title={`message ${n}`}>
                  <span className="live-dot" />{n}
                </button>
                {!dmKeys.has(dmRoom(me, n)) && <span className="faint">say hi</span>}
              </li>
            ))}
          </ul>
        </aside>

        <section className="study-main">
          <div className="room-head">
            <h2>{roomTitle}</h2>
            <span className="faint">{conn === 'live' ? (room === HALL ? `${online.length} online` : 'direct message') : conn === 'connecting' ? 'connecting…' : 'offline — is the server running?'}</span>
          </div>
          <div className="thread" ref={list}>
            {messages.length === 0 ? (
              <div className="empty">
                <p className="script">{room === HALL ? 'say hello' : `start a conversation with ${roomTitle}`}</p>
                <p className="hint">{room === HALL ? 'Everyone who opens chat can read the study hall.' : 'Only the two of you can see these messages.'}</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = lower(m.from) === lower(me);
                const grouped = i > 0 && messages[i - 1].from === m.from && Date.parse(m.at) - Date.parse(messages[i - 1].at) < 5 * 60e3;
                return (
                  <motion.div key={m.id} className={`msg${mine ? ' mine' : ''}${grouped ? ' grouped' : ''}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                    {!grouped && (
                      <div className="who">
                        {mine ? 'you' : (
                          <button className="name-link" onClick={() => room === HALL && setRoom(dmRoom(me, m.from))} title={room === HALL ? `message ${m.from}` : undefined}>{m.from}</button>
                        )}
                        <span className="faint">{time(m.at)}</span>
                      </div>
                    )}
                    <p className="said">{m.text}</p>
                  </motion.div>
                );
              })
            )}
          </div>
          <form className="composer" onSubmit={send}>
            <label htmlFor="chat-input" className="sr-only">message {roomTitle}</label>
            <div className="composer-row">
              <input id="chat-input" className="add" value={draft} onChange={e => setDraft(e.target.value)} placeholder={`message ${roomTitle}`} autoComplete="off" maxLength={2000} />
              <button className="startbtn small" type="submit">send</button>
            </div>
            {error && <p className="err">{error}</p>}
          </form>
        </section>
      </div>
    </>
  );
}
