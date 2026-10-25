let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

// Three soft sine notes, like a music box.
export function chime() {
  unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [659.25, 880, 1318.5].forEach((freq, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    const t0 = now + i * 0.22;
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    o.connect(g);
    g.connect(ctx!.destination);
    o.start(t0);
    o.stop(t0 + 1.9);
  });
}
