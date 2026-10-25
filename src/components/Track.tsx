import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../state/AppContext';

const CREAM = '#EAE0D5';
const PETAL = '#D68A96';
const PAPAYA = '#FF8000';

/* A stylized Circuit de Monaco, driven clockwise from the start/finish line:
   Sainte Dévote, up Beau Rivage to Casino, Mirabeau, the hairpin, Portier,
   the tunnel along the harbour, the chicane, Tabac, the pool, Rascasse, and home. */
const MONACO =
  'M110 128 L168 128 Q182 128 186 118 L196 84 Q200 66 214 58 L232 50 Q246 46 252 58 L258 78 Q262 90 276 88 ' +
  'Q292 86 292 96 Q292 106 278 106 L272 106 Q264 108 268 118 Q272 130 262 140 Q246 156 210 158 L150 160 ' +
  'Q138 160 132 154 Q126 148 116 150 L96 150 Q84 150 78 144 Q72 138 64 146 Q56 154 46 146 Q36 138 36 128 ' +
  'Q36 118 48 120 Q60 122 74 125 L110 128';

// Top-down F1 car pointing along +x, about 16 units long.
function Car() {
  return (
    <g>
      <rect x="-8" y="-4.6" width="3" height="9.2" rx=".6" fill="#1b1b1f" />
      <rect x="6" y="-4.2" width="2.6" height="8.4" rx=".6" fill={PAPAYA} />
      <rect x="-5.6" y="-4.4" width="3" height="2" rx=".5" fill="#111" />
      <rect x="-5.6" y="2.4" width="3" height="2" rx=".5" fill="#111" />
      <rect x="2.2" y="-4" width="2.6" height="1.8" rx=".5" fill="#111" />
      <rect x="2.2" y="2.2" width="2.6" height="1.8" rx=".5" fill="#111" />
      <path d="M-6 -1.8 L4 -1.4 L7.4 -0.6 L7.4 0.6 L4 1.4 L-6 1.8 Z" fill={PAPAYA} />
      <rect x="-3" y="-2.6" width="4" height="5.2" rx="1" fill={PAPAYA} />
      <ellipse cx="0.4" cy="0" rx="1.4" ry="0.9" fill="#1b1b1f" />
    </g>
  );
}

function Flag({ waving }: { waving: boolean }) {
  return (
    <g>
      <line x1="110" y1="134" x2="110" y2="100" stroke={CREAM} strokeOpacity=".7" strokeWidth="1" />
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}
        animate={waving ? { skewY: [0, -10, 6, -8, 0], scaleX: [1, 0.9, 1, 0.92, 1] } : { skewY: 0, scaleX: 1 }}
        transition={waving ? { duration: 0.9, repeat: Infinity } : { duration: 0.3 }}
      >
        <rect x="110" y="100" width="18" height="12" fill={CREAM} />
        {[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => ((r + c) % 2 ? null : <rect key={`${r}${c}`} x={110 + c * 3.6} y={100 + r * 4} width="3.6" height="4" fill="#111" />)))}
      </motion.g>
    </g>
  );
}

export function MonacoTrack() {
  const { timer: tm, finishFlag } = useApp();
  const frac = finishFlag ? 1 : Math.max(0, Math.min(1, tm.frac));
  const path = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [pose, setPose] = useState({ x: 110, y: 128, a: 0 });

  useLayoutEffect(() => {
    const p = path.current;
    if (!p) return;
    const L = p.getTotalLength();
    setLen(L);
    const at = Math.min(L, frac * L);
    const a = p.getPointAtLength(Math.max(0, at - 1));
    const b = p.getPointAtLength(Math.min(L, at + 1));
    const here = p.getPointAtLength(at);
    setPose({ x: here.x, y: here.y, a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI });
  }, [frac]);

  return (
    <svg className="track" viewBox="20 36 290 140" role="img" aria-label={`lap ${Math.round(frac * 100)}% complete`}>
      <path d={MONACO} fill="none" stroke={CREAM} strokeOpacity=".14" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
      <path ref={path} d={MONACO} fill="none" stroke={CREAM} strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 3" />
      {len > 0 && (
        <path d={MONACO} fill="none" stroke={PETAL} strokeWidth="2" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - frac)} style={{ transition: 'stroke-dashoffset .3s linear' }} />
      )}
      <line x1="110" y1="122" x2="110" y2="134" stroke={CREAM} strokeWidth="2" strokeDasharray="2 2" />
      <Flag waving={finishFlag} />
      <g style={{ transform: `translate(${pose.x}px, ${pose.y}px) rotate(${pose.a}deg)`, transition: 'transform .3s linear' }}>
        <Car />
      </g>
      <text x="300" y="170" textAnchor="end" fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic" fontSize="11" fill={CREAM} fillOpacity=".5">
        {finishFlag ? 'checkered flag' : tm.mode === 'focus' ? 'monaco · focus lap' : 'monaco · break lap'}
      </text>
    </svg>
  );
}
