import type { ChatMessage, Deck, Quiz, TutorFile, TutorMsg } from '../types';

/* Calls to the study server (server/index.ts), reached through Vite's /api proxy. */

async function errorFrom(res: Response) {
  const body = await res.json().catch(() => null);
  return new Error(body?.error ?? `The study server answered ${res.status}.`);
}

export type TutorStatus = 'ready' | 'missing-key' | 'offline';

export async function tutorStatus(): Promise<TutorStatus> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) return 'offline';
    return (await res.json()).ready ? 'ready' : 'missing-key';
  } catch {
    return 'offline';
  }
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('Couldn’t read that file.'));
    r.readAsDataURL(file);
  });

export async function uploadFile(file: File): Promise<TutorFile> {
  if (file.size > 20 * 1024 * 1024) throw new Error('That file is over 20 MB. Try a smaller one.');
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name || 'pasted-image.png', type: file.type, data: await toBase64(file) })
  });
  if (!res.ok) throw await errorFrom(res);
  const { file: stored } = await res.json();
  return { id: stored.id, name: stored.name, kind: stored.kind, size: stored.size };
}

export type TutorEvent =
  | { type: 'text'; delta: string }
  | { type: 'quiz'; quiz: Quiz }
  | { type: 'flashcards'; deck: Deck }
  | { type: 'notice'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/** Streams the tutor's reply to the conversation so far. */
export async function streamTutor(history: TutorMsg[], onEvent: (e: TutorEvent) => void, signal: AbortSignal) {
  const messages = history.map(m => ({
    role: m.role,
    text: m.text,
    fileIds: m.files?.map(f => f.id),
    quizTitle: m.quiz?.title,
    cardsTitle: m.deck?.title
  }));
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      for (const line of chunk.split('\n')) if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)));
    }
  }
}

/* ---------- people chat ---------- */

export const HALL = 'hall';
export const dmRoom = (a: string, b: string) => `dm:${[a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join('|')}`;

export async function fetchRoom(room: string, name: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chat/messages?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}`);
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).messages;
}

export async function fetchThreads(name: string): Promise<{ room: string; with: string; last: ChatMessage }[]> {
  const res = await fetch(`/api/chat/threads?name=${encodeURIComponent(name)}`);
  if (!res.ok) return [];
  return (await res.json()).threads;
}

export async function postMessage(from: string, room: string, text: string): Promise<ChatMessage> {
  const res = await fetch('/api/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, room, text })
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).message;
}
