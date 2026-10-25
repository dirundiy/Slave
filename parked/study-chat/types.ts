export interface Task { id: string; text: string; done: boolean; day: string }
export interface Session { id: string; at: string; day: string; minutes: number; sample?: boolean }

export interface TimerSettings { focus: number; short: number; long: number; every: number; chime: boolean; goal: number }
export type TimerMode = 'focus' | 'short' | 'long';

/* study tutor */
export interface TutorFile { id: string; name: string; kind: 'image' | 'pdf' | 'text'; size: number }
export interface Quiz { title: string; questions: { question: string; options: string[]; answer_index: number; explanation: string }[] }
export interface Deck { title: string; cards: { front: string; back: string }[] }
export interface TutorMsg {
  id: string;
  role: 'user' | 'ai';
  text: string;
  files?: TutorFile[];
  quiz?: Quiz;
  deck?: Deck;
  notice?: string;
  error?: string;
  pending?: boolean;
}
export interface TutorChat { id: string; title: string; updated: number; messages: TutorMsg[] }

/* people chat */
export interface ChatMessage { id: string; room: string; from: string; text: string; at: string }
