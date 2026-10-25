import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './state/AppContext';
import { EASE } from './lib/util';
import { Footer, Header } from './components/Header';
import { Home } from './pages/Home';
import { PlannerPage } from './pages/PlannerPage';
import { StudyPage } from './pages/StudyPage';
import { ChatPage } from './pages/ChatPage';

const VIEWS = { home: Home, planner: PlannerPage, study: StudyPage, chat: ChatPage };

export default function App() {
  const { page, grain } = useApp();
  const View = VIEWS[page];
  return (
    <>
      <Header />
      <div className="wrap">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={page}
            className="page"
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <View />
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
      {grain && <div className="grain" aria-hidden="true" />}
    </>
  );
}
