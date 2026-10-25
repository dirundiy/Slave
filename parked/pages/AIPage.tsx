import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { Label, PageTitle } from '../components/Label';
import { Chat } from '../components/Chat';

export function AIPage() {
  const app = useApp();
  const [armed, setArmed] = useState<string | null>(null);
  const sorted = [...app.chats].sort((a, b) => b.updated - a.updated);
  return (
    <>
      <PageTitle>study</PageTitle>
      <div className="ai-grid">
        <aside>
          <Label action={<button className="link" onClick={app.newChat}>new</button>}>conversations</Label>
          {sorted.map(c => (
            <div key={c.id} className={`convo${c.id === app.chatId ? ' on' : ''}`}>
              <button className="ct" onClick={() => app.setChatId(c.id)}>{c.title}</button>
              {armed === c.id ? (
                <button className="link" onClick={() => { app.deleteChat(c.id); setArmed(null); }}>delete?</button>
              ) : (
                <button className="tdel" onClick={() => setArmed(c.id)} aria-label={`delete ${c.title}`}>×</button>
              )}
            </div>
          ))}
        </aside>
        <section>
          <Label action={<span className="faint">demo replies until the tutor is connected</span>}>
            {app.chats.find(c => c.id === app.chatId)?.title ?? 'conversation'}
          </Label>
          <Chat size="lg" />
        </section>
      </div>
    </>
  );
}
