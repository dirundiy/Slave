import { useApp, useStats } from '../state/AppContext';
import { DOW, fmtMin } from '../lib/util';
import { Label, PageTitle } from '../components/Label';
import { Week } from '../components/Streak';
import { SaveBar } from '../components/SaveBar';
import { Calendar } from '../components/Calendar';

export function PlannerPage() {
  const { history } = useApp();
  const s = useStats();
  const recent = [...history].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <>
      <PageTitle>planner</PageTitle>
      <SaveBar />
      <Calendar />

      <div className="two-col mt-20">
        <section>
          <Label>study time</Label>
          <div className="stats">
            <div><span className="big">{fmtMin(s.weekTotal)}</span><span className="hint">this week</span></div>
            <div><span className="big">{s.streak}</span><span className="hint">day streak</span></div>
            <div><span className="big">{fmtMin(s.today)}</span><span className="hint">today</span></div>
          </div>
          <div className="mt-8"><Week /></div>
        </section>
        <section>
          <Label>recent sessions</Label>
          {recent.length === 0 && <p className="hint">Finish a focus session on the timer and it will show up here.</p>}
          {recent.map(h => {
            const at = new Date(h.at);
            return (
              <div key={h.id} className="logrow">
                <span className="a">{DOW[(at.getDay() + 6) % 7]} {at.getDate()} · {at.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}</span>
                <span className="faint">focus</span>
                <span className="m">{h.minutes}m</span>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
