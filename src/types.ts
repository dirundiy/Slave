export interface Task { id: string; text: string; done: boolean; day: string }
export interface Session { id: string; at: string; day: string; minutes: number; sample?: boolean }

export interface TimerSettings { focus: number; short: number; long: number; every: number; chime: boolean; goal: number }
export type TimerMode = 'focus' | 'short' | 'long';
