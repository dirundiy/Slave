// Cover art for the fictional sample records, drawn as SVG so no real artwork is used.

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const GRAIN = `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`;

function cover(defs: string, body: string, grain = 0.2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600"><defs>${GRAIN}${defs}</defs>${body}<rect width="600" height="600" filter="url(#g)" opacity="${grain}" style="mix-blend-mode:overlay"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const stars = (() => {
  const r = rng(7);
  let out = '';
  for (let i = 0; i < 70; i++) {
    out += `<circle cx="${(40 + r() * 520).toFixed(1)}" cy="${(40 + r() * 380).toFixed(1)}" r="${(r() * 1.6 + 0.3).toFixed(2)}" fill="#efe6d8" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }
  return out;
})();

export const COVERS = {
  cherry: cover(
    `<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="600"><stop offset="0" stop-color="#22030a"/><stop offset=".55" stop-color="#5c0d19"/><stop offset="1" stop-color="#8a1a2b"/></linearGradient><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e6d6"/><stop offset=".65" stop-color="#e9b6a8"/><stop offset="1" stop-color="#d98a86"/></linearGradient>`,
    `<rect width="600" height="600" fill="url(#bg)"/><circle cx="300" cy="318" r="168" fill="url(#sun)"/>${[0, 1, 2, 3, 4, 5, 6]
      .map(i => `<rect x="110" y="${352 + i * 24}" width="380" height="${(3 + i * 2.6).toFixed(1)}" fill="url(#bg)"/>`)
      .join('')}<text x="46" y="80" font-family="Georgia,serif" font-style="italic" font-size="32" fill="#f3e6d6">june marlowe</text><text x="554" y="558" text-anchor="end" font-family="Georgia,serif" font-size="14" letter-spacing="7" fill="#f3e6d6" opacity=".85">CHERRY STATIC</text>`
  ),
  nocturnes: cover(
    `<radialGradient id="bg" cx=".5" cy=".38" r=".85"><stop offset="0" stop-color="#2b2142"/><stop offset="1" stop-color="#09090f"/></radialGradient><mask id="moon"><circle cx="300" cy="250" r="88" fill="#fff"/><circle cx="338" cy="224" r="82" fill="#000"/></mask><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>`,
    `<rect width="600" height="600" fill="url(#bg)"/>${stars}<circle cx="300" cy="250" r="110" fill="#efe6d8" opacity=".12" filter="url(#b)"/><rect width="600" height="600" fill="#efe6d8" mask="url(#moon)"/><rect x="30" y="30" width="540" height="540" fill="none" stroke="#efe6d8" stroke-opacity=".35"/><text x="300" y="478" text-anchor="middle" font-family="Georgia,serif" font-size="28" letter-spacing="18" fill="#efe6d8">ODETTE</text><text x="300" y="512" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="17" fill="#efe6d8" opacity=".7">nocturnes for nobody</text>`,
    0.24
  ),
  motel: cover(
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#051214"/><stop offset=".7" stop-color="#0f2b2d"/></linearGradient><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    `<rect width="600" height="600" fill="url(#bg)"/><rect y="420" width="600" height="180" fill="#030b0c"/><polygon points="296,420 304,420 420,600 180,600" fill="#0a1819"/>${[0, 1, 2, 3]
      .map(i => `<rect x="${298 - i * 1.2}" y="${430 + i * 42}" width="${4 + i * 2.4}" height="${14 + i * 8}" fill="#e9e0d4" opacity=".55"/>`)
      .join('')}<rect x="296" y="285" width="8" height="135" fill="#0b2021"/><g filter="url(#glow)"><rect x="150" y="172" width="300" height="112" rx="10" fill="none" stroke="#ff6b7a" stroke-width="4"/><text x="300" y="252" text-anchor="middle" font-family="Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif" font-size="62" letter-spacing="4" fill="none" stroke="#ff6b7a" stroke-width="2.5">VACANCY</text></g><text x="168" y="198" font-family="Impact,sans-serif" font-size="18" fill="#3a1a1d">NO</text><text x="44" y="82" font-family="Impact,Haettenschweiler,sans-serif" font-size="42" letter-spacing="3" fill="#e9e0d4">HOLLOW SAINTS</text><text x="556" y="566" text-anchor="end" font-family="Arial,sans-serif" font-size="13" letter-spacing="5" fill="#e9e0d4" opacity=".7">MOTEL LIGHTS</text>`,
    0.22
  ),
  bloomers: cover(
    '',
    `<rect width="600" height="600" fill="#ebe1d0"/><path d="M302 540 C 294 450 312 360 302 250" stroke="#5d6338" stroke-width="4" fill="none"/><ellipse cx="0" cy="0" rx="15" ry="40" fill="#6f7742" transform="translate(282 420) rotate(-38)"/><ellipse cx="0" cy="0" rx="13" ry="34" fill="#6f7742" transform="translate(322 352) rotate(40)"/>${[0, 1, 2, 3, 4, 5]
      .map(i => `<ellipse cx="302" cy="182" rx="24" ry="50" fill="#a33a49" opacity=".86" transform="rotate(${i * 60} 302 232)"/>`)
      .join('')}<circle cx="302" cy="232" r="15" fill="#3d1218"/><rect x="246" y="98" width="120" height="34" fill="#faf6ee" opacity=".72" transform="rotate(-7 306 115)"/><rect x="262" y="500" width="90" height="30" fill="#faf6ee" opacity=".72" transform="rotate(5 307 515)"/><text x="58" y="86" font-family="'Courier New',Courier,monospace" font-size="22" fill="#2a2222">the lindens</text><text x="58" y="114" font-family="'Courier New',Courier,monospace" font-size="16" fill="#2a2222" opacity=".7">late bloomers</text>`,
    0.38
  ),
  softcore: cover(
    `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="58"/></filter>`,
    `<rect width="600" height="600" fill="#cdd5de"/><g filter="url(#bl)"><circle cx="220" cy="240" r="170" fill="#8fa6c0"/><circle cx="410" cy="380" r="165" fill="#edc4cb"/><circle cx="340" cy="170" r="110" fill="#f6f1ea"/><circle cx="170" cy="460" r="120" fill="#b5c2d8"/></g><path d="M470 110 v22 M459 121 h22" stroke="#31384a" stroke-width="1.5"/><text x="40" y="562" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#31384a">mira kō</text><text x="560" y="562" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#31384a" opacity=".6">softcore</text>`,
    0.3
  ),
  fern: cover(
    '',
    `<rect width="600" height="600" fill="#c88a2c"/>${(
      [
        [540, '#e8d6b4'],
        [460, '#b5542a'],
        [380, '#6b2f1c'],
        [300, '#e8d6b4'],
        [220, '#c88a2c'],
        [140, '#8a3a1f']
      ] as const
    )
      .map(([r, c]) => `<circle cx="0" cy="600" r="${r}" fill="${c}"/>`)
      .join('')}<text x="560" y="84" text-anchor="end" font-family="Georgia,serif" font-style="italic" font-size="36" fill="#2c1408">Little Wren</text><text x="560" y="116" text-anchor="end" font-family="Georgia,serif" font-size="16" letter-spacing="9" fill="#2c1408">FERN</text>`,
    0.3
  ),
  exvivo: cover(
    `<filter id="mb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".004 .009" numOctaves="5" seed="11" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 .64  0 0 0 0 .76  0 0 0 0 .86  2.6 0 0 0 -1.05"/></filter>`,
    `<rect width="600" height="600" fill="#0b0d10"/><rect width="600" height="600" filter="url(#mb)"/><rect x="118" y="262" width="364" height="44" fill="#0b0d10"/><g stroke="#dfe6ea" stroke-width="1" opacity=".7"><path d="M40 52 h22 M51 41 v22"/><path d="M538 52 h22 M549 41 v22"/></g><text x="300" y="60" text-anchor="middle" font-family="'Arial Narrow',Arial,sans-serif" font-size="14" letter-spacing="10" fill="#dfe6ea">SAINT VELLUM</text><text x="40" y="566" font-family="'Courier New',monospace" font-size="11" letter-spacing="2" fill="#dfe6ea" opacity=".8">EX VIVO — SV/07 — 2026</text>`,
    0.18
  ),
  blank: cover(
    `<radialGradient id="bg" cx=".3" cy=".25" r="1"><stop offset="0" stop-color="#650D1B"/><stop offset="1" stop-color="#1a0509"/></radialGradient>`,
    `<rect width="600" height="600" fill="url(#bg)"/><text x="300" y="316" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="34" fill="#EAE0D5" opacity=".55">no cover</text>`
  )
};
