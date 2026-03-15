import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlackjackCard from './BlackjackCard';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';

const OUTCOME_STYLE = {
  win:       { label: 'WIN',       bg: '#065F46', color: '#34D399', border: '#10B981', glow: 'rgba(52,211,153,0.35)' },
  lose:      { label: 'LOSE',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444', glow: 'rgba(239,68,68,0.25)'  },
  push:      { label: 'PUSH',      bg: '#1F2937', color: '#9CA3AF', border: '#4B5563', glow: 'none'                   },
  blackjack: { label: 'BLACKJACK', bg: '#78350F', color: '#FDE68A', border: '#F59E0B', glow: 'rgba(251,191,36,0.5)'  },
  bust:      { label: 'BUST',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444', glow: 'rgba(239,68,68,0.25)'  },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export default function BlackjackResults({ results = [], dealerCards = [], dealerValue, onLeave }) {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5 py-6 px-4 max-w-lg mx-auto w-full"
    >
      <motion.h2
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center text-yellow-400 font-black text-2xl"
        style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 24px rgba(255,215,0,0.4)' }}
      >
        RESULTADOS
      </motion.h2>

      {/* Dealer hand */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-gray-700/40 bg-black/40 p-4 text-center"
      >
        <p className="text-gray-500 text-xs font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
          DEALER — {dealerValue > 21 ? `BUST (${dealerValue})` : dealerValue}
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {dealerCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <BlackjackCard card={card} small />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Player results */}
      <div className="space-y-3">
        {results.map((r) => {
          const isMe = r.userId === user?.id;
          const topOutcome = r.hands[0]?.outcome;
          const s = OUTCOME_STYLE[topOutcome] || OUTCOME_STYLE.lose;
          return (
            <motion.div
              key={r.userId}
              variants={itemVariants}
              className="rounded-xl p-4"
              style={{
                background: isMe ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isMe && s.glow !== 'none' ? `0 0 30px ${s.glow}` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AvatarCircle
                    src={r.avatar_url}
                    username={r.username}
                    size={32}
                    style={{ border: '1.5px solid rgba(184,134,11,0.4)' }}
                  />
                  <span className="text-white font-medium text-sm">{r.username}{isMe ? ' (tú)' : ''}</span>
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-yellow-400 font-bold text-sm"
                >
                  {r.pointsAfter?.toLocaleString()} pts
                </motion.span>
              </div>

              {r.hands.map((hand, hi) => {
                const hs = OUTCOME_STYLE[hand.outcome] || OUTCOME_STYLE.lose;
                const netPayout = hand.payout - hand.bet;
                return (
                  <div key={hi} className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1">
                      {hand.cards.map((card, ci) => (
                        <motion.div
                          key={ci}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: ci * 0.06 + 0.1 }}
                        >
                          <BlackjackCard card={card} small />
                        </motion.div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-bold">{hand.value}</span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35, type: 'spring', stiffness: 350, damping: 18 }}
                      style={{
                        fontSize: 11, fontWeight: 'bold', padding: '2px 8px',
                        borderRadius: 4, background: hs.bg, color: hs.color,
                        border: `1px solid ${hs.border}`,
                        boxShadow: hs.glow !== 'none' ? `0 0 10px ${hs.glow}` : 'none',
                      }}
                    >
                      {hs.label}
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      className="text-xs font-bold ml-auto"
                      style={{ color: netPayout >= 0 ? '#34D399' : '#F87171' }}
                    >
                      {netPayout >= 0 ? `+${netPayout}` : netPayout} pts
                    </motion.span>
                  </div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      {/* Countdown + leave */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col items-center gap-3"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={countdown}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="text-gray-400 text-sm"
          >
            {countdown > 0
              ? <>Nueva ronda en <span className="text-yellow-400 font-bold">{countdown}s</span>…</>
              : 'Iniciando nueva ronda…'
            }
          </motion.p>
        </AnimatePresence>
        <motion.button
          onClick={() => { playSound('click'); onLeave(); }}
          whileHover={{ scale: 1.04, boxShadow: '0 0 18px rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-300"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Salir al Lobby
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
