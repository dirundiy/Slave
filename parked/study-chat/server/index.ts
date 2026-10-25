import express from 'express';
import { saveUpload } from './files.ts';
import { registerChat } from './chat.ts';
import { runTutor, tutorErrorMessage, tutorReady, type TutorEvent, type WireMessage } from './tutor.ts';
import { UserError } from './util.ts';

/* The site's small backend: the study tutor (Claude), file uploads, and people-to-people chat.
   Vite forwards /api/* here in development. Secrets come from .env.local and never reach the browser. */

try {
  process.loadEnvFile('.env.local');
} catch {
  /* no .env.local yet: the tutor reports itself as not set up */
}

const PORT = Number(process.env.API_PORT ?? 8787);
const app = express();
app.use(express.json({ limit: '30mb' }));

app.get('/api/ai/status', (_req, res) => res.json({ ready: tutorReady() }));

app.post('/api/files', async (req, res) => {
  const { name, type, data } = req.body ?? {};
  if (typeof name !== 'string' || typeof data !== 'string') return void res.status(400).json({ error: 'No file was sent.' });
  try {
    res.json({ file: await saveUpload(name, typeof type === 'string' ? type : '', data) });
  } catch (e) {
    res.status(e instanceof UserError ? 400 : 500).json({ error: e instanceof UserError ? e.message : 'Couldn’t save that file.' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  if (!tutorReady()) return void res.status(503).json({ error: 'The tutor isn’t set up yet. Add ANTHROPIC_API_KEY to .env.local and restart.' });
  const history = req.body?.messages as WireMessage[] | undefined;
  if (!Array.isArray(history) || !history.length) return void res.status(400).json({ error: 'Nothing to answer.' });

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const emit = (e: TutorEvent | { type: 'error'; message: string } | { type: 'done' }) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  const abort = new AbortController();
  res.on('close', () => !res.writableEnded && abort.abort());

  try {
    await runTutor(history, emit, abort.signal);
    emit({ type: 'done' });
  } catch (e) {
    if (!abort.signal.aborted) emit({ type: 'error', message: tutorErrorMessage(e) });
  }
  res.end();
});

registerChat(app);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`study server on http://127.0.0.1:${PORT}  (tutor ${tutorReady() ? 'ready' : 'needs ANTHROPIC_API_KEY in .env.local'})`);
});
