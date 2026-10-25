import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import mammoth from 'mammoth';
import { DATA_DIR, UserError } from './util.ts';

/* Uploaded study files live on disk so a conversation can keep referring to them.
   Word documents are converted to plain text here; PDFs and images go to Claude as-is. */

const UPLOADS = path.join(DATA_DIR, 'uploads');
await mkdir(UPLOADS, { recursive: true });

export type FileKind = 'image' | 'pdf' | 'text';
export interface StoredFile { id: string; name: string; kind: FileKind; mediaType: string; size: number }

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const TEXT_EXTS = new Set(['.txt', '.md', '.markdown', '.csv', '.json', '.html', '.tex']);
const MAX_FILE = 20 * 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024; // the API's per-image limit

export async function saveUpload(name: string, type: string, base64: string): Promise<StoredFile> {
  const buf = Buffer.from(base64, 'base64');
  const ext = path.extname(name).toLowerCase();
  if (buf.length > MAX_FILE) throw new UserError('That file is over 20 MB. Try a smaller one or split it up.');

  let kind: FileKind;
  let mediaType: string;
  let body: Buffer | string;

  if (IMAGE_TYPES.has(type)) {
    if (buf.length > MAX_IMAGE) throw new UserError('Images need to be under 5 MB. Try a smaller photo or a screenshot.');
    kind = 'image';
    mediaType = type;
    body = buf;
  } else if (type === 'application/pdf' || ext === '.pdf') {
    kind = 'pdf';
    mediaType = 'application/pdf';
    body = buf;
  } else if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    if (!value.trim()) throw new UserError('That Word document looks empty.');
    kind = 'text';
    mediaType = 'text/plain';
    body = value;
  } else if (ext === '.doc') {
    throw new UserError('Old .doc files can’t be read. Save it as .docx or PDF and upload that.');
  } else if (type.startsWith('text/') || TEXT_EXTS.has(ext)) {
    kind = 'text';
    mediaType = 'text/plain';
    body = buf.toString('utf8');
  } else {
    throw new UserError(`Can’t read ${ext || type || 'that kind of'} files. Upload a PDF, Word document, image, or text file.`);
  }

  const file: StoredFile = { id: randomUUID(), name: name.slice(0, 200), kind, mediaType, size: buf.length };
  await writeFile(path.join(UPLOADS, file.id), body);
  await writeFile(path.join(UPLOADS, `${file.id}.json`), JSON.stringify(file));
  return file;
}

const UUID = /^[0-9a-f-]{36}$/;

export async function loadFile(id: string): Promise<{ file: StoredFile; data: Buffer } | null> {
  if (!UUID.test(id)) return null;
  try {
    const file = JSON.parse(await readFile(path.join(UPLOADS, `${id}.json`), 'utf8')) as StoredFile;
    const data = await readFile(path.join(UPLOADS, id));
    return { file, data };
  } catch {
    return null;
  }
}
