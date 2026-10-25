import { useState } from 'react';
import type { Deck, Quiz } from '../types';

/* The tutor's interactive pieces: a multiple-choice quiz and a deck of flip cards. */

export function QuizCard({ quiz }: { quiz: Quiz }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answered = Object.keys(picked).length;
  const score = quiz.questions.filter((q, i) => picked[i] === q.answer_index).length;
  return (
    <div className="quiz">
      <div className="quiz-head">
        <span className="quiz-title">{quiz.title}</span>
        <span className="faint">{answered === quiz.questions.length ? `${score} of ${quiz.questions.length} right` : `${quiz.questions.length} questions`}</span>
      </div>
      {quiz.questions.map((q, i) => {
        const done = picked[i] !== undefined;
        return (
          <div key={i} className="q">
            <p className="q-text">{i + 1}. {q.question}</p>
            {q.options.map((o, j) => {
              const cls = done ? (j === q.answer_index ? ' right' : j === picked[i] ? ' wrong' : ' dim') : '';
              return (
                <button key={j} className={`opt${cls}`} disabled={done} onClick={() => setPicked(p => ({ ...p, [i]: j }))}>
                  <b>{'abcdef'[j]}</b>{o}
                </button>
              );
            })}
            {done && <p className="why">{q.explanation}</p>}
          </div>
        );
      })}
      {answered > 0 && (
        <button className="tlink small" onClick={() => setPicked({})}>try again</button>
      )}
    </div>
  );
}

export function FlashcardDeck({ deck }: { deck: Deck }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const card = deck.cards[i];
  const move = (d: number) => {
    setFlip(false);
    window.setTimeout(() => setI(x => (x + d + deck.cards.length) % deck.cards.length), flip ? 220 : 0);
  };
  return (
    <div className="deck">
      <div className="quiz-head">
        <span className="quiz-title">{deck.title}</span>
        <span className="faint">{i + 1} of {deck.cards.length}</span>
      </div>
      <button className="fc-card" onClick={() => setFlip(f => !f)} aria-label={flip ? 'show the front' : 'show the back'}>
        <div className={`fc-inner${flip ? ' flipped' : ''}`}>
          <div className="fc-face"><p>{card.front}</p><span className="fc-hint">tap to flip</span></div>
          <div className="fc-face back"><p>{card.back}</p></div>
        </div>
      </button>
      <div className="fc-nav">
        <button className="tlink small" onClick={() => move(-1)}>previous</button>
        <button className="tlink small" onClick={() => move(1)}>next</button>
      </div>
    </div>
  );
}
