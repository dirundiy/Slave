import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Express, Response } from 'express';
import { DATA_DIR } from './util.ts';

/* Messages between people: one shared room ("study hall") plus direct messages.
   Live updates use Server-Sent Events. People pick a display name; there are no
   passwords, so anyone who can reach this server can use any name. */

export interface ChatMessage { id: string; room: string; from: string; text: string; at: string }

export const HALL = 'hall';
const FILE = path.join(DATA_DIR, 'chat.json');
const KEEP = 5000;

let messages: ChatMessage[] = [];
try {
  messages = JSON.parse(readFileSync(FILE, 'utf8'));
} catch {
  messages = [];
}

let saving = Promise.resolve();
const persist = () => {
  saving = saving.then(() => writeFile(FILE, JSON.stringify(messages.slice(-KEEP)))).catch(() => undefined);
};

const key = (name: string) => name.trim().toLowerCase();
export const cleanName = (raw: unknown) =>
  typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 24) : '';

export const dmRoom = (a: string, b: string) => `dm:${[key(a), key(b)].sort().join('|')}`;
const members = (room: string) => (room.startsWith('dm:') ? room.slice(3).split('|') : null);
const canSee = (room: string, name: string) => room === HALL || (members(room)?.includes(key(name)) ?? false);

// Live connections: each open stream and whose it is.
const streams = new Map<Response, string>();

const online = () => [...new Set([...streams.values()])].sort((a, b) => a.localeCompare(b));
const send = (res: Response, event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);
const broadcastPresence = () => {
  const list = online();
  for (const res of streams.keys()) send(res, { type: 'presence', online: list });
};

export function registerChat(app: Express) {
  app.get('/api/chat/stream', (req, res) => {
    const name = cleanName(req.query.name);
    if (!name) return void res.status(400).json({ error: 'Pick a name first.' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    streams.set(res, name);
    send(res, { type: 'hello', online: online() });
    broadcastPresence();
    const beat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
    res.on('close', () => {
      clearInterval(beat);
      streams.delete(res);
      broadcastPresence();
    });
  });

  app.get('/api/chat/messages', (req, res) => {
    const name = cleanName(req.query.name);
    const room = typeof req.query.room === 'string' ? req.query.room : HALL;
    if (!name || !canSee(room, name)) return void res.status(403).json({ error: 'You can’t open that conversation.' });
    res.json({ messages: messages.filter(m => m.room === room).slice(-200) });
  });

  // Direct-message threads this person is part of, newest first.
  app.get('/api/chat/threads', (req, res) => {
    const name = cleanName(req.query.name);
    if (!name) return void res.json({ threads: [] });
    const last = new Map<string, ChatMessage>();
    for (const m of messages) if (m.room.startsWith('dm:') && canSee(m.room, name)) last.set(m.room, m);
    const threads = [...last.values()]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map(m => ({ room: m.room, with: members(m.room)!.find(k => k !== key(name)) ?? key(name), last: m }));
    res.json({ threads });
  });

  app.post('/api/chat/messages', (req, res) => {
    const from = cleanName(req.body?.from);
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 2000) : '';
    let room = typeof req.body?.room === 'string' ? req.body.room : HALL;
    const to = cleanName(req.body?.to);
    if (to) room = dmRoom(from, to);
    if (!from || !text) return void res.status(400).json({ error: 'Write something first.' });
    if (!canSee(room, from)) return void res.status(403).json({ error: 'You can’t post there.' });

    const msg: ChatMessage = { id: randomUUID(), room, from, text, at: new Date().toISOString() };
    messages.push(msg);
    if (messages.length > KEEP) messages = messages.slice(-KEEP);
    persist();

    for (const [stream, name] of streams) if (canSee(room, name)) send(stream, { type: 'message', message: msg });
    res.json({ message: msg });
  });
}
