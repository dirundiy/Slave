import { useApp } from '../state/AppContext';
import { dayKey } from '../lib/util';
import { Pomodoro } from '../components/Pomodoro';
import { TaskList } from '../components/Tasks';
import { CDArt, NowPlaying } from '../components/CDPlayer';

// One record, one timer, one list. Everything else lives on its own page.
export function Home() {
  const { go, tasks } = useApp();
  const left = tasks.filter(t => t.day === dayKey() && !t.done).length;
  return (
    <>
      <section className="hero" aria-label="now playing">
        <div className="hero-art"><CDArt size="lg" bare /></div>
        <NowPlaying size="xl" />
      </section>

      <section className="below">
        <div>
          <h3 className="quiet-h">focus</h3>
          <Pomodoro size="sm" />
        </div>
        <div>
          <h3 className="quiet-h">
            today <span className="soft">{left ? `${left} left` : 'all done'}</span>
          </h3>
          <TaskList day={dayKey()} idPrefix="home" />
          <p className="soft mt-8">
            Stuck on something? <button className="tlink" onClick={() => go('ai')}>Ask the tutor</button>
          </p>
        </div>
      </section>
    </>
  );
}
