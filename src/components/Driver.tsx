import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../state/AppContext';
import piastri from '../assets/piastri.png';

/* Oscar Piastri, cut out of the user's own picture (transparent background).
   Bobs gently, sways while the timer runs, jumps with a P1 bubble at the checkered flag. */
export function Driver() {
  const { timer, finishFlag } = useApp();
  const mood = finishFlag ? 'win' : timer.running ? 'run' : 'idle';

  return (
    <div className="driver" role="img" aria-label="Oscar Piastri">
      <motion.img
        src={piastri}
        alt=""
        draggable={false}
        animate={
          mood === 'win' ? { y: [0, -16, 0], rotate: 0 } : mood === 'run' ? { y: [0, -3, 0], rotate: [-1, 1, -1] } : { y: [0, -3, 0], rotate: 0 }
        }
        transition={{ duration: mood === 'win' ? 0.6 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <AnimatePresence>
        {mood === 'win' && (
          <motion.span className="p1" initial={{ opacity: 0, scale: 0.5, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
            P1
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
