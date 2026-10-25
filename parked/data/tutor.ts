import type { Flashcard, Message, QuizQuestion } from '../types';
import { uid } from '../lib/util';

// Pre-written replies until the server-side tutor exists. Every reply is flagged demo.

export const ACTIONS = [
  { id: 'flashcards', label: 'flashcards', prompt: 'make flashcards from this' },
  { id: 'quiz', label: 'practice test', prompt: 'give me a short practice test' },
  { id: 'explain', label: 'explain', prompt: 'explain this simply' },
  { id: 'summary', label: 'summarize', prompt: 'summarize the key points' }
] as const;
export type ActionId = (typeof ACTIONS)[number]['id'];

const CARDS: Flashcard[] = [
  { q: 'Where do the light-dependent reactions happen?', a: 'In the thylakoid membranes of the chloroplast.' },
  { q: 'What does the Calvin cycle produce?', a: 'G3P, a 3-carbon sugar, built from CO₂ using ATP and NADPH.' },
  { q: 'Which molecule is split to release oxygen?', a: 'Water (H₂O), at photosystem II.' },
  { q: 'Which enzyme fixes CO₂ in the Calvin cycle?', a: 'Rubisco.' },
  { q: 'What carries energy from the light reactions to the Calvin cycle?', a: 'ATP and NADPH.' }
];

const QUIZ: QuizQuestion[] = [
  { q: 'Where in the chloroplast does the Calvin cycle take place?', opts: ['thylakoid membrane', 'stroma', 'outer membrane', 'thylakoid lumen'], a: 1, why: 'The Calvin cycle runs in the stroma, the fluid around the thylakoids.' },
  { q: 'Which molecule is split to release O₂?', opts: ['CO₂', 'glucose', 'H₂O', 'NADPH'], a: 2, why: 'Water is split at photosystem II, and its oxygen leaves as O₂.' },
  { q: 'Which two products of the light reactions power the Calvin cycle?', opts: ['ATP and NADPH', 'O₂ and glucose', 'CO₂ and H₂O', 'ADP and NADP⁺'], a: 0, why: 'ATP supplies the energy and NADPH supplies the electrons.' }
];

export function demoReply(text: string, action: ActionId | undefined, fileNames: string[]): Message {
  const t = text.toLowerCase();
  const kind: ActionId | null =
    action ?? (/flash ?cards?/.test(t) ? 'flashcards' : /quiz|test|practice/.test(t) ? 'quiz' : /summar/.test(t) ? 'summary' : /explain/.test(t) ? 'explain' : null);
  const base = { id: uid(), role: 'ai' as const, demo: true };

  switch (kind) {
    case 'flashcards':
      return { ...base, kind: 'flashcards', text: 'Five cards on photosynthesis. Tap a card to flip it.', cards: CARDS };
    case 'quiz':
      return { ...base, kind: 'quiz', text: 'Three questions. Pick an answer to check it.', questions: QUIZ };
    case 'summary':
      return { ...base, kind: 'text', text: 'Photosynthesis in four lines:\n\n- Light splits water in the thylakoids and releases O₂.\n- That energy is stored as ATP and NADPH.\n- In the stroma, the Calvin cycle uses them to fix CO₂ with rubisco.\n- The output is G3P, which the plant builds into glucose.' };
    case 'explain':
      return { ...base, kind: 'text', text: 'Picture a solar-powered bakery.\n\nThe **light reactions** are the solar panels: they take in light and water, give off oxygen, and charge the batteries (ATP and NADPH).\n\nThe **Calvin cycle** is the kitchen: it uses those batteries to turn CO₂ into sugar.' };
    default: {
      const what = fileNames.length ? fileNames.map(n => `“${n}”`).join(', ') : 'your question';
      return { ...base, kind: 'text', text: `I'm in demo mode, so I can't read ${what} or answer it properly yet.\n\nOnce the tutor is connected on the server, I'll answer from your own files. For now, the quick actions show what flashcards and practice tests will look like.` };
    }
  }
}
