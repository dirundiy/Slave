import { Timer } from '../components/Pomodoro';
import { MonacoTrack } from '../components/Track';

// The timer in the middle. Every session is a lap of Monaco that ends at the flag.
export function Home() {
  return (
    <section className="home" aria-label="timer">
      <div className="timer-stack">
        <MonacoTrack />
        <Timer />
      </div>
    </section>
  );
}
