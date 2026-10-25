import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** An error whose message is safe and useful to show the person using the site. */
export class UserError extends Error {}
