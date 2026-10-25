import Anthropic from '@anthropic-ai/sdk';
import { loadFile } from './files.ts';

/* The study tutor: Claude with the student's files attached.
   Practice quizzes and flashcards come back as tool calls so the site can render them
   as interactive cards; everything else streams back as text. */

const MODEL = 'claude-opus-5-5';
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const tutorReady = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

/** One message as the site stores it. Quizzes and flashcards are summarized, not replayed. */
export interface WireMessage {
  role: 'user' | 'ai';
  text: string;
  fileIds?: string[];
  quizTitle?: string;
  cardsTitle?: string;
}

export type TutorEvent =
  | { type: 'text'; delta: string }
  | { type: 'quiz'; quiz: Quiz }
  | { type: 'flashcards'; deck: Deck }
  | { type: 'notice'; message: string };

export interface Quiz { title: string; questions: { question: string; options: string[]; answer_index: number; explanation: string }[] }
export interface Deck { title: string; cards: { front: string; back: string }[] }

const SYSTEM = `You are a patient, friendly study tutor on "slave", a student's personal study site.

Help the student understand their material: explain clearly, check understanding, and teach the reasoning rather than only handing over answers. When they attach files (worksheets, notes, readings, slides), base your help on those files and refer to specific parts of them.

Keep replies short and easy to scan: a few sentences or a short list. Use simple markdown only: **bold**, bullet lists, numbered lists, and short headings.

When the student asks for a practice quiz, practice test, or questions to check themselves, call the show_quiz tool instead of writing the quiz as text. When they ask for flashcards, call show_flashcards. Draw the content from their files when they have attached any. Before the tool call, write at most one short sentence.`;

const quizTool = {
  name: 'show_quiz',
  description:
    'Show the student an interactive multiple-choice practice quiz. Use for any request for a quiz, practice test, or practice questions. Usually 5 to 10 questions with 4 options each.',
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['title', 'questions'],
    properties: {
      title: { type: 'string', description: 'Short title, e.g. "Photosynthesis, chapter 8"' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'options', 'answer_index', 'explanation'],
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' }, description: 'Answer choices, usually 4' },
            answer_index: { type: 'integer', description: 'Zero-based index of the correct option' },
            explanation: { type: 'string', description: 'One or two sentences on why the answer is right' }
          }
        }
      }
    }
  }
};

const flashcardTool = {
  name: 'show_flashcards',
  description: 'Show the student a deck of flip cards. Use when they ask for flashcards. Usually 6 to 15 cards.',
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['title', 'cards'],
    properties: {
      title: { type: 'string' },
      cards: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['front', 'back'],
          properties: {
            front: { type: 'string', description: 'Term or question' },
            back: { type: 'string', description: 'Definition or answer, short' }
          }
        }
      }
    }
  }
};

// The tolerant streaming parser can hand back a truncated input, so check shape before rendering.
function asQuiz(input: unknown): Quiz | null {
  const q = input as Quiz;
  if (!q || typeof q.title !== 'string' || !Array.isArray(q.questions) || !q.questions.length) return null;
  const ok = q.questions.every(
    x => typeof x.question === 'string' && Array.isArray(x.options) && x.options.length >= 2 &&
      x.options.every(o => typeof o === 'string') && Number.isInteger(x.answer_index) &&
      x.answer_index >= 0 && x.answer_index < x.options.length && typeof x.explanation === 'string'
  );
  return ok ? q : null;
}
function asDeck(input: unknown): Deck | null {
  const d = input as Deck;
  if (!d || typeof d.title !== 'string' || !Array.isArray(d.cards) || !d.cards.length) return null;
  return d.cards.every(c => typeof c.front === 'string' && typeof c.back === 'string') ? d : null;
}

async function toApiMessages(history: WireMessage[]): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    if (m.role === 'ai') {
      let text = m.text.trim();
      if (m.quizTitle) text += `\n\n[Showed the student an interactive practice quiz: "${m.quizTitle}".]`;
      if (m.cardsTitle) text += `\n\n[Showed the student a flashcard deck: "${m.cardsTitle}".]`;
      if (text.trim()) out.push({ role: 'assistant', content: text.trim() });
      continue;
    }
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const id of m.fileIds ?? []) {
      const loaded = await loadFile(id);
      if (!loaded) {
        content.push({ type: 'text', text: '(An attached file is no longer available.)' });
        continue;
      }
      const { file, data } = loaded;
      if (file.kind === 'image') {
        content.push({ type: 'image', source: { type: 'base64', media_type: file.mediaType as 'image/png', data: data.toString('base64') } });
        content.push({ type: 'text', text: `(Image above: ${file.name})` });
      } else if (file.kind === 'pdf') {
        content.push({ type: 'document', title: file.name, source: { type: 'base64', media_type: 'application/pdf', data: data.toString('base64') } });
      } else {
        content.push({ type: 'document', title: file.name, source: { type: 'text', media_type: 'text/plain', data: data.toString('utf8') } });
      }
    }
    content.push({ type: 'text', text: m.text.trim() || 'Please look at the attached file.' });
    out.push({ role: 'user', content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export async function runTutor(history: WireMessage[], emit: (e: TutorEvent) => void, signal: AbortSignal) {
  const messages = await toApiMessages(history);
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new Error('Nothing to answer.');

  const stream = getClient().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // a declined request is re-run on Anthropic's recommended fallback model
      output_config: { effort: 'medium' },
      cache_control: { type: 'ephemeral' }, // attached files are resent each turn; cache them
      system: SYSTEM,
      tools: [quizTool, flashcardTool],
      messages
    },
    { signal }
  );
  stream.on('text', delta => emit({ type: 'text', delta }));
  const final = await stream.finalMessage();

  if (final.stop_reason === 'refusal') {
    emit({ type: 'notice', message: 'The tutor can’t help with that one. Try asking it a different way.' });
    return;
  }
  for (const block of final.content) {
    if (block.type !== 'tool_use') continue;
    const truncated = final.stop_reason === 'max_tokens';
    if (block.name === 'show_quiz') {
      const quiz = truncated ? null : asQuiz(block.input);
      emit(quiz ? { type: 'quiz', quiz } : { type: 'notice', message: 'The quiz came out incomplete. Ask again, maybe for fewer questions.' });
    } else if (block.name === 'show_flashcards') {
      const deck = truncated ? null : asDeck(block.input);
      emit(deck ? { type: 'flashcards', deck } : { type: 'notice', message: 'The flashcards came out incomplete. Ask again, maybe for fewer cards.' });
    }
  }
}

export function tutorErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'The API key was rejected. Check ANTHROPIC_API_KEY in .env.local, then restart.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key isn’t allowed to use that model.';
  if (e instanceof Anthropic.RateLimitError) return 'Too many requests right now. Wait a moment and try again.';
  if (e instanceof Anthropic.BadRequestError) return `Claude couldn’t take that request: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Couldn’t reach Claude. Check your internet connection.';
  if (e instanceof Anthropic.APIError) return `Claude had a problem (${e.status}). Try again in a moment.`;
  return e instanceof Error ? e.message : 'Something went wrong.';
}
