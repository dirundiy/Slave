export const EASE = [0.22, 0.61, 0.36, 1] as const;

export const uid = () => Math.random().toString(36).slice(2, 10);
export const pad = (n: number) => String(n).padStart(2, '0');
export const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
export const mss = (s: number) => {
  const x = Math.max(0, Math.floor(s));
  return `${Math.floor(x / 60)}:${pad(x % 60)}`;
};

export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** Monday of the week containing `from` (default today), at midnight. */
export const weekStart = (from: Date = new Date()) => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  return addDays(d, -((d.getDay() + 6) % 7));
};
export const DOW = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const monthShort = (d: Date) => d.toLocaleString('en', { month: 'short' }).toLowerCase();

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);
export const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} mb` : `${Math.max(1, Math.round(n / 1000))} kb`);
