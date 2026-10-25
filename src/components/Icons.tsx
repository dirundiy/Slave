import type { SVGProps } from 'react';

const line: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
};

export const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8v12.4L18.6 12z" fill="currentColor" /></svg>;
export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5.5" width="3" height="13" fill="currentColor" /><rect x="14" y="5.5" width="3" height="13" fill="currentColor" /></svg>
);
export const NextIcon = () => <svg {...line}><path d="M6.5 6.5l8.5 5.5-8.5 5.5z" fill="currentColor" stroke="none" /><path d="M17.5 6v12" /></svg>;
export const PrevIcon = () => <svg {...line}><path d="M17.5 6.5L9 12l8.5 5.5z" fill="currentColor" stroke="none" /><path d="M6.5 6v12" /></svg>;
export const ShuffleIcon = () => (
  <svg {...line}><path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8C14.3 15 15.5 16 17.5 16H21M18 13l3 3-3 3M3 16h3.5c1.3 0 2.2-.4 3-1.2M13.5 8.2c.8-.8 1.7-1.2 3-1.2H21M18 4l3 3-3 3" /></svg>
);
export const RepeatIcon = () => <svg {...line}><path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3" /></svg>;
export const VolumeIcon = () => <svg {...line}><path d="M4 9.5h3l4.5-3.5v12L7 14.5H4z" /><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
export const SendIcon = () => <svg {...line}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
export const CheckIcon = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 5.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);
