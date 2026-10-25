import { dayKey } from '../lib/util';
import { Label, PageTitle } from '../components/Label';
import { Pomodoro, TimerSettingsPanel } from '../components/Pomodoro';
import { TaskList } from '../components/Tasks';
import { StreakLine, Week } from '../components/Streak';

export function FocusPage() {
  return (
    <>
      <PageTitle>focus</PageTitle>
      <div className="two-col">
        <section>
          <Pomodoro size="lg" />
          <div className="col-block">
            <Label>timer settings</Label>
            <TimerSettingsPanel />
          </div>
        </section>
        <section className="flex flex-col gap-14">
          <div>
            <Label>today</Label>
            <TaskList day={dayKey()} idPrefix="focus" />
          </div>
          <div>
            <Label>this week</Label>
            <StreakLine />
            <div className="mt-6"><Week /></div>
          </div>
        </section>
      </div>
    </>
  );
}
