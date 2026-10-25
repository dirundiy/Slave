import { motion } from 'framer-motion';
import { PAGES, useApp, type Page } from '../state/AppContext';

const NAV_LABEL: Record<Page, string> = { home: 'timer', planner: 'planner' };

export function Header() {
  const { page, go } = useApp();
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <button className="brand" onClick={() => go('home')} aria-label="slave, home">
          slave
        </button>
        <nav className="nav" aria-label="main">
          {PAGES.map(p => (
            <button key={p} className={`nav-i${page === p ? ' on' : ''}`} onClick={() => go(p)} aria-current={page === p ? 'page' : undefined}>
              {NAV_LABEL[p]}
              {page === p && <motion.span layoutId="navdot" className="nav-dot" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const { grain, setGrain } = useApp();
  return (
    <footer className="foot">
      <span>slave</span>
      <button className="tlink small" onClick={() => setGrain(g => !g)}>grain {grain ? 'on' : 'off'}</button>
    </footer>
  );
}
