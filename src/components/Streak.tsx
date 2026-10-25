import { useApp, useStats } from '../state/AppContext';
import { fmtMin } from '../lib/util';

export function StreakLine() {
  const { settings } = useApp();
  const s = useStats();
  return (
    <p className="streak-line">
      <span className="n">{s.streak}</span> day streak
      <span className="sep" />
      {fmtMin(s.today)} of {fmtMin(settings.goal)} today
    </p>
  );
}

export function Week() {
  const { settings } = useApp();
  const s = useStats();
  const max = Math.max(settings.goal, ...s.week.map(w => w.min));
  return (
    <div>
      <div className="week">
        {s.week.map(w => (
          <div key={w.k} className={`wk${w.today ? ' today' : ''}`} title={`${w.label} ${w.date}: ${fmtMin(w.min)}`}>
            <div className="wk-bar"><div style={{ height: `${(w.min / max) * 100}%` }} /></div>
            <span>{w.label.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
